const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');

const app = express();

app.use(cookieParser());
app.use(express.json());

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// Auth 路由
app.use('/auth', authRoutes);

// Team 路由
app.use('/teams', teamRoutes);

// 所有其他路由返回 index.html（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`服务器运行在 http://localhost:${config.PORT}`);
});
