const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, 'codenames.json');

const WORD_POOL = [
  '苹果','香蕉','西瓜','草莓','芒果','葡萄','樱桃','柠檬','橙子','菠萝',
  '老虎','狮子','大象','熊猫','兔子','海豚','企鹅','鹦鹉','蝴蝶','鲨鱼',
  '医生','老师','厨师','警察','消防员','飞行员','画家','歌手','律师','护士',
  '北京','上海','东京','巴黎','伦敦','纽约','悉尼','罗马','首尔','曼谷',
  '足球','篮球','游泳','滑雪','网球','拳击','击剑','跑步','射箭','冲浪',
  '月亮','太阳','星星','彩虹','闪电','雪花','火山','瀑布','沙漠','森林',
  '钢琴','吉他','小提琴','鼓','萨克斯','二胡','古筝','琵琶','喇叭','口琴',
  '火车','飞机','轮船','自行车','摩托车','潜水艇','直升机','火箭','马车','热气球',
  '玫瑰','百合','向日葵','荷花','菊花','樱花','梅花','郁金香','薰衣草','兰花',
  '钻石','黄金','翡翠','珍珠','红宝石','蓝宝石','琥珀','水晶','白银','玛瑙',
  '长城','金字塔','自由女神','埃菲尔铁塔','比萨斜塔','泰姬陵','悉尼歌剧院','大本钟','富士山','兵马俑',
  '饺子','火锅','寿司','披萨','汉堡','面条','炒饭','包子','烤鸭','拉面',
  '书','电影','音乐','舞蹈','绘画','雕塑','摄影','魔术','相声','话剧',
  '春天','夏天','秋天','冬天','黎明','黄昏','中午','午夜','暴雨','微风',
  '手机','电脑','电视','冰箱','空调','洗衣机','微波炉','相机','耳机','手表',
  '足球场','图书馆','博物馆','游乐场','动物园','植物园','水族馆','体育馆','教堂','城堡',
  '闪电侠','蜘蛛侠','蝙蝠侠','钢铁侠','超人','悟空','哪吒','葫芦娃','黑猫警长','喜羊羊',
  '咖啡','茶','牛奶','可乐','果汁','啤酒','红酒','奶茶','豆浆','椰汁',
  '围巾','手套','帽子','眼镜','领带','腰带','背包','袜子','靴子','项链',
  '麻将','象棋','围棋','扑克','积木','魔方','骰子','拼图','飞镖','桌游',
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

function generateId() {
  return 'cn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateGrid() {
  const words = shuffle(WORD_POOL).slice(0, 25);
  // 9 for first team (who goes first), 8 for second, 7 neutral, 1 assassin
  const firstTeam = Math.random() > 0.5 ? 'red' : 'blue';
  const secondTeam = firstTeam === 'red' ? 'blue' : 'red';

  const colors = [
    ...Array(9).fill(firstTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral'),
    'assassin',
  ];
  const shuffledColors = shuffle(colors);

  return words.map((word, i) => ({
    word,
    color: shuffledColors[i],
    revealed: false,
  }));
}

function createGame(teamId, hostId, hostNickname, hostAvatar) {
  const game = {
    id: generateId(),
    teamId,
    type: 'codenames',
    hostId,
    redTeam: { spymaster: null, operatives: [] },
    blueTeam: { spymaster: null, operatives: [] },
    allPlayers: [{
      id: hostId, nickname: hostNickname, avatar: hostAvatar, team: null, role: null,
    }],
    grid: [],
    phase: 'setup',
    currentTurn: null,
    clue: null,
    remainingGuesses: 0,
    scores: { red: 0, blue: 0 },
    winner: null,
    log: [],
    createdAt: Date.now(),
  };
  saveGame(game);
  return game;
}

function joinGame(gameId, playerId, nickname, avatar) {
  const game = getGameById(gameId);
  if (!game || game.phase === 'ended') return null;
  if (game.allPlayers.some(p => p.id === playerId)) return game;
  if (game.allPlayers.length >= 10) return null;

  game.allPlayers.push({ id: playerId, nickname, avatar, team: null, role: null });
  saveGame(game);
  return game;
}

function joinTeam(gameId, playerId, team) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'setup') return null;
  if (!['red', 'blue'].includes(team)) return null;
  const player = game.allPlayers.find(p => p.id === playerId);
  if (!player) return null;

  // Remove from old team
  if (player.team === 'red') {
    game.redTeam.operatives = game.redTeam.operatives.filter(id => id !== playerId);
    if (game.redTeam.spymaster === playerId) game.redTeam.spymaster = null;
  } else if (player.team === 'blue') {
    game.blueTeam.operatives = game.blueTeam.operatives.filter(id => id !== playerId);
    if (game.blueTeam.spymaster === playerId) game.blueTeam.spymaster = null;
  }

  player.team = team;
  game[team + 'Team'].operatives.push(playerId);
  saveGame(game);
  return game;
}

