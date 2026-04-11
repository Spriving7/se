// ========== 主题切换 ==========
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && prefersDark);
  applyTheme(isDark);
}

function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(!isDark);
}

// ========== 页面导航 ==========
function navigateTo(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  // 显示目标页面
  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.remove('hidden');

  // 更新顶部导航高亮
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  // 更新移动端菜单高亮
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  // 更新底部 Tab 高亮
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  // 关闭移动端菜单
  document.getElementById('mobileMenu').classList.add('hidden');

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== 移动端菜单 ==========
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // 主题切换
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // 移动端菜单按钮
  document.getElementById('menuToggle').addEventListener('click', toggleMobileMenu);

  // 所有带 data-page 的导航按钮（统一处理）
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
});
