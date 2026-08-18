let allFaqs = [];
let currentCat = '전체';

async function loadFaqs() {
  const { data, error } = await db.from('faqs').select('*').order('created_at', { ascending: false });
  if (error) { renderError(); return; }
  allFaqs = data || [];
  renderCats();
  renderFaqs();
  loadStats();
}

async function loadStats() {
  const { count: boardCount } = await db.from('posts').select('*', { count: 'exact', head: true });
  document.getElementById('totalCount').textContent = allFaqs.length;
  const cats = [...new Set(allFaqs.map(f => f.category).filter(Boolean))];
  document.getElementById('catCount').textContent = cats.length;
  document.getElementById('boardCount').textContent = boardCount || 0;
}

function renderCats() {
  const cats = ['전체', ...new Set(allFaqs.map(f => f.category).filter(Boolean))];
  const tabs = document.getElementById('catTabs');
  tabs.innerHTML = cats.map(c =>
    `<button class="cat-tab ${c === currentCat ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  tabs.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCat = btn.dataset.cat;
      tabs.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFaqs();
    });
  });
}

function renderFaqs(faqs) {
  const list = document.getElementById('faqList');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  let items = faqs || allFaqs;

  if (currentCat !== '전체') items = items.filter(f => f.category === currentCat);
  if (query) items = items.filter(f =>
    f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)
  );

  if (!items.length) {
    list.innerHTML = `<div class="empty"><div class="icon">🔍</div><p>검색 결과가 없습니다.<br><small>다른 키워드로 검색해보세요.</small></p></div>`;
    return;
  }

  list.innerHTML = items.map((f, i) => `
    <div class="faq-item" data-id="${f.id}">
      <div class="faq-q">
        <span class="tag">${f.category || '일반'}</span>
        <span class="q-text">${highlight(f.question, query)}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="faq-a">
        <div>${highlight(f.answer.replace(/\n/g, '<br>'), query)}</div>
        <div class="faq-helpful">
          <span>도움이 되었나요?</span>
          <button class="helpful-btn" data-id="${f.id}" data-type="yes">👍 ${f.helpful_yes || 0}</button>
          <button class="helpful-btn" data-id="${f.id}" data-type="no">👎 ${f.helpful_no || 0}</button>
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      item.classList.toggle('open');
    });
  });

  list.querySelectorAll('.helpful-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const voted = JSON.parse(localStorage.getItem('voted') || '{}');
      if (voted[id]) return;
      const col = type === 'yes' ? 'helpful_yes' : 'helpful_no';
      const faq = allFaqs.find(f => String(f.id) === String(id));
      const { error } = await db.rpc('vote_helpful', { faq_id: id, is_yes: type === 'yes' });
      if (error) return;
      const newVal = (faq[col] || 0) + 1;
      faq[col] = newVal;
      voted[id] = true;
      localStorage.setItem('voted', JSON.stringify(voted));
      btn.classList.add('voted');
      btn.textContent = (type === 'yes' ? '👍 ' : '👎 ') + newVal;
    });
  });
}

function highlight(text, query) {
  if (!query) return text;
  return text.replace(new RegExp(`(${query})`, 'gi'), '<mark style="background:#fef08a;border-radius:3px">$1</mark>');
}

function renderError() {
  document.getElementById('faqList').innerHTML = `<div class="empty"><div class="icon">⚠️</div><p>데이터를 불러오지 못했습니다.<br><small>Supabase 설정을 확인해주세요.</small></p></div>`;
}

document.getElementById('searchInput').addEventListener('input', () => renderFaqs());

initAuth().then(loadFaqs);
