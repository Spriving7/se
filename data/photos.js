const fs = require('fs');
const path = require('path');

const PHOTOS_FILE = path.join(__dirname, 'photos.json');
const PHOTOS_DIR = path.join(__dirname, 'photo_files');

function readPhotos() {
  try {
    return JSON.parse(fs.readFileSync(PHOTOS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePhotos(photos) {
  const dir = path.dirname(PHOTOS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
}

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTeamPhotos(teamId) {
  return readPhotos()
    .filter(p => p.teamId === teamId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function addPhoto(teamId, uploaderId, uploaderNickname, base64Data, caption) {
  const id = generateId('photo_');

  const matches = base64Data.match(/^data:image\/([\w+]+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('+', '');
  const buffer = Buffer.from(matches[2], 'base64');

  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }

  const filename = id + '.' + ext;
  fs.writeFileSync(path.join(PHOTOS_DIR, filename), buffer);

  const photo = {
    id,
    teamId,
    uploaderId,
    uploaderNickname,
    filename,
    caption: caption || '',
    createdAt: Date.now(),
  };

  const photos = readPhotos();
  photos.push(photo);
  writePhotos(photos);

  return photo;
}

function deletePhoto(photoId, userId) {
  const photos = readPhotos();
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return false;
  if (photo.uploaderId !== userId) return false;

  const filepath = path.join(PHOTOS_DIR, photo.filename);
  try { fs.unlinkSync(filepath); } catch { /* ignore */ }

  writePhotos(photos.filter(p => p.id !== photoId));
  return true;
}

function getPhotoPath(filename) {
  const filepath = path.join(PHOTOS_DIR, filename);
  return fs.existsSync(filepath) ? filepath : null;
}

module.exports = {
  getTeamPhotos,
  addPhoto,
  deletePhoto,
  getPhotoPath,
};