function setSpymaster(gameId, playerId, team) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'setup') return null;
  const player = game.allPlayers.find(p => p.id === playerId);
  if (!player || player.team !== team) return null;

  // Clear old spymaster for that team
  const teamKey = team + 'Team';
  if (game[teamKey].spymaster) {
    const oldSm = game.allPlayers.find(p => p.id === game[teamKey].spymaster);
    if (oldSm) oldSm.role = 'operative';
    // Move old spymaster to operatives
    if (!game[teamKey].operatives.includes(game[teamKey].spymaster)) {
      game[teamKey].operatives.push(game[teamKey].spymaster);
    }
  }

  // Remove from operatives
  game[teamKey].operatives = game[teamKey].operatives.filter(id => id !== playerId);
  game[teamKey].spymaster = playerId;
  player.role = 'spymaster';
  saveGame(game);
  return game;
}

function startGame(gameId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'setup') return null;

  // Validate: both teams need at least spymaster + 1 operative
  if (!game.redTeam.spymaster || game.redTeam.operatives.length === 0) return null;
  if (!game.blueTeam.spymaster || game.blueTeam.operatives.length === 0) return null;

  game.grid = generateGrid();
  // First team: the one with 9 cards
  const redCount = game.grid.filter(c => c.color === 'red').length;
  game.currentTurn = redCount === 9 ? 'red' : 'blue';
  game.phase = 'spymaster-turn';
  game.scores = { red: 0, blue: 0 };
  game.clue = null;
  game.remainingGuesses = 0;
  game.log = [];
  game.winner = null;
  saveGame(game);
  return game;
}

function giveClue(gameId, playerId, word, count) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'spymaster-turn') return null;

  const teamKey = game.currentTurn + 'Team';
  if (game[teamKey].spymaster !== playerId) return null;

  if (!word || !word.trim()) return null;
  count = parseInt(count);
  if (isNaN(count) || count < 0 || count > 9) return null;

  game.clue = { word: word.trim(), count };
  game.remainingGuesses = count + 1; // +1 as per rules
  game.phase = 'operative-turn';
  game.log.push({ team: game.currentTurn, clue: game.clue, guesses: [] });
  saveGame(game);
  return game;
}

