const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, 'splendor.json');

// ===== Card definitions =====
const ALL_CARDS = [
  // Level 1 (0 pts, low cost)
  { id: 'l1_01', level: 1, points: 0, color: 'white',  cost: { blue: 2, green: 1 } },
  { id: 'l1_02', level: 1, points: 0, color: 'white',  cost: { red: 2, blue: 1 } },
  { id: 'l1_03', level: 1, points: 0, color: 'white',  cost: { green: 1, red: 1, black: 1 } },
  { id: 'l1_04', level: 1, points: 0, color: 'white',  cost: { blue: 3 } },
  { id: 'l1_05', level: 1, points: 0, color: 'blue',   cost: { white: 2, green: 1 } },
  { id: 'l1_06', level: 1, points: 0, color: 'blue',   cost: { red: 2, black: 1 } },
  { id: 'l1_07', level: 1, points: 0, color: 'blue',   cost: { white: 1, red: 1, green: 1 } },
  { id: 'l1_08', level: 1, points: 0, color: 'blue',   cost: { green: 3 } },
  { id: 'l1_09', level: 1, points: 0, color: 'green',  cost: { white: 2, red: 1 } },
  { id: 'l1_10', level: 1, points: 0, color: 'green',  cost: { blue: 2, black: 1 } },
  { id: 'l1_11', level: 1, points: 0, color: 'green',  cost: { white: 1, red: 1, blue: 1 } },
  { id: 'l1_12', level: 1, points: 0, color: 'green',  cost: { red: 3 } },
  { id: 'l1_13', level: 1, points: 0, color: 'red',    cost: { white: 2, black: 1 } },
  { id: 'l1_14', level: 1, points: 0, color: 'red',    cost: { blue: 2, green: 1 } },
  { id: 'l1_15', level: 1, points: 0, color: 'red',    cost: { white: 1, blue: 1, black: 1 } },
  { id: 'l1_16', level: 1, points: 0, color: 'red',    cost: { black: 3 } },
  { id: 'l1_17', level: 1, points: 0, color: 'black',  cost: { white: 2, blue: 1 } },
  { id: 'l1_18', level: 1, points: 0, color: 'black',  cost: { green: 2, red: 1 } },
  { id: 'l1_19', level: 1, points: 0, color: 'black',  cost: { white: 1, green: 1, red: 1 } },
  { id: 'l1_20', level: 1, points: 0, color: 'black',  cost: { white: 3 } },

  // Level 2 (1-2 pts, medium cost)
  { id: 'l2_01', level: 2, points: 1, color: 'white',  cost: { white: 2, green: 2, red: 1 } },
  { id: 'l2_02', level: 2, points: 1, color: 'white',  cost: { blue: 3, red: 2 } },
  { id: 'l2_03', level: 2, points: 2, color: 'white',  cost: { white: 3, green: 2, black: 1 } },
  { id: 'l2_04', level: 2, points: 1, color: 'blue',   cost: { blue: 2, red: 2, black: 1 } },
  { id: 'l2_05', level: 2, points: 1, color: 'blue',   cost: { green: 3, white: 2 } },
  { id: 'l2_06', level: 2, points: 2, color: 'blue',   cost: { blue: 3, green: 2, red: 1 } },
  { id: 'l2_07', level: 2, points: 1, color: 'green',  cost: { green: 2, white: 2, blue: 1 } },
  { id: 'l2_08', level: 2, points: 1, color: 'green',  cost: { red: 3, black: 2 } },
  { id: 'l2_09', level: 2, points: 2, color: 'green',  cost: { green: 3, white: 2, blue: 1 } },
  { id: 'l2_10', level: 2, points: 1, color: 'red',    cost: { red: 2, blue: 2, green: 1 } },
  { id: 'l2_11', level: 2, points: 1, color: 'red',    cost: { black: 3, white: 2 } },
  { id: 'l2_12', level: 2, points: 2, color: 'red',    cost: { red: 3, blue: 2, green: 1 } },
  { id: 'l2_13', level: 2, points: 1, color: 'black',  cost: { black: 2, green: 2, white: 1 } },
  { id: 'l2_14', level: 2, points: 1, color: 'black',  cost: { white: 3, blue: 2 } },
  { id: 'l2_15', level: 2, points: 2, color: 'black',  cost: { black: 3, red: 2, white: 1 } },

  // Level 3 (3-5 pts, high cost)
  { id: 'l3_01', level: 3, points: 3, color: 'white',  cost: { white: 3, blue: 3, green: 3 } },
  { id: 'l3_02', level: 3, points: 4, color: 'white',  cost: { white: 4, green: 2, red: 1, black: 1 } },
  { id: 'l3_03', level: 3, points: 3, color: 'blue',   cost: { blue: 3, green: 3, red: 3 } },
  { id: 'l3_04', level: 3, points: 4, color: 'blue',   cost: { blue: 4, red: 2, black: 1, white: 1 } },
  { id: 'l3_05', level: 3, points: 3, color: 'green',  cost: { green: 3, red: 3, black: 3 } },
  { id: 'l3_06', level: 3, points: 4, color: 'green',  cost: { green: 4, black: 2, white: 1, blue: 1 } },
  { id: 'l3_07', level: 3, points: 3, color: 'red',    cost: { red: 3, black: 3, white: 3 } },
  { id: 'l3_08', level: 3, points: 4, color: 'red',    cost: { red: 4, white: 2, blue: 1, green: 1 } },
  { id: 'l3_09', level: 3, points: 3, color: 'black',  cost: { black: 3, white: 3, blue: 3 } },
  { id: 'l3_10', level: 3, points: 5, color: 'white',  cost: { white: 7 } },
];

