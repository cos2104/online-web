let allPosts = [];
let currentFilter = '전체';

async function loadPosts() {
  const { data, error } = await db.from('posts').select('*').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('postList').innerHTML =
      '<div class="empty"><div class="icon">⚠️</div><p>데이터를 불러오지 못했습니다.</p></div>';
    return;
  }
  allPosts = data || [];
  renderPosts();
}

function renderPosts() {
  const list = document.getElementById('postList');
  const info = document.getElementById('boardInfo');
  const query = document.getElementById('boardSearch').value.trim().toLowerCase();
  let items = allPosts;

  if (currentFilter === '답변대기') items = items.filter(p => !p.answer);
  if (currentFilter === '답변완료') items = items.filter(p => p.answer);
  if (currentFilter === '내질문') {
    items = currentUser ? items.filter(p => p.author_email === currentUser.email) : [];
  }
  if (query) items = items.filter(p =>
    p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query));

  info.innerHTML = allPosts.length ? `총 <b>${items.length}</b>건` : '';

  if (!items.length) {
    let msg = '아직 등록된 질문이 없습니다.';
    let sub = '궁금한 점이 있다면 첫 질문을 남겨보세요.';
    if (currentFilter === '내질문' && !currentUser) { msg = '로그인이 필요합니다.'; sub = '내 질문을 보려면 로그인해주세요.'; }
    else if (query) { msg = '검색 결과가 없습니다.'; sub = '다른 키워드로 검색해보세요.'; }
    else if (currentFilter !== '전체') { msg = `'${currentFilter}' 항목이 없습니다.`; sub = ''; }
    list.innerHTML = `<div class="empty"><div class="icon">💬</div><p>${escapeHtml(msg)}</p><small>${escapeHtml(sub)}</small></div>`;
    return;
  }

  list.innerHTML = items.map(p => `
    <article class="post-card ${p.answer ? 'answered' : ''}" data-id="${p.id}">
      <span class="post-status ${p.answer ? 'status-answered' : 'status-pending'}">
        ${p.answer ? '답변완료' : '답변대기'}</span>
      <div class="post-info">
        <div class="post-title">${escapeHtml(p.title)}</div>
        <div class="post-meta">${p.category ? `[${escapeHtml(p.category)}] · ` : ''}${escapeHtml(p.author || '익명')} · ${formatDate(p.created_at)}</div>
        <div class="post-preview">${escapeHtml(p.content)}</div>
      </div>
    </article>`).join('');

  list.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function openDetail(id) {
  const p = allPosts.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById('detailContent').innerHTML = `
    <h3 style="margin-bottom:.5rem">${escapeHtml(p.title)}</h3>
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:1.1rem">
      ${p.category ? `[${escapeHtml(p.category)}] · ` : ''}${escapeHtml(p.author || '익명')} · ${formatDate(p.created_at)}
    </div>
    <div class="post-detail-q">
      <div class="label">질문 내용</div>
      <div class="content">${nl2br(p.content)}</div>
    </div>
    ${p.answer ? `
      <div class="post-detail-a" style="margin-top:.9rem">
        <div class="label">답변${p.answered_by ? ` · ${escapeHtml(p.answered_by)}` : ''}</div>
        <div>${nl2br(p.answer)}</div>
        <div style="font-size:.77rem;color:var(--text-muted);margin-top:.6rem">${formatDate(p.answered_at)}</div>
      </div>`
    : `<div class="pending-note">⏳ 답변을 준비 중입니다. 조금만 기다려주세요.</div>`}
  `;
  document.getElementById('detailModal').classList.add('open');
}

// 필터
document.querySelectorAll('#filterTabs .cat-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('#filterTabs .cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

document.getElementById('boardSearch').addEventListener('input', renderPosts);

// 작성
document.getElementById('writeBtn').addEventListener('click', () => {
  if (!currentUser) { document.getElementById('loginModal').classList.add('open'); return; }
  document.getElementById('authorInput').value =
    currentUser.user_metadata?.full_name || currentUser.email;
  document.getElementById('writeModal').classList.add('open');
  setTimeout(() => document.getElementById('titleInput').focus(), 100);
});

document.getElementById('loginModalCancelBtn').addEventListener('click', () =>
  document.getElementById('loginModal').classList.remove('open'));

document.getElementById('writeCancelBtn').addEventListener('click', () =>
  document.getElementById('writeModal').classList.remove('open'));

document.getElementById('detailCloseBtn').addEventListener('click', () =>
  document.getElementById('detailModal').classList.remove('open'));

document.getElementById('writeSubmitBtn').addEventListener('click', async () => {
  if (!currentUser) { toast('로그인이 필요합니다.', 'err'); return; }

  const category = document.getElementById('categoryInput').value;
  const title = document.getElementById('titleInput').value.trim();
  const content = document.getElementById('contentInput').value.trim();
  if (!title || !content) { toast('제목과 내용을 입력해주세요.', 'err'); return; }

  const btn = document.getElementById('writeSubmitBtn');
  btn.disabled = true; btn.textContent = '등록 중...';

  const { error } = await db.from('posts').insert([{
    author: currentUser.user_metadata?.full_name || currentUser.email,
    author_email: currentUser.email,
    category, title, content
  }]);

  btn.disabled = false; btn.textContent = '등록하기';
  if (error) { toast('등록 실패: ' + error.message, 'err'); return; }

  document.getElementById('writeModal').classList.remove('open');
  ['titleInput', 'contentInput', 'categoryInput'].forEach(i => document.getElementById(i).value = '');
  toast('질문이 등록되었습니다.', 'ok');
  await loadPosts();
});

initAuth().then(loadPosts);
