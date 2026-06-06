const fs = require('fs');
const path = require('path');

const ITINERARY_FILE = path.join(__dirname, 'itinerary.json');

function readItems() {
  try {
    return JSON.parse(fs.readFileSync(ITINERARY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeItems(items) {
  const dir = path.dirname(ITINERARY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ITINERARY_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTeamItinerary(teamId) {
  return readItems()
    .filter(i => i.teamId === teamId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
}

function addItem(teamId, creatorId, creatorNickname, data) {
  const item = {
    id: generateId('iti_'),
    teamId,
    creatorId,
    creatorNickname,
    date: data.date,
    time: data.time || '',
    title: data.title,
    description: data.description || '',
    type: data.type || 'activity',
    createdAt: Date.now(),
  };

  const items = readItems();
  items.push(item);
  writeItems(items);
  return item;
}

function updateItem(itemId, userId, data) {
  const items = readItems();
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return null;
  if (items[idx].creatorId !== userId) return null;

  const allowed = ['date', 'time', 'title', 'description', 'type'];
  allowed.forEach(key => {
    if (data[key] !== undefined) items[idx][key] = data[key];
  });

  writeItems(items);
  return items[idx];
}

function deleteItem(itemId, userId) {
  const items = readItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return false;
  if (item.creatorId !== userId) return false;

  writeItems(items.filter(i => i.id !== itemId));
  return true;
}

module.exports = {
  getTeamItinerary,
  addItem,
  updateItem,
  deleteItem,
};
