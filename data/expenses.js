const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'expenses.json');

function readData() {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { expenses: [], settlements: [] };
  }
}

function writeData(data) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getTeamExpenses(teamId) {
  const data = readData();
  return {
    expenses: data.expenses.filter(e => e.teamId === teamId),
    settlements: data.settlements.filter(s => s.teamId === teamId),
  };
}

function addExpense(expense) {
  const data = readData();
  data.expenses.push(expense);
  writeData(data);
  return expense;
}

function updateExpense(teamId, expenseId, updates) {
  const data = readData();
  const idx = data.expenses.findIndex(e => e.id === expenseId && e.teamId === teamId);
  if (idx < 0) return null;
  data.expenses[idx] = { ...data.expenses[idx], ...updates };
  writeData(data);
  return data.expenses[idx];
}

function deleteExpense(teamId, expenseId) {
  const data = readData();
  const before = data.expenses.length;
  data.expenses = data.expenses.filter(e => !(e.id === expenseId && e.teamId === teamId));
  if (data.expenses.length === before) return false;
  writeData(data);
  return true;
}

function addSettlement(settlement) {
  const data = readData();
  data.settlements.push(settlement);
  writeData(data);
  return settlement;
}

function deleteSettlement(teamId, settlementId) {
  const data = readData();
  const before = data.settlements.length;
  data.settlements = data.settlements.filter(
    s => !(s.id === settlementId && s.teamId === teamId)
  );
  if (data.settlements.length === before) return false;
  writeData(data);
  return true;
}

function getTeamSettlements(teamId) {
  return readData().settlements.filter(s => s.teamId === teamId);
}

module.exports = {
  getTeamExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  addSettlement,
  deleteSettlement,
  getTeamSettlements,
};
