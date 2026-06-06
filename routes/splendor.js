const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById, getUserTeams } = require('../data/teams');
const {
  getTeamGames, getGameView, createGame, joinGame,
  startGame, takeGems, reserveCard, buyCard, leaveGame, dissolveGame,
} = require('../data/splendor');

const router = express.Router();
router.use(requireAuth);

// POST /splendor — 创建游戏
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

// GET /splendor — 获取列表
router.get('/', (req, res) => {
  const teams = getUserTeams(req.user.id);
  const games = [];
  teams.forEach(team => {
    games.push(...getTeamGames(team.id));
  });
  res.json(games);
});

// GET /splendor/:id — 获取状态
router.get('/:id', (req, res) => {
  const view = getGameView(req.params.id, req.user.id);
  if (!view) return res.status(404).json({ error: '游戏不存在' });
  if (!view.players.some(p => p.id === req.user.id)) {
    return res.status(403).json({ error: '你不在这个游戏中' });
  }
  res.json(view);
});

// POST /splendor/:id/join — 加入
router.post('/:id/join', (req, res) => {
  const game = joinGame(req.params.id, req.user.id, req.user.nickname, req.user.avatar);
  if (!game) return res.status(400).json({ error: '无法加入游戏（最多4人）' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /splendor/:id/start — 开始
router.post('/:id/start', (req, res) => {
  const game = require('../data/splendor').getGameById(req.params.id);
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  if (game.hostId !== req.user.id) return res.status(403).json({ error: '只有房主可以开始' });

  const started = startGame(req.params.id);
  if (!started) return res.status(400).json({ error: '至少需要2名玩家' });
  res.json(getGameView(started.id, req.user.id));
});

// POST /splendor/:id/take-gems — 拿宝石
router.post('/:id/take-gems', (req, res) => {
  const { gems } = req.body;
  if (!gems) return res.status(400).json({ error: '请选择宝石' });

  const game = takeGems(req.params.id, req.user.id, gems);
  if (!game) return res.status(400).json({ error: '无法拿宝石（检查数量和银行余额）' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /splendor/:id/reserve — 预留卡
router.post('/:id/reserve', (req, res) => {
  const { source, cardIndex } = req.body;
  if (!source) return res.status(400).json({ error: '请选择卡牌来源' });

  const game = reserveCard(req.params.id, req.user.id, source, cardIndex);
  if (!game) return res.status(400).json({ error: '无法预留卡牌（最多预留3张）' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /splendor/:id/buy — 购买卡
router.post('/:id/buy', (req, res) => {
  const { source, cardId } = req.body;
  if (!cardId) return res.status(400).json({ error: '请选择卡牌' });

  const game = buyCard(req.params.id, req.user.id, source, cardId);
  if (!game) return res.status(400).json({ error: '无法购买卡牌（宝石不足）' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /splendor/:id/leave — 离开
router.post('/:id/leave', (req, res) => {
  leaveGame(req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /splendor/:id/dissolve — 解散房间
router.post('/:id/dissolve', (req, res) => {
  const game = dissolveGame(req.params.id, req.user.id);
  if (!game) return res.status(400).json({ error: '无法解散（仅房主可操作）' });
  res.json({ ok: true });
});

module.exports = router;
