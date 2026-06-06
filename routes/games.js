const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById, getUserTeams } = require('../data/teams');
const {
  getTeamGames, getGameById, createGame, joinGame, leaveGame,
  startGame, submitDescription, submitVote, nextRound, getGameView,
} = require('../data/games');

const router = express.Router();
router.use(requireAuth);

// POST /games — 创建游戏
router.post('/', (req, res) => {
  const { teamId } = req.body;
  if (!teamId) return res.status(400).json({ error: '请选择小分队' });

  const team = findTeamById(teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!team.members.some(m => m.id === req.user.id)) {
    return res.status(403).json({ error: '你不是该小分队的成员' });
  }

  const game = createGame(teamId, req.user.id, req.user.nickname, req.user.avatar);
  res.json(game);
});

// GET /games — 获取我的游戏列表
router.get('/', (req, res) => {
  const teams = getUserTeams(req.user.id);
  const games = [];
  teams.forEach(team => {
    games.push(...getTeamGames(team.id));
  });
  res.json(games);
});

// GET /games/:id — 获取游戏状态
router.get('/:id', (req, res) => {
  const view = getGameView(req.params.id, req.user.id);
  if (!view) return res.status(404).json({ error: '游戏不存在' });
  if (!view.players.some(p => p.id === req.user.id)) {
    return res.status(403).json({ error: '你不在这个游戏中' });
  }
  res.json(view);
});

// POST /games/:id/join — 加入游戏
router.post('/:id/join', (req, res) => {
  const game = joinGame(req.params.id, req.user.id, req.user.nickname, req.user.avatar);
  if (!game) return res.status(400).json({ error: '无法加入游戏' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /games/:id/leave — 离开游戏
router.post('/:id/leave', (req, res) => {
  leaveGame(req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /games/:id/start — 开始游戏
router.post('/:id/start', (req, res) => {
  const game = getGameById(req.params.id);
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  if (game.hostId !== req.user.id) return res.status(403).json({ error: '只有房主可以开始' });

  const started = startGame(req.params.id);
  if (!started) return res.status(400).json({ error: '至少需要3名玩家' });
  res.json(getGameView(started.id, req.user.id));
});

// POST /games/:id/describe — 提交描述
router.post('/:id/describe', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: '请输入描述' });

  const game = submitDescription(req.params.id, req.user.id, text.trim());
  if (!game) return res.status(400).json({ error: '无法提交描述' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /games/:id/vote — 投票
router.post('/:id/vote', (req, res) => {
  const { targetId } = req.body;
  if (!targetId) return res.status(400).json({ error: '请选择投票对象' });

  const game = submitVote(req.params.id, req.user.id, targetId);
  if (!game) return res.status(400).json({ error: '无法投票' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /games/:id/next-round — 下一轮
router.post('/:id/next-round', (req, res) => {
  const game = nextRound(req.params.id);
  if (!game) return res.status(400).json({ error: '无法进入下一轮' });
  res.json(getGameView(game.id, req.user.id));
});

module.exports = router;
