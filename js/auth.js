// 공통 인증 모듈
let currentUser = null;
let isAdmin = false;

async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) {
    const { data } = await db.from('admins').select('email').eq('email', currentUser.email).maybeSingle();
    isAdmin = !!data;
  }
  renderAuthUI();
  return currentUser;
}

async function signInWithGoogle() {
  await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
}

async function signOut() {
  await db.auth.signOut();
  window.location.reload();
}

function renderAuthUI() {
  const el = document.getElementById('authArea');
  if (!el) return;

  if (currentUser) {
    const name = currentUser.user_metadata?.full_name || currentUser.email;
    const avatar = currentUser.user_metadata?.avatar_url;
    el.innerHTML = `
      ${isAdmin ? '<a href="admin.html" class="nav-admin-link">관리자</a>' : ''}
      <div class="user-chip">
        ${avatar ? `<img src="${avatar}" alt="">` : '<span class="user-initial">' + name[0] + '</span>'}
        <span class="user-name">${name}</span>
      </div>
      <button class="nav-btn" onclick="signOut()">로그아웃</button>
    `;
  } else {
    el.innerHTML = `<button class="nav-btn nav-btn-login" onclick="signInWithGoogle()">
      <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
      Google 로그인
    </button>`;
  }
}
