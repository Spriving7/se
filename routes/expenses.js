const express = require('express');
const { requireAuth } = require('../middleware/session');
const { findTeamById } = require('../data/teams');
const {
  getTeamExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  addSettlement,
  deleteSettlement,
} = require('../data/expenses');

const router = express.Router();

router.use(requireAuth);

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isTeamMember(team, userId) {
  return team.members.some(m => m.id === userId);
}

// 计算均摊 splits（分 rounding 策略确保总和 = amount）
function computeSplits(amount, splitAmong) {
  const n = splitAmong.length;
  if (n === 0) return {};
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainder = totalCents - baseCents * n;
  const splits = {};
  for (let i = 0; i < n; i++) {
    const cents = baseCents + (i < remainder ? 1 : 0);
    splits[splitAmong[i]] = cents / 100;
  }
  return splits;
}

// 结算算法：贪心法，最多 N-1 笔转账
function computeSettlement(expenses, settlements, members) {
  const balances = {};
  members.forEach(m => { balances[m.id] = 0; });

  // 计算净余额
  expenses.forEach(exp => {
    // payer 收到钱 → balance 增加
    if (balances[exp.payerId] !== undefined) {
      balances[exp.payerId] += exp.amount;
    }
    // splitAmong 中每人应付款 → balance 减少
    Object.entries(exp.splits || {}).forEach(([uid, share]) => {
      if (balances[uid] !== undefined) {
        balances[uid] -= share;
      }
    });
  });

  // 扣除已结算
  settlements.forEach(s => {
    if (balances[s.fromUserId] !== undefined) {
      balances[s.fromUserId] += s.amount;
    }
    if (balances[s.toUserId] !== undefined) {
      balances[s.toUserId] -= s.amount;
    }
  });

  // 贪心匹配
  const creditors = [];
  const debtors = [];
  Object.entries(balances).forEach(([uid, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded > 0.005) creditors.push({ uid, amount: rounded });
    else if (rounded < -0.005) debtors.push({ uid, amount: -rounded });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i];
    const d = debtors[j];
    const amt = Math.round(Math.min(c.amount, d.amount) * 100) / 100;
    if (amt > 0.005) {
      transfers.push({ from: d.uid, to: c.uid, amount: amt });
    }
    c.amount = Math.round((c.amount - amt) * 100) / 100;
    d.amount = Math.round((d.amount - amt) * 100) / 100;
    if (c.amount < 0.005) i++;
    if (d.amount < 0.005) j++;
  }

  // 已结算的转账列表
  const settledTransfers = settlements.map(s => ({
    from: s.fromUserId,
    to: s.toUserId,
    amount: s.amount,
    id: s.id,
    settledAt: s.settledAt,
  }));

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { balances, transfers, settledTransfers, totalExpenses };
}

// GET /expenses/:teamId — 获取费用列表 + 结算列表 + 成员
router.get('/:teamId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const data = getTeamExpenses(req.params.teamId);
  res.json({
    expenses: data.expenses,
    settlements: data.settlements,
    members: team.members,
  });
});

// POST /expenses/:teamId — 创建费用
router.post('/:teamId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const { description, amount, payerId, splitAmong, category } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: '请输入费用描述' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '请输入有效金额' });
  }
  if (!payerId) {
    return res.status(400).json({ error: '请选择付款人' });
  }

  const validSplitAmong = (splitAmong || []).filter(uid =>
    team.members.some(m => m.id === uid)
  );
  if (validSplitAmong.length === 0) {
    return res.status(400).json({ error: '请选择至少一个分摊人' });
  }

  if (!team.members.some(m => m.id === payerId)) {
    return res.status(400).json({ error: '付款人不是小分队成员' });
  }

  const splits = computeSplits(amount, validSplitAmong);

  const expense = {
    id: generateId('exp_'),
    teamId: req.params.teamId,
    description: description.trim(),
    amount: Math.round(amount * 100) / 100,
    payerId,
    splitAmong: validSplitAmong,
    splits,
    category: category || 'other',
    createdAt: Date.now(),
  };

  addExpense(expense);
  res.json(expense);
});

// PUT /expenses/:teamId/:expenseId — 编辑费用
router.put('/:teamId/:expenseId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const { description, amount, payerId, splitAmong, category } = req.body;

  const updates = {};
  if (description !== undefined) {
    if (!description.trim()) return res.status(400).json({ error: '请输入费用描述' });
    updates.description = description.trim();
  }
  if (amount !== undefined) {
    if (amount <= 0) return res.status(400).json({ error: '请输入有效金额' });
    updates.amount = Math.round(amount * 100) / 100;
  }
  if (payerId !== undefined) {
    if (!team.members.some(m => m.id === payerId)) {
      return res.status(400).json({ error: '付款人不是小分队成员' });
    }
    updates.payerId = payerId;
  }
  if (splitAmong !== undefined) {
    const valid = splitAmong.filter(uid => team.members.some(m => m.id === uid));
    if (valid.length === 0) return res.status(400).json({ error: '请选择至少一个分摊人' });
    updates.splitAmong = valid;
  }
  if (category !== undefined) {
    updates.category = category;
  }

  // 如果 amount 或 splitAmong 变了，重新算 splits
  const existing = getTeamExpenses(req.params.teamId).expenses.find(
    e => e.id === req.params.expenseId
  );
  if (!existing) return res.status(404).json({ error: '费用记录不存在' });

  const finalAmount = updates.amount !== undefined ? updates.amount : existing.amount;
  const finalSplitAmong = updates.splitAmong || existing.splitAmong;
  updates.splits = computeSplits(finalAmount, finalSplitAmong);

  const updated = updateExpense(req.params.teamId, req.params.expenseId, updates);
  if (!updated) return res.status(404).json({ error: '费用记录不存在' });
  res.json(updated);
});

// DELETE /expenses/:teamId/:expenseId — 删除费用
router.delete('/:teamId/:expenseId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const ok = deleteExpense(req.params.teamId, req.params.expenseId);
  if (!ok) return res.status(404).json({ error: '费用记录不存在' });
  res.json({ ok: true });
});

// GET /expenses/:teamId/settlement — 获取结算方案
router.get('/:teamId/settlement', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const data = getTeamExpenses(req.params.teamId);
  const result = computeSettlement(data.expenses, data.settlements, team.members);
  res.json(result);
});

// POST /expenses/:teamId/settle — 标记一笔转账已还
router.post('/:teamId/settle', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const { fromUserId, toUserId, amount } = req.body;
  if (!fromUserId || !toUserId || !amount || amount <= 0) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const settlement = {
    id: generateId('setl_'),
    teamId: req.params.teamId,
    fromUserId,
    toUserId,
    amount: Math.round(amount * 100) / 100,
    settledAt: Date.now(),
  };

  addSettlement(settlement);
  res.json(settlement);
});

// DELETE /expenses/:teamId/settle/:settlementId — 撤销已还标记
router.delete('/:teamId/settle/:settlementId', (req, res) => {
  const team = findTeamById(req.params.teamId);
  if (!team) return res.status(404).json({ error: '小分队不存在' });
  if (!isTeamMember(team, req.user.id)) return res.status(403).json({ error: '你不是该小分队的成员' });

  const ok = deleteSettlement(req.params.teamId, req.params.settlementId);
  if (!ok) return res.status(404).json({ error: '结算记录不存在' });
  res.json({ ok: true });
});

module.exports = router;
