const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function findUserById(id) {
  return readUsers().find(u => u.id === id) || null;
}

function findUserByNickname(nickname) {
  return readUsers().find(u => u.nickname === nickname) || null;
}

function upsertUser(userData) {
  const users = readUsers();
  const existing = users.find(u => u.id === userData.id);
  if (existing) {
    Object.assign(existing, userData);
  } else {
    users.push(userData);
  }
  writeUsers(users);
  return userData;
}

// 简单的内存 session store（重启丢失，足够用）
const sessions = {};

function createSession(userId) {
  const token = require('uuid').v4();
  sessions[token] = { userId, createdAt: Date.now() };
  return token;
}

function getSession(token) {
  const session = sessions[token];
  if (!session) return null;
  // 30 天过期
  if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) {
    delete sessions[token];
    return null;
  }
  return session;
}

function deleteSession(token) {
  delete sessions[token];
}

module.exports = {
  findUserById,
  findUserByNickname,
  upsertUser,
  createSession,
  getSession,
  deleteSession,
};
