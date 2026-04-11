const { getSession, findUserById } = require('../data/users');

function requireAuth(req, res, next) {
  const token = req.cookies.session_token;
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  const session = getSession(token);
  if (!session) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: '会话已过期' });
  }

  const user = findUserById(session.userId);
  if (!user) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: '用户不存在' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };
