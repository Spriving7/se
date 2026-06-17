const config = require('../config');

/**
 * OpenAI 兼容协议调用 LLM（DeepSeek / 智谱 GLM / 任何 OpenAI 兼容服务）。
 * 全项目唯一一处接触 LLM API，便于以后替换模型。
 *
 * DEEPSEEK_BASE_URL 必须是「完整的 chat completions 端点」，例如：
 *   - DeepSeek: https://api.deepseek.com/v1/chat/completions
 *   - 智谱 GLM:  https://open.bigmodel.cn/api/paas/v4/chat/completions
 *
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {boolean} [opts.jsonMode=false]
 * @returns {Promise<string>} choices[0].message.content
 * @throws {Error} 网络/非 2xx/未配置 key 时抛错
 */
async function chat({ system, user, jsonMode = false }) {
  if (!config.DEEPSEEK_API_KEY) {
    throw new Error('AI 服务未配置');
  }

  const body = {
    model: config.DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
    stream: false,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const url = config.DEEPSEEK_BASE_URL.replace(/\/$/, '');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`AI 网络错误: ${err.message || err}`);
  }

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`AI 服务返回 ${res.status}: ${detail.slice(0, 200)}`);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`AI 响应非 JSON: ${err.message || err}`);
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content !== 'string') {
    throw new Error('AI 响应格式异常');
  }
  return content;
}

module.exports = { chat };
