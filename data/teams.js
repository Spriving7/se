const fs = require('fs');
const path = require('path');

const TEAMS_FILE = path.join(__dirname, 'teams.json');

function readTeams() {
  try {
    const data = fs.readFileSync(TEAMS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeTeams(teams) {
  const dir = path.dirname(TEAMS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2), 'utf-8');
}

function findTeamById(id) {
  return readTeams().find(t => t.id === id) || null;
}

function findTeamByCode(code) {
  return readTeams().find(t => t.joinCode === code.toUpperCase()) || null;
}

function getUserTeams(userId) {
  return readTeams().filter(t => t.members.some(m => m.id === userId));
}

function saveTeam(team) {
  const teams = readTeams();
  const idx = teams.findIndex(t => t.id === team.id);
  if (idx >= 0) {
    teams[idx] = team;
  } else {
    teams.push(team);
  }
  writeTeams(teams);
  return team;
}

function removeTeam(teamId) {
  const teams = readTeams().filter(t => t.id !== teamId);
  writeTeams(teams);
}

module.exports = {
  findTeamById,
  findTeamByCode,
  getUserTeams,
  saveTeam,
  removeTeam,
};
