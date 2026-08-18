let allFaqs = [];
let allPosts = [];
let adminUsers = [];

// 진입 시 권한 확인
async function boot() {
  await initAuth();

  if (!currentUser) {
    document.getElementById('loginWrap').style.display = 'flex';
    return;
  }
  if (!isAdmin) {
    document.getElementById('noAccessEmail').textContent = currentUser.email;
    document.getElementById('noAccessWrap').style.display = 'flex';
    return;
  }

  document.getElementById('adminPanel').style.display = 'block';
  loadAdminFaqs();
  loadAdminPosts();
  loadAdminUsers();
}

// 탭 전환
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
  });
});

// ===== FAQ 관리 =====
async function loadAdminFaqs() {
  const { data } = await db.from('faqs').select('*').order('created_at', { ascending: false });
  allFaqs = data || [];
  renderAdminFaqs();
}

function renderAdminFaqs() {
  const el = document.getElementById('adminFaqList');
  if (!allFaqs.length) {
    el.innerHTML = '<div class="empty"><div class="icon">📋</div><p>등록된 FAQ가 없습니다.</p></div>';
    return;
  }
  el.innerHTML = allFaqs.map(f => `
    <div class="admin-faq-row">
      <div style="flex:1">
        <div class="row-text">${f.question}</div>
        <div class="row-cat">${f.category || '일반'} · 👍 ${f.helpful_yes || 0} 👎 ${f.helpful_no || 0}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditFaq('${f.id}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFaq('${f.id}')">삭제</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addFaqBtn').addEventListener('click', () => {
  document.getElementById('faqModalTitle').textContent = 'FAQ 추가';
  document.getElementById('faqEditId').value = '';
  document.getElementById('faqQInput').value = '';
  document.getElementById('faqAInput').value = '';
  document.getElementById('faqModal').classList.add('open');
});

function openEditFaq(id) {
  const faq = allFaqs.find(f => String(f.id) === String(id));
  if (!faq) return;
  document.getElementById('faqModalTitle').textContent = 'FAQ 수정';
  document.getElementById('faqEditId').value = id;
  document.getElementById('faqCatInput').value = faq.category || '기타';
  document.getElementById('faqQInput').value = faq.question;
  document.getElementById('faqAInput').value = faq.answer;
  document.getElementById('faqModal').classList.add('open');
}

async function deleteFaq(id) {
  if (!confirm('이 FAQ를 삭제하시겠습니까?')) return;
  const { error } = await db.from('faqs').delete().eq('id', id);
  if (error) { alert('삭제 실패: ' + error.message); return; }
  await loadAdminFaqs();
}

document.getElementById('faqModalSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('faqEditId').value;
  const category = document.getElementById('faqCatInput').value;
  const question = document.getElementById('faqQInput').value.trim();
  const answer = document.getElementById('faqAInput').value.trim();
  if (!question || !answer) { alert('질문과 답변을 입력해주세요.'); return; }

  const { error } = id
    ? await db.from('faqs').update({ category, question, answer }).eq('id', id)
    : await db.from('faqs').insert([{ category, question, answer }]);

  if (error) { alert('저장 실패: ' + error.message); return; }
  document.getElementById('faqModal').classList.remove('open');
  await loadAdminFaqs();
});

document.getElementById('faqModalCancelBtn').addEventListener('click', () => {
  document.getElementById('faqModal').classList.remove('open');
});

// ===== 게시판 관리 =====
async function loadAdminPosts() {
  const { data } = await db.from('posts').select('*').order('created_at', { ascending: false });
  allPosts = data || [];
  document.getElementById('pendingBadge').textContent = allPosts.filter(p => !p.answer).length;
  renderAdminPosts();
}

function renderAdminPosts() {
  const el = document.getElementById('adminBoardList');
  if (!allPosts.length) {
    el.innerHTML = '<div class="empty"><div class="icon">💬</div><p>게시글이 없습니다.</p></div>';
    return;
  }
  el.innerHTML = allPosts.map(p => `
    <div class="admin-faq-row">
      <div style="flex:1">
        <div class="row-text">${p.title}</div>
        <div class="row-cat">${p.category ? `[${p.category}] · ` : ''}${p.author || '익명'} · ${formatDate(p.created_at)} · <span style="color:${p.answer ? 'var(--primary)' : '#d97706'}">${p.answer ? '답변완료' : '답변대기'}</span></div>
      </div>
      <div class="row-actions">
        <button class="btn btn-primary btn-sm" onclick="openAnswer('${p.id}')">${p.answer ? '수정' : '답변'}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">삭제</button>
      </div>
    </div>
  `).join('');
}

function openAnswer(id) {
  const post = allPosts.find(p => String(p.id) === String(id));
  if (!post) return;
  document.getElementById('answerPostId').value = id;
  document.getElementById('answerPostTitle').textContent = post.title;
  document.getElementById('answerPostContent').textContent = post.content;
  document.getElementById('answerInput').value = post.answer || '';
  document.getElementById('addToFaqCheck').checked = false;
  document.getElementById('answerModal').classList.add('open');
}

document.getElementById('answerSubmitBtn').addEventListener('click', async () => {
  const id = document.getElementById('answerPostId').value;
  const answer = document.getElementById('answerInput').value.trim();
  const addToFaq = document.getElementById('addToFaqCheck').checked;
  if (!answer) { alert('답변을 입력해주세요.'); return; }

  const { error } = await db.from('posts')
    .update({ answer, answered_at: new Date().toISOString() }).eq('id', id);
  if (error) { alert('답변 등록 실패: ' + error.message); return; }

  if (addToFaq) {
    const post = allPosts.find(p => String(p.id) === String(id));
    if (post) {
      await db.from('faqs').insert([{ category: post.category || '기타', question: post.title, answer }]);
      await loadAdminFaqs();
    }
  }

  document.getElementById('answerModal').classList.remove('open');
  await loadAdminPosts();
});

document.getElementById('answerCancelBtn').addEventListener('click', () => {
  document.getElementById('answerModal').classList.remove('open');
});

async function deletePost(id) {
  if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
  const { error } = await db.from('posts').delete().eq('id', id);
  if (error) { alert('삭제 실패: ' + error.message); return; }
  await loadAdminPosts();
}

// ===== 관리자 관리 =====
async function loadAdminUsers() {
  const { data } = await db.from('admins').select('*').order('created_at', { ascending: true });
  adminUsers = data || [];
  renderAdminUsers();
}

function renderAdminUsers() {
  const el = document.getElementById('adminUserList');
  el.innerHTML = adminUsers.map(a => `
    <div class="admin-faq-row">
      <div style="flex:1">
        <div class="row-text">${a.email}</div>
        <div class="row-cat">${a.name || '이름 없음'}</div>
      </div>
      <div class="row-actions">
        ${a.email === currentUser.email
          ? '<span style="font-size:0.78rem;color:var(--text-muted)">본인</span>'
          : `<button class="btn btn-danger btn-sm" onclick="removeAdmin('${a.email}')">삭제</button>`}
      </div>
    </div>
  `).join('');
}

document.getElementById('addAdminBtn').addEventListener('click', async () => {
  const email = document.getElementById('newAdminEmail').value.trim();
  const name = document.getElementById('newAdminName').value.trim();
  if (!email) { alert('이메일을 입력해주세요.'); return; }

  const { error } = await db.from('admins').insert([{ email, name }]);
  if (error) { alert('추가 실패: ' + error.message); return; }
  document.getElementById('newAdminEmail').value = '';
  document.getElementById('newAdminName').value = '';
  await loadAdminUsers();
});

async function removeAdmin(email) {
  if (!confirm(`${email} 님의 관리자 권한을 제거하시겠습니까?`)) return;
  const { error } = await db.from('admins').delete().eq('email', email);
  if (error) { alert('삭제 실패: ' + error.message); return; }
  await loadAdminUsers();
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

boot();
