const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const expenseRoutes = require('./routes/expenses');
const gameRoutes = require('./routes/games');
const photoRoutes = require('./routes/photos');
const itineraryRoutes = require('./routes/itinerary');

const app = express();

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// Auth 路由
app.use('/auth', authRoutes);

// Team 路由
app.use('/teams', teamRoutes);

// Expense 路由
app.use('/expenses', expenseRoutes);

// Game 路由
app.use('/games', gameRoutes);

// Photo 路由
app.use('/photos', photoRoutes);

// Itinerary 路由
app.use('/itinerary', itineraryRoutes);

// 所有其他路由返回 index.html（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`服务器运行在 http://localhost:${config.PORT}`);
});
