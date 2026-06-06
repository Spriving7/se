const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, 'games.json');

const WORD_PAIRS = [
  ['苹果', '梨'], ['医生', '护士'], ['高铁', '动车'],
  ['薯片', '薯条'], ['牛奶', '豆浆'], ['微信', 'QQ'],
  ['口红', '唇膏'], ['蝴蝶', '飞蛾'], ['篮球', '足球'],
  ['饺子', '馄饨'], ['熊猫', '考拉'], ['包子', '馒头'],
  ['台灯', '手电筒'], ['婚纱', '礼服'], ['钢笔', '铅笔'],
  ['火车', '地铁'], ['眼镜', '墨镜'], ['火锅', '麻辣烫'],
  ['沙发', '椅子'], ['冰箱', '空调'], ['蚊子', '苍蝇'],
  ['蛋糕', '面包'], ['出租车', '公交车'], ['猫', '狗'],
  ['太阳', '月亮'], ['玫瑰', '百合'], ['筷子', '叉子'],
  ['游泳', '跳水'], ['钢琴', '吉他'], ['帽子', '头巾'],
  ['眉毛', '睫毛'], ['橙子', '橘子'], ['大蒜', '洋葱'],
  ['黄瓜', '丝瓜'], ['手机', '平板'], ['筷子', '勺子'],
];

function readGames() {
  try {
    return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeGames(games) {
  const dir = path.dirname(GAMES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
}

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getGameById(id) {
  return readGames().find(g => g.id === id) || null;
}

function getTeamGames(teamId) {
  return readGames().filter(g => g.teamId === teamId && g.phase !== 'ended');
}

function saveGame(game) {
  const games = readGames();
  const idx = games.findIndex(g => g.id === game.id);
  if (idx >= 0) games[idx] = game;
  else games.push(game);
  writeGames(games);
  return game;
}

function getAlivePlayers(game) {
  return game.players.filter(p => p.alive);
}

function getCurrentDescriber(game) {
  const alive = getAlivePlayers(game);
  if (game.currentDescriberIndex >= alive.length) return null;
  return alive[game.currentDescriberIndex];
}

function createGame(teamId, hostId, hostNickname, hostAvatar) {
  const game = {
    id: generateId('game_'),
    teamId,
    type: 'spy',
    hostId,
    players: [{
      id: hostId,
      nickname: hostNickname,
      avatar: hostAvatar,
      alive: true,
    }],
    wordPair: null,
    spyId: null,
    phase: 'lobby',
    currentDescriberIndex: 0,
    descriptions: {},
    votes: {},
    round: 0,
    winner: null,
    eliminatedPlayerId: null,
    createdAt: Date.now(),
  };
  saveGame(game);
  return game;
}

function joinGame(gameId, playerId, nickname, avatar) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'lobby') return null;
  if (game.players.some(p => p.id === playerId)) return game;
  if (game.players.length >= 12) return null;

  game.players.push({ id: playerId, nickname, avatar, alive: true });
  saveGame(game);
  return game;
}

function leaveGame(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;
  game.players = game.players.filter(p => p.id !== playerId);
  if (game.players.length === 0) {
    game.phase = 'ended';
  } else if (game.hostId === playerId) {
    game.hostId = game.players[0].id;
  }
  saveGame(game);
  return game;
}

function startGame(gameId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'lobby') return null;
  if (game.players.length < 3) return null;

  // 随机指定卧底
  const spyIndex = Math.floor(Math.random() * game.players.length);
  game.spyId = game.players[spyIndex].id;

  // 随机选词对
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  game.wordPair = Math.random() > 0.5 ? [...pair] : [pair[1], pair[0]];

  // 打乱描述顺序
  for (let i = game.players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [game.players[i], game.players[j]] = [game.players[j], game.players[i]];
  }

  game.phase = 'describing';
  game.round = 1;
  game.currentDescriberIndex = 0;
  game.descriptions = {};
  game.votes = {};
  game.eliminatedPlayerId = null;

  saveGame(game);
  return game;
}

function submitDescription(gameId, playerId, text) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'describing') return null;

  const current = getCurrentDescriber(game);
  if (!current || current.id !== playerId) return null;

  game.descriptions[playerId] = text;
  game.currentDescriberIndex++;

  if (game.currentDescriberIndex >= getAlivePlayers(game).length) {
    game.phase = 'voting';
    game.votes = {};
  }

  saveGame(game);
  return game;
}

function submitVote(gameId, voterId, targetId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'voting') return null;

  const alive = getAlivePlayers(game);
  if (!alive.some(p => p.id === voterId)) return null;
  if (voterId === targetId) return null;
  if (!alive.some(p => p.id === targetId)) return null;

  game.votes[voterId] = targetId;

  const allVoted = alive.every(p => game.votes[p.id] !== undefined);
  if (allVoted) {
    // 计票
    const voteCount = {};
    alive.forEach(p => { voteCount[p.id] = 0; });
    Object.values(game.votes).forEach(tid => {
      if (voteCount[tid] !== undefined) voteCount[tid]++;
    });

    let maxVotes = 0;
    Object.values(voteCount).forEach(c => { if (c > maxVotes) maxVotes = c; });

    const maxPlayers = Object.entries(voteCount)
      .filter(([_, c]) => c === maxVotes)
      .map(([id]) => id);

    // 平票随机淘汰
    const eliminatedId = maxPlayers[Math.floor(Math.random() * maxPlayers.length)];
    const eliminatedPlayer = game.players.find(p => p.id === eliminatedId);
    if (eliminatedPlayer) eliminatedPlayer.alive = false;
    game.eliminatedPlayerId = eliminatedId;

    // 判断胜负
    const remainingAlive = getAlivePlayers(game);
    const spyAlive = remainingAlive.some(p => p.id === game.spyId);

    if (!spyAlive) {
      game.phase = 'ended';
      game.winner = 'civilian';
    } else if (remainingAlive.length <= 2) {
      game.phase = 'ended';
      game.winner = 'spy';
    } else {
      game.phase = 'result';
    }
  }

  saveGame(game);
  return game;
}

function nextRound(gameId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'result') return null;

  game.phase = 'describing';
  game.round++;
  game.currentDescriberIndex = 0;
  game.descriptions = {};
  game.votes = {};
  game.eliminatedPlayerId = null;

  saveGame(game);
  return game;
}

function getGameView(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;

  const view = JSON.parse(JSON.stringify(game));

  if (game.phase !== 'ended') {
    delete view.spyId;
    delete view.wordPair;

    if (game.wordPair) {
      view.myWord = game.spyId === playerId ? game.wordPair[1] : game.wordPair[0];
    }

    if (game.phase === 'voting') {
      view.votedCount = Object.keys(game.votes).length;
      view.totalVoters = getAlivePlayers(game).length;
      delete view.votes;
    }
  } else {
    view.myWord = game.spyId === playerId ? game.wordPair[1] : game.wordPair[0];
    view.civilianWord = game.wordPair[0];
    view.spyWord = game.wordPair[1];
    view.allVotes = game.votes;
  }

  view.isHost = game.hostId === playerId;
  view.currentDescriber = game.phase === 'describing' ? getCurrentDescriber(game) : null;

  return view;
}

module.exports = {
  getGameById,
  getTeamGames,
  createGame,
  joinGame,
  leaveGame,
  startGame,
  submitDescription,
  submitVote,
  nextRound,
  getGameView,
};
