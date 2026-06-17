const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById } = require('../data/teams');
const { getTeamItinerary, addItem } = require('../data/itinerary');
const { chat } = require('../services/llm');
const { buildItineraryPrompt, ALLOWED_TYPES } = require('../prompts/itinerary');
const config = require('../config');

const router = express.Router();
router.use(requireAuth);

// 日期合法性 YYYY-MM-DD
function isValidDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// 尝试解析 LLM 返回的内容；支持纯 JSON、带 ```json 代码块、首尾多余字符
function parseJsonLoose(raw) {
  if (typeof raw !== 'string') throw new Error('非字符串');
  let txt = raw.trim();
  // 去掉 ```json ... ``` 或 ``` ... ``` 包裹
  const fence = txt.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) txt = fence[1].trim();
  // 截取最外层 { ... }
  const first = txt.indexOf('{');
  const last = txt.lastIndexOf('}');
  if (first >= 0 && last > first) txt = txt.slice(first, last + 1);
  return JSON.parse(txt);
}

// POST /ai/itinerary — AI 生成行程
router.post('/itinerary', async (req, res) => {
  const { teamId, destination, startDate, endDate, peopleCount, preferences } = req.body || {};

  // 1. 参数校验
  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({ error: '缺少 teamId' });
  }
  if (!destination || !String(destination).trim()) {
    return res.status(400).json({ error: '请填写目的地' });
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({ error: '日期不合法' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ error: '开始日期不能晚于结束日期' });
  }
  const people = Number(peopleCount);
  const peopleSafe = Number.isFinite(people) && people > 0 ? Math.floor(people) : 2;

  // 2. 权限校验
  const team = findTeamById(teamId);
  if (!team || !team.members.some(m => m.id === req.user.id)) {
    return res.status(403).json({ error: '无权操作' });
  }

  // 3. 检查 AI 配置
  if (!config.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'AI 服务未配置' });
  }

  // 4. 读已有行程作为上下文
  const existingItems = getTeamItinerary(teamId);

  const prompt = buildItineraryPrompt({
    destination: String(destination).trim(),
    startDate,
    endDate,
    peopleCount: peopleSafe,
    preferences,
    existingItems,
  });

  // 5. 调用 LLM（最多重试 1 次，共 2 次请求）
  let parsed = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const raw = await chat({ ...prompt, jsonMode: true });
      parsed = parseJsonLoose(raw);
    } catch (err) {
      lastErr = err;
      // 只有解析失败才重试；网络/配置错误不重试
      if (!/JSON|非字符串/.test(err.message)) break;
    }
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    return res.status(502).json({
      error: 'AI 返回内容无法解析，请重试',
      detail: lastErr ? lastErr.message : undefined,
    });
  }

  // 6. 过滤/规范 items
  const allowed = new Set(ALLOWED_TYPES);
  const validItems = parsed.items
    .filter(it => it && typeof it === 'object')
    .filter(it => isValidDate(it.date) && it.date >= startDate && it.date <= endDate)
    .filter(it => typeof it.title === 'string' && it.title.trim())
    .filter(it => allowed.has(it.type))
    .map(it => ({
      date: it.date,
      time: typeof it.time === 'string' && /^\d{2}:\d{2}$/.test(it.time) ? it.time : '',
      title: String(it.title).trim().slice(0, 30),
      type: it.type,
      description: typeof it.description === 'string' ? it.description.trim().slice(0, 60) : '',
    }));

  if (validItems.length === 0) {
    return res.status(502).json({ error: 'AI 生成的行程均不合法，请重试' });
  }

  // 7. 写入（批量）
  const created = validItems.map(it =>
    addItem(teamId, req.user.id, req.user.nickname, it)
  );

  res.json({ created: created.length, items: created });
});

module.exports = router;
