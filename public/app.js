// ========== 常量与配置 ==========
const STORAGE_KEYS = {
  USER: 'travel_user',
  THEME: 'theme',
};

const AVATARS = ['😀', '😎', '🤠', '🐱', '🐶', '🦊', '🐼', '🐨', '🦄', '🐲', '🌸', '🍉', '⚽', '🎸', '🎭', '🚀'];

const AVATAR_COLORS = [
  'bg-red-100 dark:bg-red-900/30',
  'bg-orange-100 dark:bg-orange-900/30',
  'bg-amber-100 dark:bg-amber-900/30',
  'bg-green-100 dark:bg-green-900/30',
  'bg-teal-100 dark:bg-teal-900/30',
  'bg-blue-100 dark:bg-blue-900/30',
  'bg-indigo-100 dark:bg-indigo-900/30',
  'bg-purple-100 dark:bg-purple-900/30',
  'bg-pink-100 dark:bg-pink-900/30',
];

// 缓存的小分队列表（从服务器获取）
let cachedTeams = [];

// ========== AA 记账状态 ==========
const CATEGORY_ICONS = { food: '🍔', transport: '🚕', accommodation: '🏨', tickets: '🎫', shopping: '🛍️', other: '💵' };
let aaSelectedTeamId = null;
let aaCachedData = null;
let aaCurrentTab = 'expenses';
let editingExpenseId = null;
let pendingSettle = null;

// ========== 工具函数 ==========
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function showToast(message, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== 数据存取 ==========
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// ========== 主题切换 ==========
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && prefersDark);
  applyTheme(isDark);
}

function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(!isDark);
}

// ========== 初始化应用（自动登录） ==========
async function initApp() {
  try {
    const meRes = await fetch('/auth/me');
    if (meRes.ok) {
      const user = await meRes.json();
      setUser(user);
    }
  } catch {
    // 网络错误，使用 localStorage 中的用户
  }

  updateUIForUserState();
}

// ========== 页面导航 ==========
function navigateTo(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  document.getElementById('mobileMenu').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageName === 'teams') renderTeamsPage();
  if (pageName === 'aa') renderAAPage();
  if (pageName === 'profile') renderProfilePage();
}

// ========== 移动端菜单 ==========
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ========== 头像选择器 ==========
function renderAvatarPicker(containerId, selectedAvatar, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  AVATARS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option' + (emoji === selectedAvatar ? ' selected' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (onSelect) onSelect(emoji);
    });
    container.appendChild(btn);
  });
}

// ========== 用户状态更新 ==========
function updateUIForUserState() {
  const user = getUser();
  const avatarBtn = document.getElementById('userAvatarBtn');

  if (user) {
    avatarBtn.innerHTML = `<span class="text-xl">${user.avatar}</span>`;
    avatarBtn.onclick = () => navigateTo('profile');
  } else {
    avatarBtn.innerHTML = '<span class="text-xl">👤</span>';
    avatarBtn.onclick = () => showLoginModal();
  }
}

// ========== 登录相关 ==========
let loginSelectedAvatar = '😀';

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('hidden');
  loginSelectedAvatar = '😀';
  renderAvatarPicker('avatarPicker', loginSelectedAvatar, (emoji) => {
    loginSelectedAvatar = emoji;
  });
  document.getElementById('loginNickname').value = '';
}

function hideLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

async function handleLogin() {
  const nickname = document.getElementById('loginNickname').value.trim();
  if (!nickname) {
    showToast('请输入昵称', 'error');
    return;
  }

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, avatar: loginSelectedAvatar }),
    });

    if (res.ok) {
      const user = await res.json();
      setUser(user);
      hideLoginModal();
      updateUIForUserState();
      showToast('登录成功！', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '登录失败', 'error');
    }
  } catch {
    // 后端不可用时，离线模式登录
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      nickname,
      avatar: loginSelectedAvatar,
      loginTime: Date.now(),
    };
    setUser(user);
    hideLoginModal();
    updateUIForUserState();
    showToast('登录成功！（离线模式）', 'success');
  }
}

