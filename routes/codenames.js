const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById, getUserTeams } = require('../data/teams');
const {
  getTeamGames, getGameView, createGame, joinGame, joinTeam, setSpymaster,
  startGame, giveClue, guessCard, endGuessing, leaveGame, dissolveGame,
} = require('../data/codenames');

const router = express.Router();
router.use(requireAuth);

// POST /codenames — 创建游戏
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

// GET /codenames — 获取列表
router.get('/', (req, res) => {
  const teams = getUserTeams(req.user.id);
  const games = [];
  teams.forEach(team => {
    games.push(...getTeamGames(team.id));
  });
  res.json(games);
});

// GET /codenames/:id — 获取状态
router.get('/:id', (req, res) => {
  const view = getGameView(req.params.id, req.user.id);
  if (!view) return res.status(404).json({ error: '游戏不存在' });
  if (!view.allPlayers.some(p => p.id === req.user.id)) {
    return res.status(403).json({ error: '你不在这个游戏中' });
  }
  res.json(view);
});

// POST /codenames/:id/join — 加入游戏
router.post('/:id/join', (req, res) => {
  const { team } = req.body;
  const game = joinGame(req.params.id, req.user.id, req.user.nickname, req.user.avatar);
  if (!game) return res.status(400).json({ error: '无法加入游戏' });

  // If team specified, join that team
  if (team) {
    joinTeam(req.params.id, req.user.id, team);
  }

  res.json(getGameView(req.params.id, req.user.id));
});

// POST /codenames/:id/set-role — 设置角色（队长/队员）
router.post('/:id/set-role', (req, res) => {
  const { team, role } = req.body;
  if (!team || !['red', 'blue'].includes(team)) {
    return res.status(400).json({ error: '请选择队伍' });
  }

  // Ensure player has joined the game
  joinGame(req.params.id, req.user.id, req.user.nickname, req.user.avatar);

  const game = joinTeam(req.params.id, req.user.id, team);
  if (!game) return res.status(400).json({ error: '无法加入队伍' });

  if (role === 'spymaster') {
    const result = setSpymaster(req.params.id, req.user.id, team);
    if (!result) return res.status(400).json({ error: '无法成为队长' });
  }

  res.json(getGameView(req.params.id, req.user.id));
});

// POST /codenames/:id/start — 开始
router.post('/:id/start', (req, res) => {
  const game = require('../data/codenames').getGameById(req.params.id);
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  if (game.hostId !== req.user.id) return res.status(403).json({ error: '只有房主可以开始' });

  const started = startGame(req.params.id);
  if (!started) return res.status(400).json({ error: '两队各需要至少1名队长和1名队员' });
  res.json(getGameView(started.id, req.user.id));
});

// POST /codenames/:id/clue — 给线索
router.post('/:id/clue', (req, res) => {
  const { word, count } = req.body;
  if (!word) return res.status(400).json({ error: '请输入线索词' });

  const game = giveClue(req.params.id, req.user.id, word, count);
  if (!game) return res.status(400).json({ error: '无法给线索' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /codenames/:id/guess — 猜词
router.post('/:id/guess', (req, res) => {
  const { cardIndex } = req.body;
  if (cardIndex === undefined || cardIndex === null) return res.status(400).json({ error: '请选择卡片' });

  const game = guessCard(req.params.id, req.user.id, cardIndex);
  if (!game) return res.status(400).json({ error: '无法猜词' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /codenames/:id/end-turn — 结束猜测
router.post('/:id/end-turn', (req, res) => {
  const game = endGuessing(req.params.id, req.user.id);
  if (!game) return res.status(400).json({ error: '无法结束回合' });
  res.json(getGameView(game.id, req.user.id));
});

// POST /codenames/:id/leave — 离开
router.post('/:id/leave', (req, res) => {
  leaveGame(req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /codenames/:id/dissolve — 解散房间
router.post('/:id/dissolve', (req, res) => {
  const game = dissolveGame(req.params.id, req.user.id);
  if (!game) return res.status(400).json({ error: '无法解散（仅房主可操作）' });
  res.json({ ok: true });
});

module.exports = router;
