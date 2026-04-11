const express = require('express');
const { upsertUser, createSession, deleteSession, findUserById } = require('../data/users');

const router = express.Router();

// GET /auth/me — 获取当前用户信息（需认证）
const { requireAuth } = require('../middleware/session');
router.get('/me', requireAuth, (req, res) => {
  const { id, nickname, avatar } = req.user;
  res.json({ id, nickname, avatar });
});

// POST /auth/login — 登录
router.post('/login', (req, res) => {
  const { nickname, avatar } = req.body;
  if (!nickname || !avatar) {
    return res.status(400).json({ error: '昵称和头像不能为空' });
  }

  const user = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    nickname,
    avatar,
    loginTime: Date.now(),
  };
  upsertUser(user);

  const token = createSession(user.id);
  res.cookie('session_token', token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  res.json({ id: user.id, nickname: user.nickname, avatar: user.avatar });
});

// POST /auth/logout — 退出登录
router.post('/logout', (req, res) => {
  const token = req.cookies.session_token;
  if (token) {
    deleteSession(token);
  }
  res.clearCookie('session_token');
  res.json({ ok: true });
});

module.exports = router;
