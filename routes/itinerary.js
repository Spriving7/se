const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById } = require('../data/teams');
const { getTeamItinerary, addItem, updateItem, deleteItem } = require('../data/itinerary');

const router = express.Router();
router.use(requireAuth);

function checkMember(teamId, userId) {
  const team = findTeamById(teamId);
  if (!team) return false;
  return team.members.some(m => m.id === userId);
}

// GET /itinerary/:teamId — 获取行程列表
router.get('/:teamId', (req, res) => {
  if (!checkMember(req.params.teamId, req.user.id)) {
    return res.status(403).json({ error: '无权访问' });
  }
  res.json(getTeamItinerary(req.params.teamId));
});

// POST /itinerary — 创建行程项
router.post('/', (req, res) => {
  const { teamId, date, time, title, description, type } = req.body;
  if (!teamId || !date || !title) {
    return res.status(400).json({ error: '请填写必要信息' });
  }
  if (!checkMember(teamId, req.user.id)) {
    return res.status(403).json({ error: '无权操作' });
  }
  const item = addItem(teamId, req.user.id, req.user.nickname, { date, time, title, description, type });
  res.json(item);
});

// PUT /itinerary/:id — 更新行程项
router.put('/:id', (req, res) => {
  const { teamId, date, time, title, description, type } = req.body;
  if (teamId && !checkMember(teamId, req.user.id)) {
    return res.status(403).json({ error: '无权操作' });
  }
  const item = updateItem(req.params.id, req.user.id, { date, time, title, description, type });
  if (!item) return res.status(400).json({ error: '更新失败' });
  res.json(item);
});

// DELETE /itinerary/:id — 删除行程项
router.delete('/:id', (req, res) => {
  const ok = deleteItem(req.params.id, req.user.id);
  if (!ok) return res.status(400).json({ error: '删除失败' });
  res.json({ ok: true });
});

module.exports = router;