async function logout() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
  } catch {
    // 忽略
  }
  clearUser();
  cachedTeams = [];
  updateUIForUserState();
  navigateTo('home');
  showToast('已退出登录', 'info');
}

// ========== 个人中心 ==========
function renderProfilePage() {
  const user = getUser();
  const loginPrompt = document.getElementById('profileLoginPrompt');
  const content = document.getElementById('profileContent');

  if (!user) {
    loginPrompt.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  loginPrompt.classList.add('hidden');
  content.classList.remove('hidden');

  const profileAvatar = document.getElementById('profileAvatar');
  profileAvatar.textContent = user.avatar;
  document.getElementById('profileNickname').textContent = user.nickname;
}

let editSelectedAvatar = '';

function showEditProfileModal() {
  const user = getUser();
  if (!user) return;

  document.getElementById('editProfileModal').classList.remove('hidden');

  editSelectedAvatar = user.avatar;
  document.getElementById('editNickname').value = user.nickname;

  renderAvatarPicker('editAvatarPicker', editSelectedAvatar, (emoji) => {
    editSelectedAvatar = emoji;
  });
}

function closeEditProfileModal() {
  document.getElementById('editProfileModal').classList.add('hidden');
}

function saveProfile() {
  const user = getUser();
  if (!user) return;

  const nickname = document.getElementById('editNickname').value.trim();
  if (!nickname) {
    showToast('昵称不能为空', 'error');
    return;
  }

  user.avatar = editSelectedAvatar;
  user.nickname = nickname;
  setUser(user);

  closeEditProfileModal();
  updateUIForUserState();
  renderProfilePage();
  showToast('资料已更新', 'success');
}

// ========== 小分队管理 ==========
function renderTeamsPage() {
  const user = getUser();
  const loginPrompt = document.getElementById('teamsLoginPrompt');
  const content = document.getElementById('teamsContent');

  if (!user) {
    loginPrompt.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  loginPrompt.classList.add('hidden');
  content.classList.remove('hidden');

  renderTeamsList();
}

async function renderTeamsList() {
  const user = getUser();
  if (!user) return;

  const listEl = document.getElementById('teamsList');
  const emptyEl = document.getElementById('emptyTeams');

  try {
    const res = await fetch('/teams');
    if (res.ok) {
      cachedTeams = await res.json();
    } else if (res.status === 401) {
      // 未登录，不处理（页面层已处理）
      return;
    }
  } catch {
    // 网络错误，使用缓存
  }

  const teams = cachedTeams;

  if (teams.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.innerHTML = teams.map(team => {
    const isCreator = team.creatorId === user.id;
    const memberAvatars = team.members.slice(0, 5).map(m =>
      `<span class="member-avatar ${AVATAR_COLORS[m.id.charCodeAt(0) % AVATAR_COLORS.length]}" title="${escapeHtml(m.nickname)}">${m.avatar}</span>`
    ).join('');
    const extraCount = team.members.length > 5 ? `<span class="member-avatar bg-gray-100 dark:bg-gray-600 text-xs text-gray-500">+${team.members.length - 5}</span>` : '';

    const dateStr = (team.startDate && team.endDate)
      ? `${formatDate(team.startDate)} - ${formatDate(team.endDate)}`
      : '';

    return `
      <div class="team-card mb-3" onclick="showTeamDetail('${team.id}')">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base truncate">${escapeHtml(team.name)}</h3>
            ${team.destination ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">📍 ${escapeHtml(team.destination)}</p>` : ''}
          </div>
          <div class="flex items-center gap-1.5 ml-3 shrink-0">
            ${isCreator ? '<span class="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">队长</span>' : '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">队员</span>'}
          </div>
        </div>
        ${dateStr ? `<p class="text-xs text-gray-400 dark:text-gray-500 mb-2">📅 ${dateStr}</p>` : ''}
        <div class="flex items-center justify-between mt-3">
          <div class="flex -space-x-2">${memberAvatars}${extraCount}</div>
          <span class="text-xs text-gray-400 dark:text-gray-500">${team.members.length}人</span>
        </div>
      </div>
    `;
  }).join('');
}

// 创建小分队
function showCreateTeamModal() {
  if (!getUser()) { showLoginModal(); return; }
  document.getElementById('createTeamModal').classList.remove('hidden');
  document.getElementById('teamName').value = '';
  document.getElementById('teamDest').value = '';
  document.getElementById('teamStartDate').value = '';
  document.getElementById('teamEndDate').value = '';
  document.getElementById('teamDesc').value = '';
}

function closeCreateTeamModal() {
  document.getElementById('createTeamModal').classList.add('hidden');
}

async function createTeam() {
  const user = getUser();
  if (!user) return;

  const name = document.getElementById('teamName').value.trim();
  if (!name) {
    showToast('请输入小分队名称', 'error');
    return;
  }

  try {
    const res = await fetch('/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        destination: document.getElementById('teamDest').value.trim(),
        startDate: document.getElementById('teamStartDate').value,
        endDate: document.getElementById('teamEndDate').value,
        description: document.getElementById('teamDesc').value.trim(),
      }),
    });

    if (res.ok) {
      closeCreateTeamModal();
      renderTeamsList();
      showToast('小分队创建成功！', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '创建失败', 'error');
    }
  } catch {
    showToast('网络错误，请检查连接', 'error');
  }
}

// 加入小分队
function showJoinTeamModal() {
  if (!getUser()) { showLoginModal(); return; }
  document.getElementById('joinTeamModal').classList.remove('hidden');
  document.getElementById('joinCode').value = '';
}

function closeJoinTeamModal() {
  document.getElementById('joinTeamModal').classList.add('hidden');
}

async function joinTeam() {
  const user = getUser();
  if (!user) return;

  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (code.length !== 6) {
    showToast('请输入6位邀请码', 'error');
    return;
  }

  try {
    const res = await fetch('/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      const team = await res.json();
      closeJoinTeamModal();
      renderTeamsList();
      showToast(`成功加入「${team.name}」！`, 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '加入失败', 'error');
    }
  } catch {
    showToast('网络错误，请检查连接', 'error');
  }
}

// 小分队详情
let currentTeamId = null;

async function showTeamDetail(teamId) {
  const user = getUser();

  try {
    const res = await fetch('/teams/' + teamId);
    if (!res.ok) {
      showToast('小分队不存在', 'error');
      return;
    }
    var team = await res.json();
  } catch {
    showToast('网络错误', 'error');
    return;
  }

  currentTeamId = teamId;
  document.getElementById('teamDetailTitle').textContent = team.name;

  const isCreator = user && team.creatorId === user.id;

  const dateStr = (team.startDate && team.endDate)
    ? `${team.startDate} ~ ${team.endDate}`
    : '未设置';

  document.getElementById('teamDetailContent').innerHTML = `
    <!-- 基本信息 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
      ${team.destination ? `
        <div class="flex items-center gap-2 mb-3">
          <span>📍</span>
          <span class="text-gray-700 dark:text-gray-300">${escapeHtml(team.destination)}</span>
        </div>
      ` : ''}
      <div class="flex items-center gap-2 mb-3">
        <span>📅</span>
        <span class="text-gray-700 dark:text-gray-300">${dateStr}</span>
      </div>
      ${team.description ? `
        <div class="flex items-start gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span>📝</span>
          <p class="text-gray-600 dark:text-gray-400 text-sm">${escapeHtml(team.description)}</p>
        </div>
      ` : ''}
    </div>

    <!-- 邀请码 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">邀请码</p>
          <p class="text-2xl font-bold tracking-[0.3em] mt-1 font-mono">${team.joinCode}</p>
        </div>
        <button onclick="copyJoinCode('${team.joinCode}')" class="px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
          复制邀请码
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">分享邀请码给小伙伴，即可加入小分队</p>
    </div>

    <!-- 成员列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 class="font-semibold text-gray-700 dark:text-gray-300">成员 (${team.members.length})</h3>
      </div>
      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        ${team.members.map(m => {
          const isTeamCreator = m.id === team.creatorId;
          return `
            <div class="flex items-center gap-3 px-5 py-3">
              <span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[m.id.charCodeAt(0) % AVATAR_COLORS.length]}">${m.avatar}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">${escapeHtml(m.nickname)}${m.id === (user && user.id) ? ' <span class="text-xs text-gray-400">(我)</span>' : ''}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">${isTeamCreator ? '队长' : '队员'} · ${new Date(m.joinedAt).toLocaleDateString()}</p>
              </div>
              ${isCreator && !isTeamCreator ? `
                <button onclick="removeMember('${team.id}', '${m.id}')" class="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="移除成员">
                  移除
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 操作区 -->
    <div class="space-y-3">
      ${isCreator ? `
        <button onclick="disbandTeam('${team.id}')" class="w-full py-3 rounded-xl border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
          解散小分队
        </button>
      ` : `
        <button onclick="leaveTeam('${team.id}')" class="w-full py-3 rounded-xl border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
          退出小分队
        </button>
      `}
    </div>
  `;

  navigateTo('team-detail');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

function copyJoinCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showToast('邀请码已复制', 'success');
    });
  } else {
    const input = document.createElement('input');
    input.value = code;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('邀请码已复制', 'success');
  }
}

async function removeMember(teamId, memberId) {
  const user = getUser();
  if (!user) return;

  // 先获取 team 以显示成员昵称
  const team = cachedTeams.find(t => t.id === teamId);
  const member = team && team.members.find(m => m.id === memberId);
  if (!member) return;

  if (!confirm(`确定要移除「${member.nickname}」吗？`)) return;

  try {
    const res = await fetch(`/teams/${teamId}/remove-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });

    if (res.ok) {
      showTeamDetail(teamId);
      showToast('已移除成员', 'info');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

async function leaveTeam(teamId) {
  if (!confirm('确定要退出这个小分队吗？')) return;

  try {
    const res = await fetch(`/teams/${teamId}/leave`, { method: 'POST' });
    if (res.ok) {
      navigateTo('teams');
      showToast('已退出小分队', 'info');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

async function disbandTeam(teamId) {
  if (!confirm('确定要解散这个小分队吗？此操作不可撤销！')) return;

  try {
    const res = await fetch(`/teams/${teamId}/disband`, { method: 'POST' });
    if (res.ok) {
      navigateTo('teams');
      showToast('小分队已解散', 'info');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

// ========== AA 记账 ==========

function renderAAPage() {
  const user = getUser();
  const loginPrompt = document.getElementById('aaLoginPrompt');
  const content = document.getElementById('aaContent');

  if (!user) {
    loginPrompt.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  loginPrompt.classList.add('hidden');
  content.classList.remove('hidden');

  populateAATeamSelect();
}

async function populateAATeamSelect() {
  const select = document.getElementById('aaTeamSelect');
  const user = getUser();
  if (!user) return;

  try {
    const res = await fetch('/teams');
    if (res.ok) {
      cachedTeams = await res.json();
    }
  } catch { /* use cached */ }

  const current = select.value;
  select.innerHTML = '<option value="">-- 选择小分队 --</option>';
  cachedTeams.forEach(team => {
    const opt = document.createElement('option');
    opt.value = team.id;
    opt.textContent = team.name;
    select.appendChild(opt);
  });

  if (aaSelectedTeamId && cachedTeams.some(t => t.id === aaSelectedTeamId)) {
    select.value = aaSelectedTeamId;
    await loadAAData();
  }
}

function onAATeamChange() {
  aaSelectedTeamId = document.getElementById('aaTeamSelect').value || null;
  if (aaSelectedTeamId) {
    loadAAData();
  } else {
    aaCachedData = null;
    document.getElementById('aaSummary').classList.add('hidden');
    document.getElementById('aaTabs').classList.add('hidden');
    document.getElementById('aaExpenseList').innerHTML = '';
    document.getElementById('aaEmptyExpenses').classList.add('hidden');
    document.getElementById('aaSettlementList').classList.add('hidden');
    document.getElementById('aaAddBtn').classList.add('hidden');
  }
}

async function loadAAData() {
  if (!aaSelectedTeamId) return;

  try {
    const [dataRes, settleRes] = await Promise.all([
      fetch(`/expenses/${aaSelectedTeamId}`),
      fetch(`/expenses/${aaSelectedTeamId}/settlement`),
    ]);
    if (!dataRes.ok || !settleRes.ok) {
      showToast('加载数据失败', 'error');
      return;
    }
    const data = await dataRes.json();
    const settleData = await settleRes.json();
    aaCachedData = { ...data, settlement: settleData };
  } catch {
    showToast('网络错误', 'error');
    return;
  }

  renderAASummary();
  renderAAExpenseList();
  renderAASettlement();
  document.getElementById('aaSummary').classList.remove('hidden');
  document.getElementById('aaTabs').classList.remove('hidden');
  document.getElementById('aaAddBtn').classList.remove('hidden');
}

function renderAASummary() {
  if (!aaCachedData) return;
  const { settlement, members } = aaCachedData;
  const user = getUser();

  document.getElementById('aaTotalExpense').textContent = '¥' + (settlement.totalExpenses || 0).toFixed(2);

  const myBal = settlement.balances[user.id] || 0;
  const balEl = document.getElementById('aaMyBalance');
  balEl.textContent = (myBal >= 0 ? '+' : '') + '¥' + myBal.toFixed(2);
  balEl.className = 'text-xl font-bold ' + (myBal > 0.005 ? 'text-green-600 dark:text-green-400' : myBal < -0.005 ? 'text-red-500' : 'text-gray-500');
}

function switchAATab(tab) {
  aaCurrentTab = tab;
  document.querySelectorAll('.aa-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.aatab === tab);
  });

  if (tab === 'expenses') {
    renderAAExpenseList();
    document.getElementById('aaSettlementList').classList.add('hidden');
    document.getElementById('aaAddBtn').classList.remove('hidden');
  } else {
    document.getElementById('aaExpenseList').innerHTML = '';
    document.getElementById('aaEmptyExpenses').classList.add('hidden');
    document.getElementById('aaAddBtn').classList.add('hidden');
    renderAASettlement();
  }
}

function renderAAExpenseList() {
  if (!aaCachedData) return;
  const { expenses, members } = aaCachedData;
  const user = getUser();
  const listEl = document.getElementById('aaExpenseList');
  const emptyEl = document.getElementById('aaEmptyExpenses');

  if (expenses.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  listEl.innerHTML = expenses.sort((a, b) => b.createdAt - a.createdAt).map(exp => {
    const payer = memberMap[exp.payerId];
    const icon = CATEGORY_ICONS[exp.category] || '💵';
    const splitNames = exp.splitAmong.map(uid => {
      const m = memberMap[uid];
      return m ? escapeHtml(m.nickname) : uid;
    }).join('、');

    return `
      <div class="expense-card mb-3 cursor-pointer" onclick="showExpenseModal('${exp.id}')">
        <div class="flex items-start gap-3">
          <div class="expense-category-icon shrink-0">${icon}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="font-medium truncate">${escapeHtml(exp.description)}</h4>
              <span class="text-base font-bold text-primary-600 dark:text-primary-400 shrink-0 ml-2">¥${exp.amount.toFixed(2)}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ${payer ? payer.avatar + ' ' + escapeHtml(payer.nickname) : '未知'} 付款 · 均摊 ${exp.splitAmong.length} 人
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">每人 ¥${(exp.splits[exp.splitAmong[0]] || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAASettlement() {
  if (!aaCachedData) return;
  const { settlement, members } = aaCachedData;
  const listEl = document.getElementById('aaSettlementList');

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  const settledMap = new Map();
  (settlement.settledTransfers || []).forEach(s => {
    const key = s.from + '->' + s.to;
    settledMap.set(key, (settledMap.get(key) || 0) + s.amount);
  });

  const allTransfers = [
    ...settlement.transfers.map(t => ({ ...t, settled: false })),
    ...(settlement.settledTransfers || []).map(t => ({
      from: t.from, to: t.to, amount: t.amount, settled: true, id: t.id, settledAt: t.settledAt,
    })),
  ];

  if (allTransfers.length === 0) {
    listEl.innerHTML = `
      <div class="placeholder-card">
        <span class="text-5xl mb-4">🎉</span>
        <p class="text-gray-400 dark:text-gray-500 text-lg">无需结算</p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">所有人的账目都已两清</p>
      </div>
    `;
    listEl.classList.remove('hidden');
    return;
  }

  listEl.innerHTML = allTransfers.map(t => {
    const from = memberMap[t.from];
    const to = memberMap[t.to];
    return `
      <div class="settle-card mb-3 ${t.settled ? 'done' : ''}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">${from ? from.avatar : '?'}</span>
            <span class="text-sm font-medium">${from ? escapeHtml(from.nickname) : '?'}</span>
            <span class="text-gray-400 text-xs">→</span>
            <span class="text-lg">${to ? to.avatar : '?'}</span>
            <span class="text-sm font-medium">${to ? escapeHtml(to.nickname) : '?'}</span>
          </div>
          <span class="font-bold text-red-500">¥${t.amount.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between mt-2">
          ${t.settled
            ? `<span class="text-xs text-green-500">✓ 已还 ${new Date(t.settledAt).toLocaleDateString()}</span>
               <button onclick="undoSettlement('${t.id}')" class="text-xs text-gray-400 hover:text-red-400 transition-colors">撤销</button>`
            : `<span class="text-xs text-gray-400 dark:text-gray-500">待还款</span>
               <button onclick="showSettleConfirm('${t.from}','${t.to}',${t.amount})" class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">标记已还</button>`
          }
        </div>
      </div>
    `;
  }).join('');
  listEl.classList.remove('hidden');
}

// ========== 费用模态框 ==========

function showExpenseModal(expenseId) {
  if (!aaSelectedTeamId) {
    showToast('请先选择小分队', 'error');
    return;
  }
  if (!aaCachedData) return;

  editingExpenseId = expenseId || null;
  const modal = document.getElementById('expenseModal');
  const title = document.getElementById('expenseModalTitle');
  const deleteBtn = document.getElementById('expenseDeleteBtn');

  const members = aaCachedData.members;

  // 填充付款人下拉
  const payerSelect = document.getElementById('expensePayer');
  payerSelect.innerHTML = members.map(m =>
    `<option value="${m.id}">${m.avatar} ${escapeHtml(m.nickname)}</option>`
  ).join('');

  // 填充分摊人 checkbox
  const splitDiv = document.getElementById('expenseSplitAmong');
  splitDiv.innerHTML = members.map(m =>
    `<label class="member-check" data-uid="${m.id}" onclick="toggleSplitMember(this)">
       <input type="checkbox" class="hidden" checked>
       <span class="text-lg">${m.avatar}</span>
       <span class="text-sm">${escapeHtml(m.nickname)}</span>
     </label>`
  ).join('');
  splitDiv.querySelectorAll('.member-check').forEach(el => el.classList.add('checked'));

  if (expenseId) {
    title.textContent = '编辑费用';
    deleteBtn.classList.remove('hidden');
    const exp = aaCachedData.expenses.find(e => e.id === expenseId);
    if (exp) {
      document.getElementById('expenseDesc').value = exp.description;
      document.getElementById('expenseAmount').value = exp.amount;
      document.getElementById('expenseCategory').value = exp.category;
      payerSelect.value = exp.payerId;
      // 设置分摊人选中状态
      splitDiv.querySelectorAll('.member-check').forEach(el => {
        const uid = el.dataset.uid;
        const checked = exp.splitAmong.includes(uid);
        el.querySelector('input').checked = checked;
        el.classList.toggle('checked', checked);
      });
    }
  } else {
    title.textContent = '添加费用';
    deleteBtn.classList.add('hidden');
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseCategory').value = 'food';
    // 默认付款人设为当前用户
    const user = getUser();
    if (payerSelect.querySelector(`option[value="${user.id}"]`)) {
      payerSelect.value = user.id;
    }
  }

  modal.classList.remove('hidden');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden');
  editingExpenseId = null;
}

function toggleSplitMember(el) {
  const cb = el.querySelector('input');
  cb.checked = !cb.checked;
  el.classList.toggle('checked', cb.checked);
}

function selectAllSplitMembers() {
  document.querySelectorAll('#expenseSplitAmong .member-check').forEach(el => {
    el.querySelector('input').checked = true;
    el.classList.add('checked');
  });
}

function deselectAllSplitMembers() {
  document.querySelectorAll('#expenseSplitAmong .member-check').forEach(el => {
    el.querySelector('input').checked = false;
    el.classList.remove('checked');
  });
}

async function saveExpense() {
  const desc = document.getElementById('expenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const category = document.getElementById('expenseCategory').value;
  const payerId = document.getElementById('expensePayer').value;
  const splitAmong = [];
  document.querySelectorAll('#expenseSplitAmong .member-check input:checked').forEach(cb => {
    splitAmong.push(cb.closest('.member-check').dataset.uid);
  });

  if (!desc) { showToast('请输入费用描述', 'error'); return; }
  if (!amount || amount <= 0) { showToast('请输入有效金额', 'error'); return; }
  if (splitAmong.length === 0) { showToast('请选择至少一个分摊人', 'error'); return; }

  const body = { description: desc, amount, category, payerId, splitAmong };

  try {
    let res;
    if (editingExpenseId) {
      res = await fetch(`/expenses/${aaSelectedTeamId}/${editingExpenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch(`/expenses/${aaSelectedTeamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (res.ok) {
      closeExpenseModal();
      await loadAAData();
      showToast(editingExpenseId ? '费用已更新' : '费用已添加', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

async function deleteExpense() {
  if (!editingExpenseId || !confirm('确定要删除这笔费用吗？')) return;

  try {
    const res = await fetch(`/expenses/${aaSelectedTeamId}/${editingExpenseId}`, { method: 'DELETE' });
    if (res.ok) {
      closeExpenseModal();
      await loadAAData();
      showToast('费用已删除', 'info');
    } else {
      const data = await res.json();
      showToast(data.error || '删除失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

// ========== 结算操作 ==========

function showSettleConfirm(fromUid, toUid, amount) {
  pendingSettle = { fromUid, toUid, amount };
  const members = aaCachedData.members;
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });
  const from = memberMap[fromUid];
  const to = memberMap[toUid];

  document.getElementById('settleConfirmBody').innerHTML = `
    <div class="flex items-center justify-center gap-3 mb-3">
      <span class="text-3xl">${from ? from.avatar : '?'}</span>
      <span class="text-gray-400 text-xl">→</span>
      <span class="text-3xl">${to ? to.avatar : '?'}</span>
    </div>
    <p class="text-lg font-bold">¥${amount.toFixed(2)}</p>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      ${from ? escapeHtml(from.nickname) : '?'} → ${to ? escapeHtml(to.nickname) : '?'}
    </p>
  `;
  document.getElementById('settleConfirmModal').classList.remove('hidden');
}

function closeSettleConfirmModal() {
  document.getElementById('settleConfirmModal').classList.add('hidden');
  pendingSettle = null;
}

async function confirmSettle() {
  if (!pendingSettle) return;

  try {
    const res = await fetch(`/expenses/${aaSelectedTeamId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUserId: pendingSettle.fromUid,
        toUserId: pendingSettle.toUid,
        amount: pendingSettle.amount,
      }),
    });
    if (res.ok) {
      closeSettleConfirmModal();
      await loadAAData();
      showToast('已标记还款', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

async function undoSettlement(settlementId) {
  if (!confirm('确定要撤销这笔还款记录吗？')) return;

  try {
    const res = await fetch(`/expenses/${aaSelectedTeamId}/settle/${settlementId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAAData();
      showToast('已撤销还款记录', 'info');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('menuToggle').addEventListener('click', toggleMobileMenu);

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  document.getElementById('loginBtn').addEventListener('click', handleLogin);

  document.querySelector('#loginModal .modal-backdrop').addEventListener('click', hideLoginModal);

  initApp();
});
