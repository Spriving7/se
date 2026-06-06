const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById } = require('../data/teams');
const { getTeamPhotos, addPhoto, deletePhoto, getPhotoPath } = require('../data/photos');

const router = express.Router();

// 公开：提供图片文件
router.get('/file/:filename', (req, res) => {
  const filepath = getPhotoPath(req.params.filename);
  if (!filepath) return res.status(404).send('Not found');
  res.sendFile(filepath);
});

router.use(requireAuth);

// GET /photos/:teamId — 获取照片列表
router.get('/:teamId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!team.members.some(m => m.id === req.user.id)) {
    return res.status(403).json({ error: '你不是该小分队的成员' });
  }
  res.json(getTeamPhotos(req.params.teamId));
});

// POST /photos — 上传照片
router.post('/', (req, res) => {
  const { teamId, base64, caption } = req.body;
  if (!teamId || !base64) return res.status(400).json({ error: '参数不完整' });

  const team = findTeamById(teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!team.members.some(m => m.id === req.user.id)) {
    return res.status(403).json({ error: '你不是该小分队的成员' });
  }

  if (base64.length > 7 * 1024 * 1024) {
    return res.status(400).json({ error: '图片太大，请压缩后上传（限5MB）' });
  }

  const photo = addPhoto(teamId, req.user.id, req.user.nickname, base64, caption);
  if (!photo) return res.status(400).json({ error: '上传失败' });
  res.json(photo);
});

// DELETE /photos/:id — 删除照片
router.delete('/:id', (req, res) => {
  const ok = deletePhoto(req.params.id, req.user.id);
  if (!ok) return res.status(400).json({ error: '删除失败' });
  res.json({ ok: true });
});

module.exports = router;
