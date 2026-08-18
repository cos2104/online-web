let allFaqs = [];
let currentCat = '전체';

const CAT_ICON = {
  '수업 운영': '📚', '출결 관리': '📅', '시스템 이용': '💻',
  '학적 관리': '📋', '기타': '💬', '전체': '📌'
};

async function loadFaqs() {
  const { data, error } = await db.from('faqs').select('*').order('created_at', { ascending: false });
  if (error) { renderError(); return; }
  allFaqs = data || [];
  renderCats();
  renderFaqs();
  loadStats();
}

async function loadStats() {
  const { count } = await db.from('posts').select('*', { count: 'exact', head: true });
  document.getElementById('totalCount').textContent = allFaqs.length;
  document.getElementById('catCount').textContent =
    new Set(allFaqs.map(f => f.category).filter(Boolean)).size;
  document.getElementById('boardCount').textContent = count || 0;
}

function renderCats() {
  const counts = {};
  allFaqs.forEach(f => { const c = f.category || '기타'; counts[c] = (counts[c] || 0) + 1; });
  const cats = ['전체', ...Object.keys(counts)];
  const tabs = document.getElementById('catTabs');

  tabs.innerHTML = cats.map(c => `
    <button class="cat-tab ${c === currentCat ? 'active' : ''}" data-cat="${escapeHtml(c)}">
      <span>${CAT_ICON[c] || '📄'}</span>${escapeHtml(c)}
      <span class="cnt">${c === '전체' ? allFaqs.length : counts[c]}</span>
    </button>`).join('');

  tabs.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCat = btn.dataset.cat;
      tabs.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFaqs();
    });
  });
}

function renderFaqs() {
  const list = document.getElementById('faqList');
  const info = document.getElementById('resultInfo');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  let items = allFaqs;

  if (currentCat !== '전체') items = items.filter(f => (f.category || '기타') === currentCat);
  if (query) items = items.filter(f =>
    f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query));

  info.innerHTML = query
    ? `'<b>${escapeHtml(query)}</b>' 검색 결과 <b>${items.length}</b>건`
    : (allFaqs.length ? `총 <b>${items.length}</b>건` : '');

  if (!items.length) {
    list.innerHTML = allFaqs.length
      ? `<div class="empty"><div class="icon">🔍</div><p>검색 결과가 없습니다.</p><small>다른 키워드로 검색하거나 질문 게시판을 이용해보세요.</small><div style="margin-top:1.2rem"><a href="board.html" class="btn btn-primary" style="text-decoration:none">질문 게시판으로 이동</a></div></div>`
      : `<div class="empty"><div class="icon">📭</div><p>등록된 FAQ가 없습니다.</p><small>관리자가 FAQ를 등록하면 이곳에 표시됩니다.</small></div>`;
    return;
  }

  list.innerHTML = items.map(f => `
    <article class="faq-item" data-id="${f.id}">
      <div class="faq-q">
        <span class="tag">${escapeHtml(f.category || '기타')}</span>
        <span class="q-text">${highlight(f.question, query)}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="faq-a"><div class="faq-a-inner"><div class="faq-a-body">
        <div>${highlight(f.answer, query).replace(/\n/g, '<br>')}</div>
        <div class="faq-helpful">
          <span>이 답변이 도움이 되었나요?</span>
          <button class="helpful-btn" data-id="${f.id}" data-type="yes">👍 ${f.helpful_yes || 0}</button>
          <button class="helpful-btn" data-id="${f.id}" data-type="no">👎 ${f.helpful_no || 0}</button>
        </div>
      </div></div></div>
    </article>`).join('');

  bindFaqEvents(list);
}

function bindFaqEvents(list) {
  const voted = JSON.parse(localStorage.getItem('voted') || '{}');

  list.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => q.closest('.faq-item').classList.toggle('open'));
  });

  list.querySelectorAll('.helpful-btn').forEach(btn => {
    if (voted[btn.dataset.id]) btn.classList.add('voted');

    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id, type = btn.dataset.type;
      const v = JSON.parse(localStorage.getItem('voted') || '{}');
      if (v[id]) { toast('이미 평가한 질문입니다.'); return; }

      const { error } = await db.rpc('vote_helpful', { faq_id: id, is_yes: type === 'yes' });
      if (error) { toast('처리에 실패했습니다.', 'err'); return; }

      const faq = allFaqs.find(f => String(f.id) === String(id));
      const col = type === 'yes' ? 'helpful_yes' : 'helpful_no';
      faq[col] = (faq[col] || 0) + 1;

      v[id] = true;
      localStorage.setItem('voted', JSON.stringify(v));
      btn.classList.add('voted');
      btn.textContent = `${type === 'yes' ? '👍' : '👎'} ${faq[col]}`;
      toast('의견 감사합니다!', 'ok');
    });
  });
}

function highlight(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
}

function renderError() {
  document.getElementById('faqList').innerHTML =
    `<div class="empty"><div class="icon">⚠️</div><p>데이터를 불러오지 못했습니다.</p><small>잠시 후 다시 시도해주세요.</small></div>`;
}

// 검색
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', renderFaqs);

// '/' 키로 검색창 포커스
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

initAuth().then(loadFaqs);