const ALL_NOBLES = [
  { id: 'n1', points: 3, requirement: { white: 3, blue: 3 } },
  { id: 'n2', points: 3, requirement: { white: 3, green: 3 } },
  { id: 'n3', points: 3, requirement: { blue: 3, red: 3 } },
  { id: 'n4', points: 3, requirement: { blue: 3, black: 3 } },
  { id: 'n5', points: 3, requirement: { green: 3, red: 3 } },
  { id: 'n6', points: 3, requirement: { green: 3, black: 3 } },
  { id: 'n7', points: 3, requirement: { red: 3, black: 3 } },
  { id: 'n8', points: 3, requirement: { red: 3, white: 3 } },
  { id: 'n9', points: 3, requirement: { black: 3, white: 3 } },
  { id: 'n10', points: 3, requirement: { white: 4, blue: 4 } },
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
  return 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

function makePlayer(id, nickname, avatar) {
  return {
    id, nickname, avatar,
    gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
    bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
    cards: [],
    reserved: [],
    nobles: [],
    points: 0,
  };
}

function createGame(teamId, hostId, hostNickname, hostAvatar) {
  const game = {
    id: generateId(),
    teamId,
    type: 'splendor',
    hostId,
    players: [makePlayer(hostId, hostNickname, hostAvatar)],
    bank: { white: 7, blue: 7, green: 7, red: 7, black: 7, gold: 5 },
    table: { level1: [], level2: [], level3: [] },
    decks: { level1: [], level2: [], level3: [] },
    nobles: [],
    phase: 'lobby',
    currentPlayerIndex: 0,
    winner: null,
    lastRound: false,
    createdAt: Date.now(),
  };
  saveGame(game);
  return game;
}

function joinGame(gameId, playerId, nickname, avatar) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'lobby') return null;
  if (game.players.some(p => p.id === playerId)) return game;
  if (game.players.length >= 4) return null;

  game.players.push(makePlayer(playerId, nickname, avatar));
  saveGame(game);
  return game;
}

function startGame(gameId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'lobby') return null;
  if (game.players.length < 2) return null;

  // Prepare decks
  const l1 = shuffle(ALL_CARDS.filter(c => c.level === 1));
  const l2 = shuffle(ALL_CARDS.filter(c => c.level === 2));
  const l3 = shuffle(ALL_CARDS.filter(c => c.level === 3));

  game.decks = { level1: l1, level2: l2, level3: l3 };
  game.table = {
    level1: l1.splice(0, 4),
    level2: l2.splice(0, 4),
    level3: l3.splice(0, 4),
  };

  // Nobles: player count + 1
  const nobleCount = game.players.length + 1;
  game.nobles = shuffle(ALL_NOBLES).slice(0, nobleCount);

  // Adjust bank based on player count
  const gemCounts = { 2: 4, 3: 5, 4: 7 };
  const gc = gemCounts[game.players.length] || 7;
  game.bank = { white: gc, blue: gc, green: gc, red: gc, black: gc, gold: 5 };

  game.phase = 'playing';
  game.currentPlayerIndex = 0;
  game.lastRound = false;
  game.winner = null;
  saveGame(game);
  return game;
}

