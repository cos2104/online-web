// ============================================
// 공통 모듈 - 인증 / 역할 / UI 유틸
// ============================================

let currentUser = null;
let currentRole = null;   // 'admin' | 'staff' | null
let isAdmin = false;      // 관리자
let isStaff = false;      // 관리자 또는 교직원

async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  currentUser = session?.user || null;

  if (currentUser) {
    const { data } = await db.from('admins')
      .select('role, name').eq('email', currentUser.email).maybeSingle();
    currentRole = data?.role || null;
    isAdmin = currentRole === 'admin';
    isStaff = currentRole === 'admin' || currentRole === 'staff';
  }

  renderAuthUI();
  return currentUser;
}

async function signInWithGoogle() {
  await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.split('#')[0] }
  });
}

async function signOut() {
  await db.auth.signOut();
  window.location.reload();
}

const GOOGLE_SVG = `<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;

function renderAuthUI() {
  const el = document.getElementById('authArea');
  if (!el) return;

  if (currentUser) {
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const avatar = currentUser.user_metadata?.avatar_url;
    const roleLink = isStaff
      ? `<a href="admin.html" class="nav-role-link">${isAdmin ? '관리자' : '답변 관리'}</a>` : '';

    el.innerHTML = `
      ${roleLink}
      <div class="user-chip">
        ${avatar ? `<img src="${avatar}" alt="">` : `<span class="user-initial">${name[0]}</span>`}
        <span class="user-name">${escapeHtml(name)}</span>
      </div>
      <button class="nav-btn" onclick="signOut()">로그아웃</button>`;
  } else {
    el.innerHTML = `<button class="nav-btn nav-btn-login" onclick="signInWithGoogle()">
      ${GOOGLE_SVG} Google 로그인</button>`;
  }
}

// ============ UI 유틸 ============

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function nl2br(str) { return escapeHtml(str).replace(/\n/g, '<br>'); }

function toast(msg, type = '') {
  let area = document.getElementById('toastArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toastArea';
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  area.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 250);
  }, 2600);
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 맨 위로 버튼
function initScrollTop() {
  const btn = document.createElement('button');
  btn.id = 'scrollTop';
  btn.innerHTML = '↑';
  btn.title = '맨 위로';
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 340);
  });
}
document.addEventListener('DOMContentLoaded', initScrollTop);

// 모달 공통 동작
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(o => o.classList.remove('open'));
    }
  });
});
