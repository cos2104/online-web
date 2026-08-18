let allFaqs = [];
let allPosts = [];
let members = [];
let answerFilter = '답변대기';

// ============ 진입 / 권한 ============
async function boot() {
  await initAuth();

  if (!currentUser) { document.getElementById('loginWrap').style.display = 'flex'; return; }
  if (!isStaff) {
    document.getElementById('noAccessEmail').textContent = currentUser.email;
    document.getElementById('noAccessWrap').style.display = 'flex';
    return;
  }

  const pill = document.getElementById('rolePill');
  pill.textContent = isAdmin ? '관리자' : '교직원';
  pill.className = 'role-pill ' + (isAdmin ? 'role-admin' : 'role-staff');

  // 교직원은 관리자 전용 탭 숨김
  if (!isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.getElementById('addToFaqLabel').style.display = 'none';
  }

  document.getElementById('adminPanel').style.display = 'block';
  loadPosts();
  if (isAdmin) { loadFaqs(); loadMembers(); }
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

function renderStats() {
  const pending = allPosts.filter(p => !p.answer).length;
  const el = document.getElementById('adminStats');
  el.innerHTML = `
    <div class="admin-stat warn"><div class="n">${pending}</div><div class="l">답변 대기</div></div>
    <div class="admin-stat"><div class="n">${allPosts.length}</div><div class="l">전체 질문</div></div>
    ${isAdmin ? `
      <div class="admin-stat"><div class="n">${allFaqs.length}</div><div class="l">등록 FAQ</div></div>
      <div class="admin-stat"><div class="n">${members.length}</div><div class="l">구성원</div></div>` : ''}`;
  document.getElementById('pendingBadge').textContent = pending;
}

// ============ 답변 관리 ============
async function loadPosts() {
  const { data } = await db.from('posts').select('*').order('created_at', { ascending: false });
  allPosts = data || [];
  renderStats();
  renderPosts();
}

document.querySelectorAll('#answerFilter .cat-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    answerFilter = btn.dataset.f;
    document.querySelectorAll('#answerFilter .cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

function renderPosts() {
  const el = document.getElementById('adminBoardList');
  let items = allPosts;
  if (answerFilter === '답변대기') items = items.filter(p => !p.answer);
  if (answerFilter === '답변완료') items = items.filter(p => p.answer);

  if (!items.length) {
    el.innerHTML = `<div class="empty"><div class="icon">${answerFilter === '답변대기' ? '🎉' : '💬'}</div><p>${answerFilter === '답변대기' ? '답변 대기 중인 질문이 없습니다.' : '해당하는 질문이 없습니다.'}</p></div>`;
    return;
  }

  el.innerHTML = items.map(p => `
    <div class="admin-row">
      <div style="flex:1;min-width:0">
        <div class="row-text">${escapeHtml(p.title)}</div>
        <div class="row-sub">
          ${p.category ? `[${escapeHtml(p.category)}] · ` : ''}${escapeHtml(p.author || '익명')} · ${formatDate(p.created_at)}
          · <span style="color:${p.answer ? 'var(--green)' : 'var(--orange)'};font-weight:600">${p.answer ? '답변완료' : '답변대기'}</span>
          ${p.answered_by ? ` · 답변: ${escapeHtml(p.answered_by)}` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="btn ${p.answer ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="openAnswer('${p.id}')">${p.answer ? '수정' : '답변'}</button>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">삭제</button>` : ''}
      </div>
    </div>`).join('');
}

function openAnswer(id) {
  const p = allPosts.find(x => String(x.id) === String(id));
  if (!p) return;
  document.getElementById('answerPostId').value = id;
  document.getElementById('answerPostTitle').textContent = p.title;
  document.getElementById('answerPostContent').textContent = p.content;
  document.getElementById('answerInput').value = p.answer || '';
  document.getElementById('addToFaqCheck').checked = false;
  document.getElementById('answerModal').classList.add('open');
}

document.getElementById('answerSubmitBtn').addEventListener('click', async () => {
  const id = document.getElementById('answerPostId').value;
  const answer = document.getElementById('answerInput').value.trim();
  const addToFaq = isAdmin && document.getElementById('addToFaqCheck').checked;
  if (!answer) { toast('답변을 입력해주세요.', 'err'); return; }

  const myName = currentUser.user_metadata?.full_name || currentUser.email;
  const { error } = await db.from('posts').update({
    answer, answered_by: myName, answered_at: new Date().toISOString()
  }).eq('id', id);

  if (error) { toast('답변 등록 실패: ' + error.message, 'err'); return; }

  if (addToFaq) {
    const p = allPosts.find(x => String(x.id) === String(id));
    if (p) {
      await db.from('faqs').insert([{ category: p.category || '기타', question: p.title, answer }]);
      await loadFaqs();
    }
  }

  document.getElementById('answerModal').classList.remove('open');
  toast('답변이 등록되었습니다.', 'ok');
  await loadPosts();
});

document.getElementById('answerCancelBtn').addEventListener('click', () =>
  document.getElementById('answerModal').classList.remove('open'));

async function deletePost(id) {
  if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
  const { error } = await db.from('posts').delete().eq('id', id);
  if (error) { toast('삭제 실패: ' + error.message, 'err'); return; }
  toast('삭제되었습니다.', 'ok');
  await loadPosts();
}

// ============ FAQ 관리 (관리자) ============
async function loadFaqs() {
  const { data } = await db.from('faqs').select('*').order('created_at', { ascending: false });
  allFaqs = data || [];
  renderStats();
  renderFaqs();
}

function renderFaqs() {
  const el = document.getElementById('adminFaqList');
  if (!allFaqs.length) {
    el.innerHTML = '<div class="empty"><div class="icon">📋</div><p>등록된 FAQ가 없습니다.</p><small>+ FAQ 추가 버튼으로 등록해보세요.</small></div>';
    return;
  }
  el.innerHTML = allFaqs.map(f => `
    <div class="admin-row">
      <div style="flex:1;min-width:0">
        <div class="row-text">${escapeHtml(f.question)}</div>
        <div class="row-sub">${escapeHtml(f.category || '기타')} · 👍 ${f.helpful_yes || 0} · 👎 ${f.helpful_no || 0}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditFaq('${f.id}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFaq('${f.id}')">삭제</button>
      </div>
    </div>`).join('');
}

document.getElementById('addFaqBtn').addEventListener('click', () => {
  document.getElementById('faqModalTitle').textContent = 'FAQ 추가';
  document.getElementById('faqEditId').value = '';
  document.getElementById('faqQInput').value = '';
  document.getElementById('faqAInput').value = '';
  document.getElementById('faqModal').classList.add('open');
});

function openEditFaq(id) {
  const f = allFaqs.find(x => String(x.id) === String(id));
  if (!f) return;
  document.getElementById('faqModalTitle').textContent = 'FAQ 수정';
  document.getElementById('faqEditId').value = id;
  document.getElementById('faqCatInput').value = f.category || '기타';
  document.getElementById('faqQInput').value = f.question;
  document.getElementById('faqAInput').value = f.answer;
  document.getElementById('faqModal').classList.add('open');
}

document.getElementById('faqModalSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('faqEditId').value;
  const category = document.getElementById('faqCatInput').value;
  const question = document.getElementById('faqQInput').value.trim();
  const answer = document.getElementById('faqAInput').value.trim();
  if (!question || !answer) { toast('질문과 답변을 입력해주세요.', 'err'); return; }

  const { error } = id
    ? await db.from('faqs').update({ category, question, answer }).eq('id', id)
    : await db.from('faqs').insert([{ category, question, answer }]);

  if (error) { toast('저장 실패: ' + error.message, 'err'); return; }
  document.getElementById('faqModal').classList.remove('open');
  toast(id ? '수정되었습니다.' : 'FAQ가 등록되었습니다.', 'ok');
  await loadFaqs();
});

document.getElementById('faqModalCancelBtn').addEventListener('click', () =>
  document.getElementById('faqModal').classList.remove('open'));

async function deleteFaq(id) {
  if (!confirm('이 FAQ를 삭제하시겠습니까?')) return;
  const { error } = await db.from('faqs').delete().eq('id', id);
  if (error) { toast('삭제 실패: ' + error.message, 'err'); return; }
  toast('삭제되었습니다.', 'ok');
  await loadFaqs();
}

// ============ 구성원 관리 (관리자) ============
async function loadMembers() {
  const { data } = await db.from('admins').select('*').order('created_at', { ascending: true });
  members = data || [];
  renderStats();
  renderMembers();
}

function renderMembers() {
  const el = document.getElementById('memberList');
  el.innerHTML = members.map(m => {
    const self = m.email === currentUser.email;
    return `
    <div class="admin-row">
      <div style="flex:1;min-width:0">
        <div class="row-text">${escapeHtml(m.name || m.email.split('@')[0])}
          <span class="role-pill ${m.role === 'admin' ? 'role-admin' : 'role-staff'}">${m.role === 'admin' ? '관리자' : '교직원'}</span>
        </div>
        <div class="row-sub">${escapeHtml(m.email)}</div>
      </div>
      <div class="row-actions">
        ${self ? '<span style="font-size:.77rem;color:var(--text-muted)">본인</span>' : `
          <button class="btn btn-secondary btn-sm" onclick="toggleRole('${escapeHtml(m.email)}','${m.role}')">
            ${m.role === 'admin' ? '교직원으로' : '관리자로'}</button>
          <button class="btn btn-danger btn-sm" onclick="removeMember('${escapeHtml(m.email)}')">삭제</button>`}
      </div>
    </div>`;
  }).join('');
}

document.getElementById('addMemberBtn').addEventListener('click', async () => {
  const email = document.getElementById('newMemberEmail').value.trim().toLowerCase();
  const name = document.getElementById('newMemberName').value.trim();
  const role = document.getElementById('newMemberRole').value;
  if (!email) { toast('이메일을 입력해주세요.', 'err'); return; }

  const { error } = await db.from('admins').insert([{ email, name, role }]);
  if (error) { toast('추가 실패: ' + error.message, 'err'); return; }

  document.getElementById('newMemberEmail').value = '';
  document.getElementById('newMemberName').value = '';
  toast('구성원이 추가되었습니다.', 'ok');
  await loadMembers();
});

async function toggleRole(email, role) {
  const next = role === 'admin' ? 'staff' : 'admin';
  const { error } = await db.from('admins').update({ role: next }).eq('email', email);
  if (error) { toast('변경 실패: ' + error.message, 'err'); return; }
  toast(`${next === 'admin' ? '관리자' : '교직원'}로 변경되었습니다.`, 'ok');
  await loadMembers();
}

async function removeMember(email) {
  if (!confirm(`${email} 님을 구성원에서 제외하시겠습니까?`)) return;
  const { error } = await db.from('admins').delete().eq('email', email);
  if (error) { toast('삭제 실패: ' + error.message, 'err'); return; }
  toast('제외되었습니다.', 'ok');
  await loadMembers();
}

boot();