function totalGems(gems) {
  return Object.values(gems).reduce((s, v) => s + v, 0);
}

function takeGems(gameId, playerId, gems) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'playing') return null;

  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx !== game.currentPlayerIndex) return null;

  const colors = Object.keys(gems).filter(c => gems[c] > 0);
  if (colors.length === 0) return null;

  // Validate: max 3 of same color, or exactly 2 of same color (if 4+ available), or 3 different colors
  if (colors.length === 1) {
    const c = colors[0];
    if (c === 'gold') return null; // can't take gold
    if (gems[c] !== 2) return null;
    if (game.bank[c] < 4) return null; // need at least 4 to take 2
    if (game.bank[c] < 2) return null;
  } else if (colors.length === 3) {
    for (const c of colors) {
      if (c === 'gold') return null;
      if (gems[c] !== 1) return null;
      if (game.bank[c] < 1) return null;
    }
  } else if (colors.length === 2) {
    // Taking 2 different gems (each 1)
    for (const c of colors) {
      if (c === 'gold') return null;
      if (gems[c] !== 1) return null;
      if (game.bank[c] < 1) return null;
    }
  } else {
    return null;
  }

  // Check total gem limit (10)
  const taking = Object.values(gems).reduce((s, v) => s + v, 0);
  if (totalGems(game.players[playerIdx].gems) + taking > 10) return null;

  // Take from bank
  for (const c of colors) {
    game.bank[c] -= gems[c];
    game.players[playerIdx].gems[c] += gems[c];
  }

  advanceTurn(game);
  saveGame(game);
  return game;
}

function reserveCard(gameId, playerId, source, cardIndex) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'playing') return null;

  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx !== game.currentPlayerIndex) return null;

  // Max 3 reserved cards
  if (game.players[playerIdx].reserved.length >= 3) return null;

  // Max 10 gems
  if (totalGems(game.players[playerIdx].gems) >= 10) return null;

  let card;
  if (source === 'table') {
    const level = ['level1', 'level2', 'level3'][cardIndex.level] || cardIndex.level;
    const idx = cardIndex.index;
    if (idx < 0 || idx >= game.table[level].length) return null;
    card = game.table[level].splice(idx, 1)[0];
    // Refill from deck
    if (game.decks[level].length > 0) {
      game.table[level].push(game.decks[level].shift());
    }
  } else if (source === 'deck') {
    const level = cardIndex.level;
    if (game.decks[level].length === 0) return null;
    card = game.decks[level].shift();
  } else {
    return null;
  }

  game.players[playerIdx].reserved.push(card.id);
  // Store the card info on the player (we need card details)
  if (!game.players[playerIdx]._reservedCards) game.players[playerIdx]._reservedCards = [];
  game.players[playerIdx]._reservedCards.push(card);

  // Get a gold gem if available
  if (game.bank.gold > 0) {
    game.bank.gold--;
    game.players[playerIdx].gems.gold++;
  }

  advanceTurn(game);
  saveGame(game);
  return game;
}

