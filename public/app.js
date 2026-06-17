// ========== 常量与配置 ==========
const STORAGE_KEYS = {
  USER: 'travel_user',
  THEME: 'theme',
  ACTIVE_TEAM: 'active_team_id',
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

function getActiveTeamId() {
  const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_TEAM);
  if (!id) return null;
  if (!cachedTeams.some(t => t.id === id)) return null;
  return id;
}

function setActiveTeamId(teamId) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TEAM, teamId);
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
  updateHomeHero();
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
  if (pageName === 'game') renderGamePage();
  if (pageName === 'profile') renderProfilePage();
  if (pageName === 'home') updateHomeHero();
}

// ========== 首页 Hero ==========
async function updateHomeHero() {
  const actions = document.getElementById('homeHeroActions');
  const user = getUser();
  if (user) {
    // 尝试获取活跃小分队名称
    let teamLabel = '小分队';
    const teamId = getActiveTeamId();
    if (teamId) {
      try {
        const res = await fetch('/teams');
        if (res.ok) {
          cachedTeams = await res.json();
          const team = cachedTeams.find(t => t.id === teamId);
          if (team) teamLabel = team.name;
        }
      } catch { /* ignore */ }
    }
    actions.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="text-gray-400 text-sm">${avatarHtml(user.avatar)} ${escapeHtml(user.nickname)}</span>
        <button onclick="navigateTo('teams')" class="px-8 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">进入${escapeHtml(teamLabel)} →</button>
      </div>`;
  } else {
    actions.innerHTML = `
      <button onclick="showLoginModal()" class="px-8 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">开始使用</button>`;
  }
}

function toggleHomeFeatures() {
  const panel = document.getElementById('homeFeaturesPanel');
  const arrow = document.getElementById('homeFeatureArrow');
  const toggle = document.getElementById('homeFeatureToggle');
  if (panel.style.maxHeight && panel.style.maxHeight !== '0px') {
    panel.style.maxHeight = '0px';
    arrow.style.transform = 'rotate(0deg)';
    toggle.querySelector('span').textContent = '探索功能';
  } else {
    panel.style.maxHeight = panel.scrollHeight + 'px';
    arrow.style.transform = 'rotate(180deg)';
    toggle.querySelector('span').textContent = '收起';
  }
}

// ========== 移动端菜单 ==========
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ========== 头像工具 ==========
function avatarHtml(avatar) {
  if (!avatar) return '👤';
  if (avatar.startsWith('data:')) {
    return `<img src="${avatar}" class="w-full h-full object-cover rounded-full" alt="">`;
  }
  return avatar;
}

function resizeAvatarImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
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

  // 上传照片按钮
  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'avatar-option' + (selectedAvatar && selectedAvatar.startsWith('data:') ? ' selected' : '');
  uploadBtn.innerHTML = '📷';
  uploadBtn.title = '从相册选择';
  uploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      resizeAvatarImage(f, (dataUrl) => {
        container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        uploadBtn.classList.add('selected');
        if (onSelect) onSelect(dataUrl);
      });
    };
    input.click();
  });
  container.appendChild(uploadBtn);
}

// ========== 用户状态更新 ==========
function updateUIForUserState() {
  const user = getUser();
  const avatarBtn = document.getElementById('userAvatarBtn');

  if (user) {
    avatarBtn.innerHTML = `<span class="text-xl">${avatarHtml(user.avatar)}</span>`;
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
      updateHomeHero();
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
    updateHomeHero();
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
  updateHomeHero();
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
  profileAvatar.innerHTML = avatarHtml(user.avatar);
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
      `<span class="member-avatar ${AVATAR_COLORS[m.id.charCodeAt(0) % AVATAR_COLORS.length]}" title="${escapeHtml(m.nickname)}">${avatarHtml(m.avatar)}</span>`
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
  setActiveTeamId(teamId);
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

    <!-- Tab 导航 -->
    <div class="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button class="team-tab active" data-teamtab="members" onclick="switchTeamDetailTab('members','${team.id}')">👥 成员</button>
      <button class="team-tab" data-teamtab="photos" onclick="switchTeamDetailTab('photos','${team.id}')">📸 相册</button>
      <button class="team-tab" data-teamtab="itinerary" onclick="switchTeamDetailTab('itinerary','${team.id}')">🗺️ 行程</button>
    </div>

    <!-- 成员 Tab -->
    <div id="teamTabMembers">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
        <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300">成员 (${team.members.length})</h3>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          ${team.members.map(m => {
            const isTeamCreator = m.id === team.creatorId;
            return `
              <div class="flex items-center gap-3 px-5 py-3">
                <span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[m.id.charCodeAt(0) % AVATAR_COLORS.length]}">${avatarHtml(m.avatar)}</span>
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
    </div>

    <!-- 相册 Tab -->
    <div id="teamTabPhotos" class="hidden">
      ${renderTeamPhotos(team)}
    </div>

    <!-- 行程 Tab -->
    <div id="teamTabItinerary" class="hidden">
      ${renderTeamItinerary()}
    </div>
  `;

  navigateTo('team-detail');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

function switchTeamDetailTab(tab, teamId) {
  document.querySelectorAll('.team-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.teamtab === tab);
  });

  const membersEl = document.getElementById('teamTabMembers');
  const photosEl = document.getElementById('teamTabPhotos');
  const itineraryEl = document.getElementById('teamTabItinerary');

  membersEl.classList.toggle('hidden', tab !== 'members');
  photosEl.classList.toggle('hidden', tab !== 'photos');
  itineraryEl.classList.toggle('hidden', tab !== 'itinerary');

  if (tab === 'photos') loadTeamPhotos(teamId);
  if (tab === 'itinerary') loadTeamItinerary(teamId);
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

  // Auto-select active team if no explicit selection
  if (!aaSelectedTeamId) {
    const activeId = getActiveTeamId();
    if (activeId) aaSelectedTeamId = activeId;
  }

  if (aaSelectedTeamId && cachedTeams.some(t => t.id === aaSelectedTeamId)) {
    select.value = aaSelectedTeamId;
    updateAATeamDisplay();
    await loadAAData();
  }
}

function onAATeamChange() {
  aaSelectedTeamId = document.getElementById('aaTeamSelect').value || null;
  updateAATeamDisplay();
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

function updateAATeamDisplay() {
  const el = document.getElementById('aaTeamDisplay');
  if (!el) return;
  const team = cachedTeams.find(t => t.id === aaSelectedTeamId);
  if (team) {
    el.innerHTML = `<span class="font-medium">${escapeHtml(team.name)}</span> <button onclick="showTeamSwitcher('aa')" class="text-xs text-primary-500 hover:underline ml-1">切换</button>`;
  } else {
    el.innerHTML = `<span class="text-gray-400 text-sm">未选择小分队</span>`;
  }
}

function updateGameTeamDisplay() {
  const el = document.getElementById('gameTeamDisplay');
  if (!el) return;
  const team = cachedTeams.find(t => t.id === gameSelectedTeamId);
  if (team) {
    el.innerHTML = `<span class="font-medium">${escapeHtml(team.name)}</span> <button onclick="showTeamSwitcher('game')" class="text-xs text-primary-500 hover:underline ml-1">切换</button>`;
  } else {
    el.innerHTML = `<span class="text-gray-400 text-sm">未选择小分队</span>`;
  }
}

function showTeamSwitcher(context) {
  const modal = document.getElementById('teamSwitcherModal');
  const list = document.getElementById('teamSwitcherList');
  if (!modal || !list) return;
  list.innerHTML = cachedTeams.map(t => `
    <div class="team-card mb-2" onclick="selectTeamSwitch('${context}','${t.id}')">
      <div class="flex items-center justify-between">
        <span class="font-medium">${escapeHtml(t.name)}</span>
        <span class="text-xs text-gray-400">${t.members.length}人</span>
      </div>
    </div>
  `).join('');
  modal.classList.remove('hidden');
}

function closeTeamSwitcher() {
  const modal = document.getElementById('teamSwitcherModal');
  if (modal) modal.classList.add('hidden');
}

function selectTeamSwitch(context, teamId) {
  closeTeamSwitcher();
  if (context === 'aa') {
    document.getElementById('aaTeamSelect').value = teamId;
    onAATeamChange();
  } else if (context === 'game') {
    document.getElementById('gameTeamSelect').value = teamId;
    onGameTeamChange();
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
              ${payer ? (payer.avatar.startsWith('data:') ? '🖼️' : payer.avatar) + ' ' + escapeHtml(payer.nickname) : '未知'} 付款 · 均摊 ${exp.splitAmong.length} 人
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
            <span class="text-lg">${from ? avatarHtml(from.avatar) : '?'}</span>
            <span class="text-sm font-medium">${from ? escapeHtml(from.nickname) : '?'}</span>
            <span class="text-gray-400 text-xs">→</span>
            <span class="text-lg">${to ? avatarHtml(to.avatar) : '?'}</span>
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
    `<option value="${m.id}">${m.avatar.startsWith('data:') ? '🖼️' : m.avatar} ${escapeHtml(m.nickname)}</option>`
  ).join('');

  // 填充分摊人 checkbox
  const splitDiv = document.getElementById('expenseSplitAmong');
  splitDiv.innerHTML = members.map(m =>
    `<label class="member-check" data-uid="${m.id}" onclick="toggleSplitMember(this)">
       <input type="checkbox" class="hidden" checked>
       <span class="text-lg">${avatarHtml(m.avatar)}</span>
       <span class="text-sm font-medium">${escapeHtml(m.nickname)}</span>
       <span class="check-indicator"></span>
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
      <span class="text-3xl">${from ? avatarHtml(from.avatar) : '?'}</span>
      <span class="text-gray-400 text-xl">→</span>
      <span class="text-3xl">${to ? avatarHtml(to.avatar) : '?'}</span>
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

// ========== 在线桌游 ==========

let gameSelectedTeamId = null;
let currentGameId = null;
let currentGameType = null;
let gamePollInterval = null;

const ITI_TYPE_ICONS = { food: '🍔', transport: '🚕', accommodation: '🏨', activity: '🎯', shopping: '🛍️', other: '📌' };

function renderGamePage() {
  const user = getUser();
  const loginPrompt = document.getElementById('gameLoginPrompt');
  const content = document.getElementById('gameContent');

  if (!user) {
    loginPrompt.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  loginPrompt.classList.add('hidden');
  content.classList.remove('hidden');
  populateGameTeamSelect();
}

async function populateGameTeamSelect() {
  const select = document.getElementById('gameTeamSelect');
  const user = getUser();
  if (!user) return;

  try {
    const res = await fetch('/teams');
    if (res.ok) cachedTeams = await res.json();
  } catch { /* use cached */ }

  select.innerHTML = '<option value="">-- 选择小分队 --</option>';
  cachedTeams.forEach(team => {
    const opt = document.createElement('option');
    opt.value = team.id;
    opt.textContent = team.name;
    select.appendChild(opt);
  });

  // Auto-select active team if no explicit selection
  if (!gameSelectedTeamId) {
    const activeId = getActiveTeamId();
    if (activeId) gameSelectedTeamId = activeId;
  }

  if (gameSelectedTeamId && cachedTeams.some(t => t.id === gameSelectedTeamId)) {
    select.value = gameSelectedTeamId;
    updateGameTeamDisplay();
    await loadGameLobby();
  }
}

function onGameTeamChange() {
  gameSelectedTeamId = document.getElementById('gameTeamSelect').value || null;
  updateGameTeamDisplay();
  if (gameSelectedTeamId) {
    loadGameLobby();
  } else {
    document.getElementById('gameLobby').classList.add('hidden');
    document.getElementById('gameRoom').classList.add('hidden');
    stopGamePoll();
  }
}

async function loadGameLobby() {
  if (!gameSelectedTeamId) return;
  stopGamePoll();

  try {
    const [spyRes, cnRes, spRes] = await Promise.all([
      fetch('/games'),
      fetch('/codenames'),
      fetch('/splendor'),
    ]);
    const spyGames = spyRes.ok ? await spyRes.json() : [];
    const cnGames = cnRes.ok ? await cnRes.json() : [];
    const spGames = spRes.ok ? await spRes.json() : [];
    const allGames = [
      ...spyGames.filter(g => g.teamId === gameSelectedTeamId),
      ...cnGames.filter(g => g.teamId === gameSelectedTeamId),
      ...spGames.filter(g => g.teamId === gameSelectedTeamId),
    ];
    renderActiveGames(allGames);
  } catch { /* ignore */ }

  document.getElementById('gameLobby').classList.remove('hidden');
  document.getElementById('gameRoom').classList.add('hidden');
}

function renderActiveGames(games) {
  const user = getUser();
  const listEl = document.getElementById('activeGamesList');
  const emptyEl = document.getElementById('noActiveGames');

  if (games.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  const typeInfo = {
    spy: { icon: '🎭', name: '谁是卧底' },
    codenames: { icon: '🕵️', name: '行动代号' },
    splendor: { icon: '💎', name: '璀璨宝石' },
  };

  emptyEl.classList.add('hidden');
  listEl.innerHTML = games.map(g => {
    const type = g.type || 'spy';
    const info = typeInfo[type] || typeInfo.spy;
    const players = g.players || g.allPlayers || [];
    const inGame = players.some(p => p.id === user.id);
    const phaseMap = {
      lobby: '等待中', setup: '组队中', describing: '描述中', voting: '投票中',
      result: '淘汰结果', 'spymaster-turn': '队长出题', 'operative-turn': '队员猜词',
      playing: '游戏中', ended: '已结束',
    };
    const phaseText = phaseMap[g.phase] || g.phase;
    return `
      <div class="team-card mb-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold">${info.icon} ${info.name}</h3>
          <span class="text-xs px-2 py-0.5 rounded-full ${g.phase === 'lobby' || g.phase === 'setup' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : g.phase === 'ended' ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}">${phaseText}</span>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <div class="flex -space-x-1">
            ${players.slice(0, 5).map(p => `<span class="w-8 h-8 rounded-full flex items-center justify-center text-sm ${AVATAR_COLORS[(p.id || '').charCodeAt(0) % AVATAR_COLORS.length]} border-2 border-white dark:border-gray-800">${avatarHtml(p.avatar)}</span>`).join('')}
          </div>
          <span class="text-sm text-gray-500">${players.length}人</span>
        </div>
        ${inGame
          ? `<button onclick="joinGameRoom('${g.id}','${type}')" class="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">进入游戏</button>`
          : g.phase === 'lobby' || g.phase === 'setup'
            ? `<button onclick="joinExistingGame('${g.id}','${type}')" class="w-full py-2 rounded-lg border-2 border-primary-600 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">加入游戏</button>`
            : `<span class="block text-center text-sm text-gray-400">游戏进行中</span>`
        }
      </div>
    `;
  }).join('');
}

async function createNewGame() {
  if (!gameSelectedTeamId) { showToast('请先选择小分队', 'error'); return; }
  const type = document.getElementById('gameTypeSelect').value;
  const endpoint = type === 'codenames' ? '/codenames' : type === 'splendor' ? '/splendor' : '/games';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: gameSelectedTeamId }),
    });
    if (res.ok) {
      const game = await res.json();
      currentGameType = type;
      await joinGameRoom(game.id, type);
      showToast('游戏已创建！', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '创建失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function joinExistingGame(gameId, type) {
  const endpoint = type === 'codenames' ? '/codenames' : type === 'splendor' ? '/splendor' : '/games';
  try {
    const res = await fetch(`${endpoint}/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      currentGameType = type;
      await joinGameRoom(gameId, type);
    } else {
      const data = await res.json();
      showToast(data.error || '加入失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function joinGameRoom(gameId, type) {
  currentGameId = gameId;
  currentGameType = type || currentGameType;
  document.getElementById('gameLobby').classList.add('hidden');
  document.getElementById('gameRoom').classList.remove('hidden');
  await refreshGameState();
  startGamePoll();
}

function startGamePoll() {
  stopGamePoll();
  gamePollInterval = setInterval(refreshGameState, 2000);
}

function stopGamePoll() {
  if (gamePollInterval) {
    clearInterval(gamePollInterval);
    gamePollInterval = null;
  }
}

async function refreshGameState() {
  if (!currentGameId) return;
  const endpoint = currentGameType === 'codenames' ? '/codenames' : currentGameType === 'splendor' ? '/splendor' : '/games';
  try {
    const res = await fetch(`${endpoint}/${currentGameId}`);
    if (!res.ok) { stopGamePoll(); return; }
    const state = await res.json();
    if (currentGameType === 'codenames') renderCodenamesState(state);
    else if (currentGameType === 'splendor') renderSplendorState(state);
    else renderGameState(state);
  } catch { /* ignore */ }
}

function renderGameState(state) {
  const user = getUser();
  const container = document.getElementById('gameRoomContent');
  const alive = state.players.filter(p => p.alive);
  const me = state.players.find(p => p.id === user.id);
  const myTurn = state.currentDescriber && state.currentDescriber.id === user.id;

  let html = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <button class="back-btn" onclick="exitGameRoom()">←</button>
        <h2 class="text-lg font-bold">🎭 谁是卧底</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">第 ${state.round} 轮</span>
        ${state.myWord ? `<span class="text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">你的词：${escapeHtml(state.myWord)}</span>` : ''}
      </div>
    </div>

    <!-- 玩家列表 -->
    <div class="grid grid-cols-4 gap-2 mb-6">
      ${state.players.map(p => `
        <div class="game-player ${p.alive ? 'alive' : 'eliminated'} ${p.id === user.id ? 'is-me' : ''} relative">
          <span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]}">${avatarHtml(p.avatar)}</span>
          <span class="text-xs font-medium truncate w-full text-center">${escapeHtml(p.nickname)}</span>
          ${p.id === state.hostId ? '<span class="absolute -top-1 -right-1 text-xs">👑</span>' : ''}
          ${!p.alive ? '<span class="absolute inset-0 flex items-center justify-center text-2xl">✕</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;

  if (state.phase === 'lobby') {
    html += `
      <div class="placeholder-card">
        <span class="text-5xl mb-4">🎭</span>
        <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">等待玩家加入</p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">${state.players.length} 人已就绪（至少3人）</p>
        <div class="flex -space-x-2 justify-center mb-4">
          ${state.players.map(p => `<span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]} border-2 border-white dark:border-gray-800">${avatarHtml(p.avatar)}</span>`).join('')}
        </div>
        <div class="flex gap-3 justify-center">
          ${state.isHost ? `<button onclick="startExistingGame()" class="px-8 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors ${state.players.length < 3 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.players.length < 3 ? 'disabled' : ''}>开始游戏</button>` : '<p class="text-sm text-gray-400">等待房主开始游戏…</p>'}
          ${state.isHost ? `<button onclick="dissolveGameRoom()" class="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">解散房间</button>` : ''}
        </div>
      </div>
    `;
  }

  if (state.phase === 'describing') {
    const descriptions = Object.entries(state.descriptions).map(([uid, text]) => {
      const p = state.players.find(pl => pl.id === uid);
      return p ? `<div class="game-desc-bubble"><span class="text-sm font-medium">${p.avatar.startsWith('data:') ? '🖼️' : p.avatar} ${escapeHtml(p.nickname)}：</span><span class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(text)}</span></div>` : '';
    }).join('');

    html += `
      <div class="mb-4">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
          ${state.currentDescriber ? `轮到 ${state.currentDescriber.avatar.startsWith('data:') ? '🖼️' : state.currentDescriber.avatar} ${escapeHtml(state.currentDescriber.nickname)} 描述` : '描述阶段'}
        </h3>
        ${descriptions}
      </div>
      ${me && me.alive && myTurn ? `
        <div class="flex gap-2">
          <input id="descInput" type="text" placeholder="用一句话描述你的词…" maxlength="50"
            class="form-input flex-1" onkeydown="if(event.key==='Enter')submitDesc()">
          <button onclick="submitDesc()" class="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">发送</button>
        </div>
      ` : myTurn ? '' : '<p class="text-sm text-gray-400 text-center">等待其他玩家描述…</p>'}
    `;
  }

  if (state.phase === 'voting') {
    const hasVoted = false; // We don't expose individual votes, so check locally
    html += `
      <div class="mb-4">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">投票阶段 — 选择你认为是卧底的人</h3>
        <p class="text-xs text-gray-400 mb-3">${state.votedCount || 0}/${state.totalVoters || alive.length} 人已投票</p>
        <div class="space-y-2">
          ${alive.filter(p => p.id !== user.id).map(p => `
            <button class="game-vote-btn" onclick="submitVote('${p.id}')">
              <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg ${AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]}">${avatarHtml(p.avatar)}</span>
              <span class="font-medium">${escapeHtml(p.nickname)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (state.phase === 'result') {
    const eliminated = state.players.find(p => p.id === state.eliminatedPlayerId);
    const isSpy = eliminated && eliminated.id === state.spyId;
    html += `
      <div class="text-center py-6">
        <span class="text-5xl mb-3 block">${isSpy ? '🎉' : '💀'}</span>
        <h3 class="text-lg font-bold mb-1">${eliminated ? `${eliminated.avatar.startsWith('data:') ? '🖼️' : eliminated.avatar} ${escapeHtml(eliminated.nickname)} 被淘汰` : '淘汰结果'}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${isSpy ? '淘汰的是卧底！好人阵营得分！' : '淘汰的是平民…卧底还在潜伏！'}</p>
        ${state.isHost ? `<button onclick="goNextRound()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">下一轮</button>` : '<p class="text-sm text-gray-400">等待房主开启下一轮…</p>'}
      </div>
    `;
  }

  if (state.phase === 'ended') {
    if (state.dissolved) {
      html += `
        <div class="text-center py-6">
          <span class="text-6xl mb-4 block">🚪</span>
          <h2 class="text-xl font-bold mb-2">房间已被房主解散</h2>
          <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
        </div>
      `;
    } else {
    const spy = state.players.find(p => p.id === state.spyId);
    const isWin = state.winner === 'civilian';
    html += `
      <div class="text-center py-6">
        <span class="text-6xl mb-4 block">${isWin ? '🎊' : '🎭'}</span>
        <h2 class="text-xl font-bold mb-2">${isWin ? '好人阵营胜利！' : '卧底胜利！'}</h2>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4 inline-block">
          <p class="text-sm text-gray-500 dark:text-gray-400">卧底是</p>
          <p class="text-lg font-bold mt-1">${spy ? `${spy.avatar.startsWith('data:') ? '🖼️' : spy.avatar} ${escapeHtml(spy.nickname)}` : '未知'}</p>
          <p class="text-sm mt-2">
            <span class="text-gray-500">平民词：</span><span class="font-medium">${escapeHtml(state.civilianWord || '')}</span>
            <span class="mx-2">|</span>
            <span class="text-gray-500">卧底词：</span><span class="font-medium">${escapeHtml(state.spyWord || '')}</span>
          </p>
        </div>
        <div>
          <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
        </div>
      </div>
    `;
    }
  }

  container.innerHTML = html;
}

async function startExistingGame() {
  try {
    const res = await fetch(`/games/${currentGameId}/start`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '开始失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function submitDesc() {
  const input = document.getElementById('descInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) { showToast('请输入描述', 'error'); return; }
  try {
    const res = await fetch(`/games/${currentGameId}/describe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '提交失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function submitVote(targetId) {
  try {
    const res = await fetch(`/games/${currentGameId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    });
    if (res.ok) {
      showToast('投票成功', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '投票失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function goNextRound() {
  try {
    const res = await fetch(`/games/${currentGameId}/next-round`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

function exitGameRoom() {
  stopGamePoll();
  currentGameId = null;
  currentGameType = null;
  loadGameLobby();
}

async function dissolveGameRoom() {
  if (!confirm('确定要解散房间吗？其他玩家将无法继续游戏。')) return;
  const endpoint = currentGameType === 'codenames' ? '/codenames' : currentGameType === 'splendor' ? '/splendor' : '/games';
  try {
    const res = await fetch(`${endpoint}/${currentGameId}/dissolve`, { method: 'POST' });
    if (res.ok) {
      showToast('房间已解散', 'info');
      exitGameRoom();
    } else {
      const data = await res.json();
      showToast(data.error || '解散失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

// ========== 行动代号渲染 ==========
async function cnSetRole(team, role) {
  try {
    const res = await fetch(`/codenames/${currentGameId}/set-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, role }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function cnGiveClue() {
  const word = document.getElementById('cnClueWord').value.trim();
  const count = document.getElementById('cnClueCount').value;
  if (!word) { showToast('请输入线索词', 'error'); return; }
  try {
    const res = await fetch(`/codenames/${currentGameId}/clue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, count: parseInt(count) }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '给线索失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function cnGuessCard(index) {
  try {
    const res = await fetch(`/codenames/${currentGameId}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIndex: index }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '猜词失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function cnEndTurn() {
  try {
    const res = await fetch(`/codenames/${currentGameId}/end-turn`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function cnStartGame() {
  try {
    const res = await fetch(`/codenames/${currentGameId}/start`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '开始失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

function renderCodenamesState(state) {
  const user = getUser();
  const container = document.getElementById('gameRoomContent');
  const colorLabels = { red: '红队', blue: '蓝队', neutral: '中立', assassin: '刺客' };
  const colorClasses = {
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
    neutral: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
    assassin: 'bg-gray-900 text-white',
  };

  let html = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <button class="back-btn" onclick="exitGameRoom()">←</button>
        <h2 class="text-lg font-bold">🕵️ 行动代号</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">红 ${state.scores.red}</span>
        <span class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">蓝 ${state.scores.blue}</span>
        ${state.currentTurn ? `<span class="text-xs px-2 py-1 rounded-full ${state.currentTurn === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}">${state.currentTurn === 'red' ? '红方' : '蓝方'}回合</span>` : ''}
      </div>
    </div>
  `;

  if (state.phase === 'setup') {
    const myPlayer = state.allPlayers.find(p => p.id === user.id);
    const myTeam = myPlayer ? myPlayer.team : null;
    const redPlayers = state.allPlayers.filter(p => p.team === 'red');
    const bluePlayers = state.allPlayers.filter(p => p.team === 'blue');
    const redSm = state.redTeam.spymaster;
    const blueSm = state.blueTeam.spymaster;

    html += `
      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- Red team -->
        <div class="cn-team-panel rounded-xl p-4 border-2 ${myTeam === 'red' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}">
          <h3 class="font-bold text-red-600 dark:text-red-400 mb-2">🔴 红队 (${redPlayers.length}人)</h3>
          <div class="space-y-1 mb-3">
            ${redPlayers.map(p => `<div class="text-sm flex items-center gap-1"><span>${avatarHtml(p.avatar)}</span><span>${escapeHtml(p.nickname)}</span>${state.redTeam.spymaster === p.id ? '<span class="text-xs bg-red-200 dark:bg-red-800 px-1 rounded">队长</span>' : ''}</div>`).join('')}
          </div>
          ${myTeam !== 'red' ? `<button onclick="cnSetRole('red','operative')" class="w-full py-1.5 rounded-lg border border-red-400 text-red-500 text-xs hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">加入红队</button>` : ''}
        </div>
        <!-- Blue team -->
        <div class="cn-team-panel rounded-xl p-4 border-2 ${myTeam === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}">
          <h3 class="font-bold text-blue-600 dark:text-blue-400 mb-2">🔵 蓝队 (${bluePlayers.length}人)</h3>
          <div class="space-y-1 mb-3">
            ${bluePlayers.map(p => `<div class="text-sm flex items-center gap-1"><span>${avatarHtml(p.avatar)}</span><span>${escapeHtml(p.nickname)}</span>${state.blueTeam.spymaster === p.id ? '<span class="text-xs bg-blue-200 dark:bg-blue-800 px-1 rounded">队长</span>' : ''}</div>`).join('')}
          </div>
          ${myTeam !== 'blue' ? `<button onclick="cnSetRole('blue','operative')" class="w-full py-1.5 rounded-lg border border-blue-400 text-blue-500 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">加入蓝队</button>` : ''}
        </div>
      </div>
      ${myTeam ? `
        <div class="text-center mb-3">
          ${!state[myTeam + 'Team'].spymaster || state[myTeam + 'Team'].spymaster !== user.id
            ? `<button onclick="cnSetRole('${myTeam}','spymaster')" class="px-4 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">成为队长🕵️</button>`
            : `<span class="text-sm text-yellow-600 dark:text-yellow-400">你是队长🕵️</span>`
          }
        </div>
      ` : ''}
      <div class="text-center text-sm text-gray-400 mb-3">${state.allPlayers.length}人已加入</div>
      ${state.isHost ? `
        <div class="text-center">
          <div class="flex gap-3 justify-center">
            <button onclick="cnStartGame()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors ${redSm && blueSm && redPlayers.length >= 2 && bluePlayers.length >= 2 ? '' : 'opacity-50 cursor-not-allowed'}" ${redSm && blueSm && redPlayers.length >= 2 && bluePlayers.length >= 2 ? '' : 'disabled'}>开始游戏</button>
            <button onclick="dissolveGameRoom()" class="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">解散房间</button>
          </div>
          <p class="text-xs text-gray-400 mt-2">需要每队至少1名队长+1名队员</p>
        </div>
      ` : '<p class="text-center text-sm text-gray-400">等待房主开始游戏…</p>'}
    `;
  } else if (state.phase === 'ended') {
    if (state.dissolved) {
      html += `
        <div class="text-center py-6">
          <span class="text-6xl mb-4 block">🚪</span>
          <h2 class="text-xl font-bold mb-2">房间已被房主解散</h2>
          <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
        </div>
      `;
    } else {
    const winnerText = state.winner === 'red' ? '红队胜利！' : '蓝队胜利！';
    html += `
      <div class="text-center py-6">
        <span class="text-6xl mb-4 block">🏆</span>
        <h2 class="text-xl font-bold mb-4 ${state.winner === 'red' ? 'text-red-600' : 'text-blue-600'}">${winnerText}</h2>
        <!-- Show full grid -->
        <div class="cn-grid mb-4">
          ${state.grid.map((card, i) => `
            <div class="cn-card revealed ${card.color === 'red' ? 'cn-red' : card.color === 'blue' ? 'cn-blue' : card.color === 'assassin' ? 'cn-assassin' : 'cn-neutral'}">
              <span class="cn-word">${escapeHtml(card.word)}</span>
            </div>
          `).join('')}
        </div>
        <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
      </div>
    `;
    }
  } else {
    // Spymaster-turn or operative-turn
    const isMyTeam = state.myTeam === state.currentTurn;
    const amSpymaster = state.isSpymaster;
    const amOperative = state.myTeam === state.currentTurn && !state.isSpymaster;

    // Clue area
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 mb-4">
        ${state.clue
          ? `<div class="text-center"><span class="text-lg font-bold">线索：</span><span class="text-2xl font-bold text-primary-600 dark:text-primary-400">${escapeHtml(state.clue.word)}</span> <span class="text-lg text-gray-500">(${state.clue.count})</span><span class="text-sm text-gray-400 ml-2">剩余 ${state.remainingGuesses} 次</span></div>`
          : '<div class="text-center text-sm text-gray-400">等待队长给出线索…</div>'
        }
      </div>
    `;

    // Grid
    html += `<div class="cn-grid mb-4">`;
    state.grid.forEach((card, i) => {
      const showColor = card.revealed || amSpymaster;
      let colorClass = 'cn-hidden';
      if (card.revealed) {
        colorClass = card.color === 'red' ? 'cn-red' : card.color === 'blue' ? 'cn-blue' : card.color === 'assassin' ? 'cn-assassin' : 'cn-neutral';
      } else if (amSpymaster) {
        colorClass = card.color === 'red' ? 'cn-red cn-dimmed' : card.color === 'blue' ? 'cn-blue cn-dimmed' : card.color === 'assassin' ? 'cn-assassin cn-dimmed' : 'cn-neutral cn-dimmed';
      }

      const canGuess = state.phase === 'operative-turn' && amOperative && !card.revealed && state.remainingGuesses > 0;

      html += `<div class="cn-card ${colorClass} ${card.revealed ? 'revealed' : ''} ${canGuess ? 'cn-guessable' : ''}" ${canGuess ? `onclick="cnGuessCard(${i})"` : ''}>
        <span class="cn-word">${escapeHtml(card.word)}</span>
      </div>`;
    });
    html += `</div>`;

    // Spymaster clue input
    if (state.phase === 'spymaster-turn' && amSpymaster && isMyTeam) {
      html += `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p class="text-sm font-medium mb-2">给出线索词和数量</p>
          <div class="flex gap-2">
            <input id="cnClueWord" type="text" placeholder="线索词" maxlength="10" class="form-input flex-1" onkeydown="if(event.key==='Enter')cnGiveClue()">
            <input id="cnClueCount" type="number" min="0" max="9" value="1" class="form-input w-16 text-center">
            <button onclick="cnGiveClue()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">发送</button>
          </div>
        </div>
      `;
    }

    // Operative end turn button
    if (state.phase === 'operative-turn' && amOperative && state.remainingGuesses > 0) {
      html += `
        <div class="text-center mt-3">
          <button onclick="cnEndTurn()" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">结束猜测</button>
        </div>
      `;
    }

    // Log
    if (state.log && state.log.length > 0) {
      html += `<div class="mt-4"><h4 class="text-xs font-semibold text-gray-400 mb-2">历史记录</h4>`;
      state.log.forEach(entry => {
        html += `<div class="text-xs text-gray-500 mb-1">${entry.team === 'red' ? '红' : '蓝'}方线索: ${escapeHtml(entry.clue.word)}(${entry.clue.count}) → ${(entry.guesses || []).map(g => g.word).join(', ') || '无'}</div>`;
      });
      html += `</div>`;
    }
  }

  container.innerHTML = html;
}

// ========== 璀璨宝石渲染 ==========
const GEM_COLORS = { white: '⚪', blue: '🔵', green: '🟢', red: '🔴', black: '⚫', gold: '🟡' };
const GEM_CSS = { white: 'bg-gray-100 dark:bg-gray-300 text-gray-800', blue: 'bg-blue-400 text-white', green: 'bg-green-500 text-white', red: 'bg-red-500 text-white', black: 'bg-gray-800 text-white', gold: 'bg-yellow-400 text-gray-800' };
const CARD_COLORS = { white: 'border-gray-300', blue: 'border-blue-400', green: 'border-green-400', red: 'border-red-400', black: 'border-gray-700' };
const CARD_BANNER_BG = { white: '#d1d5db', blue: '#3b82f6', green: '#22c55e', red: '#ef4444', black: '#1f2937' };
const CARD_BANNER_TEXT = { white: '#1f2937', blue: '#fff', green: '#fff', red: '#fff', black: '#fff' };
const GEM_DOT_BG = { white: '#d1d5db', blue: '#3b82f6', green: '#22c55e', red: '#ef4444', black: '#1f2937' };
const GEM_DOT_TEXT = { white: '#1f2937', blue: '#fff', green: '#fff', red: '#fff', black: '#fff' };

async function spStartGame() {
  try {
    const res = await fetch(`/splendor/${currentGameId}/start`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '开始失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function spTakeGems(gems) {
  try {
    const res = await fetch(`/splendor/${currentGameId}/take-gems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gems }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function spReserveCard(source, level, index) {
  try {
    const res = await fetch(`/splendor/${currentGameId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, cardIndex: { level, index } }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function spBuyCard(source, cardId) {
  try {
    const res = await fetch(`/splendor/${currentGameId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, cardId }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '购买失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

let spGemSelection = {};

function spToggleGem(color) {
  if (color === 'gold') return;
  if (!spGemSelection[color]) spGemSelection[color] = 0;
  spGemSelection[color]++;
  // Cap at 2 for same color, 1 for different colors
  const colors = Object.keys(spGemSelection).filter(c => spGemSelection[c] > 0);
  if (colors.length > 3) {
    spGemSelection = {};
    spGemSelection[color] = 1;
  }
  renderSpGemSelector();
}

function spClearGems() {
  spGemSelection = {};
  renderSpGemSelector();
}

function renderSpGemSelector() {
  const el = document.getElementById('spGemSelector');
  if (!el) return;
  const gemColors = ['white', 'blue', 'green', 'red', 'black'];
  el.innerHTML = `
    <div class="flex gap-2 flex-wrap items-center">
      ${gemColors.map(c => `<button onclick="spToggleGem('${c}')" class="spl-gem-btn px-3 py-1.5 rounded-full text-sm font-bold ${GEM_CSS[c]} ${spGemSelection[c] ? 'ring-2 ring-primary-400' : ''}">${GEM_COLORS[c]} ×${spGemSelection[c] || 0}</button>`).join('')}
      <button onclick="spClearGems()" class="text-xs text-gray-400 hover:underline ml-2">清除</button>
    </div>
  `;
}

function spConfirmTakeGems() {
  const filtered = {};
  for (const [c, n] of Object.entries(spGemSelection)) {
    if (n > 0) filtered[c] = n;
  }
  if (Object.keys(filtered).length === 0) { showToast('请选择宝石', 'error'); return; }
  spTakeGems(filtered);
  spGemSelection = {};
}

function renderSplendorState(state) {
  const user = getUser();
  const container = document.getElementById('gameRoomContent');
  const myIndex = state.players.findIndex(p => p.id === user.id);
  const isMyTurn = state.currentPlayerIndex === myIndex;

  let html = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <button class="back-btn" onclick="exitGameRoom()">←</button>
        <h2 class="text-lg font-bold">💎 璀璨宝石</h2>
      </div>
      <div class="flex items-center gap-2">
        ${state.phase === 'playing' ? `<span class="text-xs px-2 py-1 rounded-full ${isMyTurn ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}">${isMyTurn ? '你的回合' : `${state.players[state.currentPlayerIndex].nickname}的回合`}</span>` : ''}
      </div>
    </div>
  `;

  if (state.phase === 'lobby') {
    html += `
      <div class="placeholder-card">
        <span class="text-5xl mb-4">💎</span>
        <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">等待玩家加入</p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">${state.players.length} 人已就绪（2-4人）</p>
        <div class="flex -space-x-2 justify-center mb-4">
          ${state.players.map(p => `<span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]} border-2 border-white dark:border-gray-800">${avatarHtml(p.avatar)}</span>`).join('')}
        </div>
        <div class="flex gap-3 justify-center">
          ${state.isHost ? `<button onclick="spStartGame()" class="px-8 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors ${state.players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.players.length < 2 ? 'disabled' : ''}>开始游戏</button>` : '<p class="text-sm text-gray-400">等待房主开始游戏…</p>'}
          ${state.isHost ? `<button onclick="dissolveGameRoom()" class="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">解散房间</button>` : ''}
        </div>
      </div>
    `;
  } else if (state.phase === 'ended') {
    if (state.dissolved) {
      html += `
        <div class="text-center py-6">
          <span class="text-6xl mb-4 block">🚪</span>
          <h2 class="text-xl font-bold mb-2">房间已被房主解散</h2>
          <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
        </div>
      `;
    } else {
    const winner = state.players.find(p => p.id === state.winner) || state.players[0];
    html += `
      <div class="text-center py-6">
        <span class="text-6xl mb-4 block">🏆</span>
        <h2 class="text-xl font-bold mb-4">游戏结束！${winner ? `${winner.avatar.startsWith('data:') ? '🖼️' : winner.avatar} ${escapeHtml(winner.nickname)} 获胜！` : ''}</h2>
        <div class="space-y-2 mb-6">
          ${state.players.sort((a, b) => b.points - a.points).map(p => `
            <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span>${p.avatar.startsWith('data:') ? '🖼️' : p.avatar} ${escapeHtml(p.nickname)}</span>
              <span class="font-bold">${p.points} 分</span>
            </div>
          `).join('')}
        </div>
        <button onclick="exitGameRoom()" class="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">返回大厅</button>
      </div>
    `;
    }
  } else if (state.phase === 'playing') {
    // Nobles
    html += `<div class="flex gap-2 mb-3 overflow-x-auto pb-1">`;
    html += `<span class="text-xs text-gray-400 self-center mr-1">贵族:</span>`;
    (state.nobles || []).forEach(noble => {
      const reqHtml = Object.entries(noble.requirement).map(([c, n]) =>
        `<span class="spl-cost-gem"><span class="spl-cost-dot" style="background:${GEM_DOT_BG[c]};color:${GEM_DOT_TEXT[c]}">${n}</span></span>`
      ).join('');
      html += `<div class="spl-noble shrink-0">
        <div class="text-center"><span class="text-lg">👑</span><span class="text-xs font-bold">${noble.points}分</span></div>
        <div class="text-xs">${reqHtml}</div>
      </div>`;
    });
    html += `</div>`;

    // Card table
    for (const level of ['level3', 'level2', 'level1']) {
      const cards = state.table[level] || [];
      const label = level === 'level1' ? 'I' : level === 'level2' ? 'II' : 'III';
      html += `<div class="mb-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-gray-400">等级 ${label}</span>
          <span class="text-xs text-gray-300">(${state.decks[level]?.length || 0}张剩余)</span>
          ${isMyTurn && state.decks[level]?.length > 0 ? `<button onclick="spReserveCard('deck','${level}',0)" class="text-xs text-primary-500 hover:underline">盲抽</button>` : ''}
        </div>
        <div class="flex gap-2 overflow-x-auto pb-1">`;
      cards.forEach((card, idx) => {
        const canBuy = isMyTurn && canAffordCard(card, state.players[myIndex]);
        const costHtml = Object.entries(card.cost || {}).map(([c, n]) =>
          `<span class="spl-cost-gem"><span class="spl-cost-dot" style="background:${GEM_DOT_BG[c]};color:${GEM_DOT_TEXT[c]}">${n}</span></span>`
        ).join('');
        html += `<div class="spl-card ${CARD_COLORS[card.color] || ''} shrink-0">
          <div class="spl-card-banner" style="background:${CARD_BANNER_BG[card.color] || '#d1d5db'};color:${CARD_BANNER_TEXT[card.color] || '#1f2937'}">
            ${card.points > 0 ? `<span class="spl-card-points">${card.points}</span>` : '<span></span>'}
            <span class="spl-card-reward" style="background:${CARD_BANNER_BG[card.color]}"></span>
          </div>
          <div class="spl-card-body">
            <div class="mb-1.5">${costHtml}</div>
            ${isMyTurn ? `<div class="flex gap-1"><button onclick="spBuyCard('table','${card.id}')" class="text-xs px-1.5 py-0.5 rounded ${canBuy ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'}" ${canBuy ? '' : 'disabled'}>买</button><button onclick="spReserveCard('table','${level}',${idx})" class="text-xs px-1.5 py-0.5 rounded bg-yellow-500 text-white hover:bg-yellow-600">留</button></div>` : ''}
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // My reserved cards
    const me = state.players[myIndex];
    if (me.reservedCards && me.reservedCards.length > 0) {
      html += `<div class="mb-3"><span class="text-xs font-bold text-gray-400 mb-1 block">我的预留卡</span><div class="flex gap-2 overflow-x-auto">`;
      me.reservedCards.forEach(card => {
        const canBuy = isMyTurn && canAffordCard(card, me);
        const costHtml = Object.entries(card.cost || {}).map(([c, n]) =>
          `<span class="spl-cost-gem"><span class="spl-cost-dot" style="background:${GEM_DOT_BG[c]};color:${GEM_DOT_TEXT[c]}">${n}</span></span>`
        ).join('');
        html += `<div class="spl-card border-yellow-400 shrink-0">
          <div class="spl-card-banner" style="background:${CARD_BANNER_BG[card.color] || '#d1d5db'};color:${CARD_BANNER_TEXT[card.color] || '#1f2937'}">
            ${card.points > 0 ? `<span class="spl-card-points">${card.points}</span>` : '<span></span>'}
            <span class="spl-card-reward" style="background:${CARD_BANNER_BG[card.color]}"></span>
          </div>
          <div class="spl-card-body">
            <div class="mb-1.5">${costHtml}</div>
            ${isMyTurn && canBuy ? `<button onclick="spBuyCard('reserved','${card.id}')" class="text-xs px-1.5 py-0.5 rounded bg-primary-600 text-white hover:bg-primary-700">购买</button>` : ''}
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Bank + take gems
    if (isMyTurn) {
      html += `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 mb-3">
          <p class="text-xs font-bold text-gray-400 mb-2">银行</p>
          <div class="flex gap-2 flex-wrap mb-2">
            ${['white','blue','green','red','black','gold'].map(c => `<span class="spl-gem ${GEM_CSS[c]} text-xs font-bold px-2 py-1 rounded-full">${GEM_COLORS[c]} ${state.bank[c]}</span>`).join('')}
          </div>
          <div id="spGemSelector" class="mb-2"></div>
          <button onclick="spConfirmTakeGems()" class="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">拿宝石</button>
        </div>
      `;
    }

    // Players
    html += `<div class="space-y-2">`;
    state.players.forEach((p, idx) => {
      const isMe = p.id === user.id;
      const isCurrent = idx === state.currentPlayerIndex;
      html += `
        <div class="flex items-center gap-3 p-3 rounded-xl border-2 ${isMe ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'} ${isCurrent ? 'ring-2 ring-yellow-400' : ''}">
          <div class="flex flex-col items-center gap-1">
            <span class="w-10 h-10 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]}">${avatarHtml(p.avatar)}</span>
            <span class="text-xs font-medium truncate max-w-[4rem]">${escapeHtml(p.nickname)}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg font-bold">${p.points}分</span>
              ${p.nobles && p.nobles.length > 0 ? `<span class="text-xs text-yellow-600">👑×${p.nobles.length}</span>` : ''}
            </div>
            <div class="flex gap-1 flex-wrap mb-1">
              ${Object.entries(p.bonuses).filter(([,v]) => v > 0).map(([c, n]) => `<span class="text-xs ${GEM_CSS[c]} px-1.5 py-0.5 rounded-full">${GEM_COLORS[c]}+${n}</span>`).join('')}
            </div>
            <div class="flex gap-1 flex-wrap">
              ${Object.entries(p.gems).filter(([,v]) => v > 0).map(([c, n]) => `<span class="text-xs ${GEM_CSS[c]} px-1.5 py-0.5 rounded-full">${GEM_COLORS[c]}${n}</span>`).join('')}
            </div>
          </div>
          <div class="text-right text-xs text-gray-400">
            <div>卡牌: ${p.cards.length}</div>
            <div>预留: ${p.reservedCards ? p.reservedCards.length : p.reserved.length}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  // Initialize gem selector
  if (state.phase === 'playing') renderSpGemSelector();
}

function canAffordCard(card, player) {
  const colors = ['white', 'blue', 'green', 'red', 'black'];
  let goldNeeded = 0;
  for (const c of colors) {
    const cost = card.cost[c] || 0;
    const bonus = player.bonuses[c] || 0;
    const actual = Math.max(0, cost - bonus);
    if (actual > 0) {
      if (player.gems[c] >= actual) {
        // ok
      } else {
        goldNeeded += actual - player.gems[c];
      }
    }
  }
  return goldNeeded <= (player.gems.gold || 0);
}

// ========== 旅行相册 ==========

let photoDetailTeamId = null;

function navigateToAlbum() {
  const user = getUser();
  if (!user) { showLoginModal(); return; }
  const teamId = getActiveTeamId();
  if (teamId) {
    showTeamDetail(teamId);
    setTimeout(() => switchTeamDetailTab('album', teamId), 100);
  } else {
    navigateTo('teams');
    showToast('请先创建或加入一个小分队', 'info');
  }
}

function renderTeamPhotos(team) {
  const user = getUser();
  return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-700 dark:text-gray-300">照片墙</h3>
      <button onclick="showUploadPhotoModal()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">+ 上传照片</button>
    </div>
    <div id="photoGrid" class="photo-grid">
      <div class="col-span-full text-center py-8 text-gray-400">
        <p>加载中…</p>
      </div>
    </div>
  `;
}

async function loadTeamPhotos(teamId) {
  photoDetailTeamId = teamId;
  try {
    const res = await fetch(`/photos/${teamId}`);
    if (!res.ok) return;
    const photos = await res.json();
    renderPhotoGrid(photos);
  } catch { /* ignore */ }
}

function renderPhotoGrid(photos) {
  const grid = document.getElementById('photoGrid');
  if (!grid) return;
  const user = getUser();

  if (photos.length === 0) {
    grid.innerHTML = '<div class="col-span-full"><div class="placeholder-card"><span class="text-5xl mb-4">📷</span><p class="text-gray-400 text-lg">还没有照片</p><p class="text-gray-400 text-sm mt-1">上传第一张旅行照片吧</p></div></div>';
    return;
  }

  grid.innerHTML = photos.map(p => `
    <div class="photo-item" onclick="openLightbox('/photos/file/${p.filename}','${escapeHtml(p.caption || p.uploaderNickname)}')">
      <img src="/photos/file/${p.filename}" alt="${escapeHtml(p.caption || '照片')}" loading="lazy">
      <div class="photo-overlay">
        <div class="text-white text-xs w-full">
          <p class="truncate">${escapeHtml(p.caption || '')}</p>
          <p class="opacity-70">${p.uploaderNickname} · ${new Date(p.createdAt).toLocaleDateString()}</p>
          ${user && user.id === p.uploaderId ? `<button onclick="event.stopPropagation();deletePhotoItem('${p.id}')" class="text-red-300 hover:text-red-200 text-xs mt-1">删除</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function showUploadPhotoModal() {
  if (!photoDetailTeamId) return;
  document.getElementById('uploadPhotoModal').classList.remove('hidden');
  document.getElementById('photoFileInput').value = '';
  document.getElementById('photoCaption').value = '';
  document.getElementById('photoPreviewContainer').classList.add('hidden');
}

function closeUploadPhotoModal() {
  document.getElementById('uploadPhotoModal').classList.add('hidden');
}

function previewPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('photoPreview').src = e.target.result;
    document.getElementById('photoPreviewContainer').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function uploadPhoto() {
  const fileInput = document.getElementById('photoFileInput');
  const file = fileInput.files[0];
  if (!file) { showToast('请选择照片', 'error'); return; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    const caption = document.getElementById('photoCaption').value.trim();

    try {
      const res = await fetch('/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: photoDetailTeamId, base64, caption }),
      });
      if (res.ok) {
        closeUploadPhotoModal();
        loadTeamPhotos(photoDetailTeamId);
        showToast('照片已上传', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || '上传失败', 'error');
      }
    } catch { showToast('网络错误', 'error'); }
  };
  reader.readAsDataURL(file);
}

async function deletePhotoItem(photoId) {
  if (!confirm('确定要删除这张照片吗？')) return;
  try {
    const res = await fetch(`/photos/${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      loadTeamPhotos(photoDetailTeamId);
      showToast('照片已删除', 'info');
    } else {
      showToast('删除失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

function openLightbox(src, caption) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption;
  document.getElementById('lightboxModal').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightboxModal').classList.add('hidden');
}

// ========== 行程共享 ==========

let itineraryDetailTeamId = null;
let editingItiId = null;

function renderTeamItinerary() {
  return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-700 dark:text-gray-300">行程安排</h3>
      <button onclick="showItineraryModal()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">+ 添加行程</button>
    </div>
    <div id="itineraryList">
      <div class="text-center py-8 text-gray-400"><p>加载中…</p></div>
    </div>
  `;
}

async function loadTeamItinerary(teamId) {
  itineraryDetailTeamId = teamId;
  try {
    const res = await fetch(`/itinerary/${teamId}`);
    if (!res.ok) return;
    const items = await res.json();
    renderItineraryList(items);
  } catch { /* ignore */ }
}

function renderItineraryList(items) {
  const listEl = document.getElementById('itineraryList');
  if (!listEl) return;
  const user = getUser();

  if (items.length === 0) {
    listEl.innerHTML = '<div class="placeholder-card"><span class="text-5xl mb-4">🗺️</span><p class="text-gray-400 text-lg">暂无行程安排</p><p class="text-gray-400 text-sm mt-1">添加第一项行程吧</p></div>';
    return;
  }

  // 按日期分组
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  const today = new Date().toISOString().slice(0, 10);

  listEl.innerHTML = Object.entries(grouped).map(([date, dateItems]) => {
    const d = new Date(date);
    const isToday = date === today;
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `
      <div class="itinerary-date-header">${d.getMonth() + 1}月${d.getDate()}日 周${weekday} ${isToday ? '<span class="text-xs ml-1 text-green-500">今天</span>' : ''}</div>
      ${dateItems.map(item => `
        <div class="itinerary-item mb-2">
          <div class="flex items-start gap-3">
            <div class="itinerary-type-icon">${ITI_TYPE_ICONS[item.type] || '📌'}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">${item.time ? '<span class="text-primary-500 mr-1">' + item.time + '</span>' : ''}${escapeHtml(item.title)}</h4>
                ${user && user.id === item.creatorId ? `
                  <div class="flex gap-2 shrink-0 ml-2">
                    <button onclick="editItineraryItem('${item.id}')" class="text-xs text-gray-400 hover:text-primary-500">编辑</button>
                    <button onclick="deleteItineraryItemById('${item.id}')" class="text-xs text-gray-400 hover:text-red-500">删除</button>
                  </div>
                ` : ''}
              </div>
              ${item.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${escapeHtml(item.description)}</p>` : ''}
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${item.creatorNickname}</p>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }).join('');
}

function showItineraryModal(item) {
  editingItiId = item ? item.id : null;
  const title = document.getElementById('itineraryModalTitle');
  const deleteBtn = document.getElementById('itiDeleteBtn');

  if (item) {
    title.textContent = '编辑行程';
    deleteBtn.classList.remove('hidden');
    document.getElementById('itiDate').value = item.date;
    document.getElementById('itiTime').value = item.time || '';
    document.getElementById('itiTitle').value = item.title;
    document.getElementById('itiType').value = item.type;
    document.getElementById('itiDesc').value = item.description || '';
  } else {
    title.textContent = '添加行程';
    deleteBtn.classList.add('hidden');
    document.getElementById('itiDate').value = '';
    document.getElementById('itiTime').value = '';
    document.getElementById('itiTitle').value = '';
    document.getElementById('itiType').value = 'activity';
    document.getElementById('itiDesc').value = '';
  }

  document.getElementById('itineraryModal').classList.remove('hidden');
}

function closeItineraryModal() {
  document.getElementById('itineraryModal').classList.add('hidden');
  editingItiId = null;
}

async function saveItineraryItem() {
  const date = document.getElementById('itiDate').value;
  const time = document.getElementById('itiTime').value;
  const title = document.getElementById('itiTitle').value.trim();
  const type = document.getElementById('itiType').value;
  const description = document.getElementById('itiDesc').value.trim();

  if (!date || !title) { showToast('请填写日期和标题', 'error'); return; }

  const body = { teamId: itineraryDetailTeamId, date, time, title, type, description };

  try {
    let res;
    if (editingItiId) {
      res = await fetch(`/itinerary/${editingItiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch('/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (res.ok) {
      closeItineraryModal();
      loadTeamItinerary(itineraryDetailTeamId);
      showToast(editingItiId ? '行程已更新' : '行程已添加', 'success');
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch { showToast('网络错误', 'error'); }
}

async function deleteItineraryItem() {
  if (!editingItiId || !confirm('确定要删除此行程吗？')) return;
  try {
    const res = await fetch(`/itinerary/${editingItiId}`, { method: 'DELETE' });
    if (res.ok) {
      closeItineraryModal();
      loadTeamItinerary(itineraryDetailTeamId);
      showToast('行程已删除', 'info');
    } else { showToast('删除失败', 'error'); }
  } catch { showToast('网络错误', 'error'); }
}

async function editItineraryItem(itemId) {
  try {
    const res = await fetch(`/itinerary/${itineraryDetailTeamId}`);
    if (!res.ok) return;
    const items = await res.json();
    const item = items.find(i => i.id === itemId);
    if (item) showItineraryModal(item);
  } catch { /* ignore */ }
}

async function deleteItineraryItemById(itemId) {
  if (!confirm('确定要删除此行程吗？')) return;
  try {
    const res = await fetch(`/itinerary/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      loadTeamItinerary(itineraryDetailTeamId);
      showToast('行程已删除', 'info');
    } else { showToast('删除失败', 'error'); }
  } catch { showToast('网络错误', 'error'); }
}

// ========== PWA 安装 ==========
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // 显示安装按钮
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.classList.remove('hidden');
});

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') showToast('已添加到主屏幕！', 'success');
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.classList.add('hidden');
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.classList.add('hidden');
  showToast('应用已安装', 'success');
});

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

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
