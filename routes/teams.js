const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById, findTeamByCode, getUserTeams, saveTeam, removeTeam } = require('../data/teams');

const router = express.Router();

// 所有 team 路由都需要登录
router.use(requireAuth);

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /teams — 创建小分队
router.post('/', (req, res) => {
  const user = req.user;
  const { name, destination, startDate, endDate, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '请输入小分队名称' });
  }

  const team = {
    id: generateId('team_'),
    name: name.trim(),
    destination: (destination || '').trim(),
    startDate: startDate || '',
    endDate: endDate || '',
    description: (description || '').trim(),
    joinCode: generateJoinCode(),
    creatorId: user.id,
    members: [{
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      joinedAt: Date.now(),
    }],
    createdAt: Date.now(),
  };

  saveTeam(team);
  res.json(team);
});

// GET /teams — 获取我的小分队列表
router.get('/', (req, res) => {
  const teams = getUserTeams(req.user.id);
  res.json(teams);
});

// POST /teams/join — 通过邀请码加入
router.post('/join', (req, res) => {
  const user = req.user;
  const { code } = req.body;

  if (!code || code.trim().length !== 6) {
    return res.status(400).json({ error: '请输入6位邀请码' });
  }

  const team = findTeamByCode(code.trim());
  if (!team) {
    return res.status(404).json({ error: '邀请码无效，请检查后重试' });
  }

  if (team.members.some(m => m.id === user.id)) {
    return res.status(400).json({ error: '你已经在这个小分队中了' });
  }

  team.members.push({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    joinedAt: Date.now(),
  });

  saveTeam(team);
  res.json(team);
});

// GET /teams/:id — 获取小分队详情
router.get('/:id', (req, res) => {
  const team = findTeamById(req.params.id);
  if (!team) {
    return res.status(404).json({ error: '小分队不存在' });
  }

  const user = req.user;
  if (!team.members.some(m => m.id === user.id)) {
    return res.status(403).json({ error: '你不是该小分队的成员' });
  }

  res.json(team);
});

// POST /teams/:id/remove-member — 移除成员（队长操作）
router.post('/:id/remove-member', (req, res) => {
  const user = req.user;
  const team = findTeamById(req.params.id);
  if (!team) {
    return res.status(404).json({ error: '小分队不存在' });
  }

  if (team.creatorId !== user.id) {
    return res.status(403).json({ error: '只有队长可以移除成员' });
  }

  const { memberId } = req.body;
  if (!memberId) {
    return res.status(400).json({ error: '缺少成员 ID' });
  }

  if (memberId === user.id) {
    return res.status(400).json({ error: '不能移除自己' });
  }

  const member = team.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: '成员不存在' });
  }

  team.members = team.members.filter(m => m.id !== memberId);
  saveTeam(team);
  res.json(team);
});

// POST /teams/:id/leave — 退出小分队
router.post('/:id/leave', (req, res) => {
  const user = req.user;
  const team = findTeamById(req.params.id);
  if (!team) {
    return res.status(404).json({ error: '小分队不存在' });
  }

  if (!team.members.some(m => m.id === user.id)) {
    return res.status(400).json({ error: '你不在该小分队中' });
  }

  team.members = team.members.filter(m => m.id !== user.id);
  saveTeam(team);
  res.json({ ok: true });
});

// POST /teams/:id/disband — 解散小分队（队长操作）
router.post('/:id/disband', (req, res) => {
  const user = req.user;
  const team = findTeamById(req.params.id);
  if (!team) {
    return res.status(404).json({ error: '小分队不存在' });
  }

  if (team.creatorId !== user.id) {
    return res.status(403).json({ error: '只有队长可以解散小分队' });
  }

  removeTeam(team.id);
  res.json({ ok: true });
});

module.exports = router;