function buyCard(gameId, playerId, source, cardId) {
  const game = getGameById(gameId);
  if (!game || game.phase !== 'playing') return null;

  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx !== game.currentPlayerIndex) return null;

  let card;
  let cardLevel;

  if (source === 'table') {
    // Find card on table
    for (const level of ['level1', 'level2', 'level3']) {
      const idx = game.table[level].findIndex(c => c.id === cardId);
      if (idx >= 0) {
        card = game.table[level].splice(idx, 1)[0];
        cardLevel = level;
        // Refill
        if (game.decks[level].length > 0) {
          game.table[level].push(game.decks[level].shift());
        }
        break;
      }
    }
  } else if (source === 'reserved') {
    const p = game.players[playerIdx];
    const rIdx = p._reservedCards ? p._reservedCards.findIndex(c => c.id === cardId) : -1;
    if (rIdx < 0) return null;
    card = p._reservedCards.splice(rIdx, 1)[0];
    p.reserved = p.reserved.filter(id => id !== cardId);
  }

  if (!card) return null;

  const player = game.players[playerIdx];

  // Calculate actual cost
  const colors = ['white', 'blue', 'green', 'red', 'black'];
  let goldNeeded = 0;
  const payment = {};

  for (const c of colors) {
    const cost = card.cost[c] || 0;
    const bonus = player.bonuses[c] || 0;
    const actual = Math.max(0, cost - bonus);
    if (actual > 0) {
      if (player.gems[c] >= actual) {
        payment[c] = actual;
      } else {
        const fromGems = player.gems[c];
        const fromGold = actual - fromGems;
        payment[c] = fromGems;
        goldNeeded += fromGold;
      }
    }
  }

  if (goldNeeded > player.gems.gold) return null;

  // Pay
  for (const c of colors) {
    if (payment[c]) {
      player.gems[c] -= payment[c];
      game.bank[c] += payment[c];
    }
  }
  player.gems.gold -= goldNeeded;
  game.bank.gold += goldNeeded;

  // Gain card
  player.cards.push(card.id);
  player.bonuses[card.color]++;
  player.points += card.points;

  // Check nobles
  checkNobles(game, playerIdx);

  // Check win
  if (player.points >= 15) {
    game.lastRound = true;
  }

  advanceTurn(game);
  saveGame(game);
  return game;
}

function checkNobles(game, playerIdx) {
  const player = game.players[playerIdx];
  const colors = ['white', 'blue', 'green', 'red', 'black'];

  for (let i = game.nobles.length - 1; i >= 0; i--) {
    const noble = game.nobles[i];
    let canTake = true;
    for (const c of colors) {
      if ((noble.requirement[c] || 0) > player.bonuses[c]) {
        canTake = false;
        break;
      }
    }
    if (canTake) {
      player.nobles.push(noble.id);
      player.points += noble.points;
      game.nobles.splice(i, 1);

      if (player.points >= 15) {
        game.lastRound = true;
      }
    }
  }
}

function advanceTurn(game) {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

  // If we wrapped around and lastRound is set, end game
  if (game.currentPlayerIndex === 0 && game.lastRound) {
    game.phase = 'ended';
    // Find winner
    let maxPoints = -1;
    let winnerId = null;
    for (const p of game.players) {
      if (p.points > maxPoints || (p.points === maxPoints && p.cards.length < (game.players.find(pp => pp.id === winnerId)?.cards.length || Infinity))) {
        maxPoints = p.points;
        winnerId = p.id;
      }
    }
    game.winner = winnerId;
  }
}

function leaveGame(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;
  const idx = game.players.findIndex(p => p.id === playerId);
  if (idx < 0) return null;
  game.players.splice(idx, 1);
  if (game.players.length === 0) {
    game.phase = 'ended';
  } else {
    if (game.hostId === playerId) game.hostId = game.players[0].id;
    if (game.currentPlayerIndex >= game.players.length) game.currentPlayerIndex = 0;
  }
  saveGame(game);
  return game;
}

function getGameView(gameId, playerId) {
  const game = getGameById(gameId);
  if (!game) return null;

  const view = JSON.parse(JSON.stringify(game));
  view.isHost = game.hostId === playerId;

  // Build a card lookup for reserved cards display
  const allCardsOnTable = [
    ...game.table.level1,
    ...game.table.level2,
    ...game.table.level3,
  ];

  // Add reserved card details for each player
  view.players.forEach(p => {
    if (p._reservedCards) {
      p.reservedCards = p._reservedCards;
    } else {
      p.reservedCards = [];
    }
    delete p._reservedCards;
  });

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
  startGame,
  takeGems,
  reserveCard,
  buyCard,
  leaveGame,
  getGameView,
  dissolveGame,
};