function guessCard(gameId, playerId, cardIndex) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'operative-turn') return null;
  if (game.remainingGuesses <= 0) return null;

  const teamKey = game.currentTurn + 'Team';
  if (!game[teamKey].operatives.includes(playerId)) return null;

  if (cardIndex < 0 || cardIndex >= game.grid.length) return null;
  const card = game.grid[cardIndex];
  if (card.revealed) return null;

  card.revealed = true;
  const logEntry = game.log[game.log.length - 1];
  logEntry.guesses.push({ word: card.word, color: card.color });

  if (card.color === 'assassin') {
    // Opposite team wins
    game.winner = game.currentTurn === 'red' ? 'blue' : 'red';
    game.phase = 'ended';
    game.remainingGuesses = 0;
  } else if (card.color === game.currentTurn) {
    game.scores[game.currentTurn]++;
    // Check win: did this team reveal all their cards?
    const totalCards = game.grid.filter(c => c.color === game.currentTurn).length;
    if (game.scores[game.currentTurn] >= totalCards) {
      game.winner = game.currentTurn;
      game.phase = 'ended';
      game.remainingGuesses = 0;
    } else {
      game.remainingGuesses--;
      if (game.remainingGuesses <= 0) {
        switchTurn(game);
      }
    }
  } else {
    // Wrong team's card or neutral
    if (card.color !== 'neutral') {
      game.scores[card.color]++;
      // Check if other team won by this reveal
      const totalCards = game.grid.filter(c => c.color === card.color).length;
      if (game.scores[card.color] >= totalCards) {
        game.winner = card.color;
        game.phase = 'ended';
        game.remainingGuesses = 0;
        saveGame(game);
        return game;
      }
    }
    game.remainingGuesses--;
    if (game.remainingGuesses <= 0) {
      switchTurn(game);
    }
  }

  saveGame(game);
  return game;
}

function endGuessing(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'operative-turn') return null;

  const teamKey = game.currentTurn + 'Team';
  if (!game[teamKey].operatives.includes(playerId)) return null;

  switchTurn(game);
  saveGame(game);
  return game;
}

function switchTurn(game) {
  game.currentTurn = game.currentTurn === 'red' ? 'blue' : 'red';
  game.phase = 'spymaster-turn';
  game.clue = null;
  game.remainingGuesses = 0;
}

function leaveGame(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;
  game.allPlayers = game.allPlayers.filter(p => p.id !== playerId);
  if (game.redTeam.spymaster === playerId) game.redTeam.spymaster = null;
  if (game.blueTeam.spymaster === playerId) game.blueTeam.spymaster = null;
  game.redTeam.operatives = game.redTeam.operatives.filter(id => id !== playerId);
  game.blueTeam.operatives = game.blueTeam.operatives.filter(id => id !== playerId);
  if (game.allPlayers.length === 0) {
    game.phase = 'ended';
  } else if (game.hostId === playerId) {
    game.hostId = game.allPlayers[0].id;
  }
  saveGame(game);
  return game;
}

function getPlayerInfo(game, playerId) {
  const player = game.allPlayers.find(p => p.id === playerId);
  if (!player) return { team: null, isSpymaster: false };
  const isSpymaster = (game.redTeam.spymaster === playerId) || (game.blueTeam.spymaster === playerId);
  return { team: player.team, isSpymaster };
}

function getGameView(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;

  const { team, isSpymaster } = getPlayerInfo(game, playerId);

  const view = {
    id: game.id,
    teamId: game.teamId,
    type: game.type,
    hostId: game.hostId,
    phase: game.phase,
    currentTurn: game.currentTurn,
    clue: game.clue,
    remainingGuesses: game.remainingGuesses,
    scores: game.scores,
    winner: game.winner,
    log: game.log,
    isHost: game.hostId === playerId,
    isSpymaster,
    myTeam: team,
    redTeam: {
      spymaster: game.redTeam.spymaster,
      operatives: game.redTeam.operatives,
    },
    blueTeam: {
      spymaster: game.blueTeam.spymaster,
      operatives: game.blueTeam.operatives,
    },
    allPlayers: game.allPlayers,
    grid: game.grid.map(card => {
      if (card.revealed) {
        return { ...card };
      }
      if (isSpymaster) {
        return { ...card }; // spymaster sees all colors
      }
      return { word: card.word, color: null, revealed: false };
    }),
  };

  return view;
}

function dissolveGame(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;
  if (game.hostId !== playerId) return null;
  game.phase = 'ended';
  game.dissolved = true;
  saveGame(game);
  return game;
}

module.exports = {
  getGameById,
  getTeamGames,
  createGame,
  joinGame,
  joinTeam,
  setSpymaster,
  startGame,
  giveClue,
  guessCard,
  endGuessing,
  leaveGame,
  getGameView,
  dissolveGame,
};
