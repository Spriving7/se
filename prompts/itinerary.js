// type 枚举必须与 public/app.js 的 ITI_TYPE_ICONS 完全一致
const ALLOWED_TYPES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'other'];

const SYSTEM_PROMPT = `你是一名资深的旅游行程规划师，擅长根据目的地、日期、人数和偏好生成结构化的多日行程。

你的输出必须是合法 JSON，且不包含任何解释、Markdown、代码块标记或多余字符。

输出 Schema：
{
  "items": [
    {
      "date": "YYYY-MM-DD",          // 必须落在用户给的日期范围内（含端点）
      "time": "HH:MM",                // 24 小时制，例如 "09:30"；若无具体时间则填 ""
      "title": string,                // 不超过 15 字
      "type": "food" | "transport" | "accommodation" | "activity" | "shopping" | "other",
      "description": string           // 不超过 40 字，可空字符串
    }
  ]
}

硬性约束：
1. type 只能取上述 6 个枚举值之一。
2. 每天建议覆盖上午、下午、晚上三个时段的活动 + 一条 accommodation（住宿）；可加 transport（如往返交通）和若干 food。
3. 时间使用 24 小时制 HH:MM。
4. 所有 date 必须落在用户提供的日期范围内（含起止日）。
5. 参考用户提供的「已有行程」，避免时间冲突，可以做补充而非重复。
6. 尊重用户偏好（人数、忌口、同行儿童、兴趣等）。
7. 不要输出 JSON 以外的任何字符。`;

/**
 * 构造行程生成 prompt。
 * @param {object} p
 * @param {string} p.destination
 * @param {string} p.startDate  YYYY-MM-DD
 * @param {string} p.endDate    YYYY-MM-DD
 * @param {number} p.peopleCount
 * @param {string} [p.preferences]
 * @param {Array}  [p.existingItems]
 */
function buildItineraryPrompt({ destination, startDate, endDate, peopleCount, preferences, existingItems }) {
  const existing = Array.isArray(existingItems) && existingItems.length
    ? JSON.stringify(existingItems.map(i => ({
        date: i.date, time: i.time || '', title: i.title, type: i.type,
      })))
    : '空';

  const user = `目的地：${destination}
日期：${startDate} 至 ${endDate}
人数：${peopleCount}
偏好：${preferences && preferences.trim() ? preferences.trim() : '无特殊要求'}
已有行程（请避免冲突，可补充）：${existing}`;

  return { system: SYSTEM_PROMPT, user };
}

module.exports = { buildItineraryPrompt, ALLOWED_TYPES };
