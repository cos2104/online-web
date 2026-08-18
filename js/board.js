let allPosts = [];
let currentFilter = '전체';

async function loadPosts() {
  const { data, error } = await db.from('posts').select('*').order('created_at', { ascending: false });
  if (error) { document.getElementById('postList').innerHTML = '<div class="empty"><div class="icon">⚠️</div><p>데이터를 불러오지 못했습니다.</p></div>'; return; }
  allPosts = data || [];
  renderPosts();
}

function renderPosts() {
  const list = document.getElementById('postList');
  let items = allPosts;
  if (currentFilter === '답변대기') items = items.filter(p => !p.answer);
  if (currentFilter === '답변완료') items = items.filter(p => p.answer);

  if (!items.length) {
    list.innerHTML = `<div class="empty"><div class="icon">💬</div><p>아직 질문이 없습니다.</p></div>`;
    return;
  }

  list.innerHTML = items.map(p => `
    <div class="post-card ${p.answer ? 'answered' : ''}" data-id="${p.id}">
      <span class="post-status ${p.answer ? 'status-answered' : 'status-pending'}">${p.answer ? '답변완료' : '답변대기'}</span>
      <div class="post-info">
        <div class="post-title">${p.title}</div>
        <div class="post-meta">${p.category ? `[${p.category}] · ` : ''}${p.author || '익명'} · ${formatDate(p.created_at)}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function openDetail(id) {
  const post = allPosts.find(p => String(p.id) === String(id));
  if (!post) return;
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <h3 style="margin-bottom:1rem">${post.title}</h3>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">${post.category ? `[${post.category}] · ` : ''}${post.author || '익명'} · ${formatDate(post.created_at)}</div>
    <div class="post-detail-q">
      <div class="label">질문 내용</div>
      <div class="content">${post.content.replace(/\n/g, '<br>')}</div>
    </div>
    ${post.answer ? `
    <div class="post-detail-a" style="margin-top:1rem">
      <div class="label">관리자 답변</div>
      <div>${post.answer.replace(/\n/g, '<br>')}</div>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem">${formatDate(post.answered_at)}</div>
    </div>` : `<div style="margin-top:1rem;padding:1rem;background:#f9fafb;border-radius:8px;font-size:0.88rem;color:var(--text-muted);text-align:center">답변을 준비 중입니다. 조금만 기다려주세요.</div>`}
  `;
  document.getElementById('detailModal').classList.add('open');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// 필터 탭
document.querySelectorAll('.cat-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

// 질문 작성 (로그인 필요)
document.getElementById('writeBtn').addEventListener('click', () => {
  if (!currentUser) {
    document.getElementById('loginModal').classList.add('open');
    return;
  }
  document.getElementById('authorInput').value =
    currentUser.user_metadata?.full_name || currentUser.email;
  document.getElementById('writeModal').classList.add('open');
});

document.getElementById('loginModalCancelBtn').addEventListener('click', () => {
  document.getElementById('loginModal').classList.remove('open');
});

document.getElementById('writeCancelBtn').addEventListener('click', () => {
  document.getElementById('writeModal').classList.remove('open');
});

document.getElementById('writeSubmitBtn').addEventListener('click', async () => {
  if (!currentUser) { alert('로그인이 필요합니다.'); return; }

  const category = document.getElementById('categoryInput').value;
  const title = document.getElementById('titleInput').value.trim();
  const content = document.getElementById('contentInput').value.trim();

  if (!title || !content) { alert('제목과 내용을 입력해주세요.'); return; }

  const btn = document.getElementById('writeSubmitBtn');
  btn.disabled = true; btn.textContent = '등록 중...';

  const { error } = await db.from('posts').insert([{
    author: currentUser.user_metadata?.full_name || currentUser.email,
    author_email: currentUser.email,
    category, title, content
  }]);
  btn.disabled = false; btn.textContent = '등록하기';

  if (error) { alert('등록에 실패했습니다: ' + error.message); return; }

  document.getElementById('writeModal').classList.remove('open');
  document.getElementById('titleInput').value = '';
  document.getElementById('contentInput').value = '';
  document.getElementById('categoryInput').value = '';
  await loadPosts();
});

document.getElementById('detailCloseBtn').addEventListener('click', () => {
  document.getElementById('detailModal').classList.remove('open');
});

// 모달 외부 클릭 닫기
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

initAuth().then(loadPosts);
