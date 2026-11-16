/* ---------- 저장 구조 ----------
  workout-app-v2 = {
    items: [ { id, name, unit } ],
    logs:  { "2026-11-16": { "run": 5, "pushup": 30 } }
  }
--------------------------------- */
const KEY = 'workout-app-v2';
const DEF_ITEMS = [
  { id: 'run',    name: '달리기', unit: 'km' },
  { id: 'pushup', name: '푸시업', unit: '개' },
  { id: 'squat',  name: '스쿼트', unit: '개' }
];

let state = { items: [], logs: {} };
let viewYear, viewMonth, selDate;

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayStr = () => ymd(new Date());

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.items) && raw.logs) state = { items: raw.items, logs: raw.logs };
    else state = { items: DEF_ITEMS.slice(), logs: {} };
  } catch (e) { state = { items: DEF_ITEMS.slice(), logs: {} }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('저장 실패', e); }
}

function dayStatus(dateStr) {
  const log = state.logs[dateStr];
  if (!log) return 'none';
  const filled = state.items.filter(i => (Number(log[i.id]) || 0) > 0).length;
  if (filled === 0) return 'none';
  if (state.items.length > 0 && filled === state.items.length) return 'done';
  return 'partial';
}
function dayTotal(dateStr) {
  const log = state.logs[dateStr];
  if (!log) return 0;
  return state.items.reduce((s, i) => s + (Number(log[i.id]) || 0), 0);
}

function renderCalendar() {
  document.getElementById('monthLabel').textContent = viewYear + '년 ' + (viewMonth + 1) + '월';
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = new Date(viewYear, viewMonth, 1).getDay();
  const t = todayStr();

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let i = 0; i < startDow; i++) {
    const b = document.createElement('div');
    b.className = 'day blank';
    grid.appendChild(b);
  }
  for (let d = 1; d <= lastDay; d++) {
    const ds = viewYear + '-' + pad(viewMonth + 1) + '-' + pad(d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    if (ds === t) btn.classList.add('today');
    if (ds === selDate) btn.classList.add('sel');
    const st = dayStatus(ds);
    if (st === 'done') btn.classList.add('done');
    else if (st === 'partial') btn.classList.add('partial');
    if (st !== 'none') btn.classList.add('has');

    btn.innerHTML = '<span>' + d + '</span><span class="dot"></span>';
    btn.addEventListener('click', () => { selDate = ds; renderAll(); });
    grid.appendChild(btn);
  }
  const now = new Date();
  document.getElementById('nextMonth').disabled =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
}

function renderList() {
  const list = document.getElementById('list');
  document.getElementById('empty').style.display = state.items.length ? 'none' : 'block';
  list.innerHTML = '';
  const log = state.logs[selDate] || {};

  state.items.forEach(item => {
    const val = Number(log[item.id]) || 0;
    const done = val > 0;

    const row = document.createElement('li');
    row.className = 'row' + (done ? ' done' : '');

    const top = document.createElement('div');
    top.className = 'row-top';

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check' + (done ? ' on' : '');
    check.textContent = '✓';
    check.setAttribute('aria-label', item.name + ' 완료 체크');
    check.addEventListener('click', () => setValue(item.id, done ? 0 : 1));

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = item.name;

    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = item.unit || '';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '×';
    del.setAttribute('aria-label', item.name + ' 삭제');
    del.addEventListener('click', () => removeItem(item.id));

    top.append(check, name, unit, del);

    const bottom = document.createElement('div');
    bottom.className = 'row-bottom';

    const step = document.createElement('div');
    step.className = 'stepper';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.addEventListener('click', () =>
      setValue(item.id, Math.max(0, (Number(log[item.id]) || 0) - stepSize(item))));

    const num = document.createElement('input');
    num.type = 'number';
    num.min = '0';
    num.step = 'any';
    num.inputMode = 'decimal';
    num.value = val || '';
    num.placeholder = '0';
    num.setAttribute('aria-label', item.name + ' 수치');
    num.addEventListener('change', () =>
      setValue(item.id, Math.max(0, Number(num.value) || 0)));

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.addEventListener('click', () =>
      setValue(item.id, (Number(log[item.id]) || 0) + stepSize(item)));

    step.append(minus, num, plus);
    bottom.appendChild(step);
    row.append(top, bottom);
    list.appendChild(row);
  });
}

function stepSize(item) {
  const u = (item.unit || '').toLowerCase();
  return (u === 'km' || u === 'kg') ? 0.5 : 1;
}

function setValue(itemId, value) {
  if (!state.logs[selDate]) state.logs[selDate] = {};
  if (value > 0) state.logs[selDate][itemId] = value;
  else delete state.logs[selDate][itemId];
  if (Object.keys(state.logs[selDate]).length === 0) delete state.logs[selDate];
  save();
  renderAll();
}

function addItem(name, unit) {
  const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  state.items.push({ id, name, unit: unit || '' });
  save();
  renderAll();
}
function removeItem(id) {
  if (!confirm('이 항목을 삭제할까요? 지금까지의 기록도 함께 사라집니다.')) return;
  state.items = state.items.filter(i => i.id !== id);
  Object.keys(state.logs).forEach(d => {
    delete state.logs[d][id];
    if (Object.keys(state.logs[d]).length === 0) delete state.logs[d];
  });
  save();
  renderAll();
}

function renderStats() {
  const prefix = viewYear + '-' + pad(viewMonth + 1);
  const dates = Object.keys(state.logs).filter(d => d.startsWith(prefix));

  let doneDays = 0, entries = 0;
  dates.forEach(d => {
    if (dayStatus(d) === 'done') doneDays++;
    entries += Object.values(state.logs[d]).filter(v => Number(v) > 0).length;
  });
  document.getElementById('statDays').textContent = doneDays + '일';
  document.getElementById('statEntries').textContent = entries + '건';

  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totals = [];
  for (let d = 1; d <= lastDay; d++) totals.push(dayTotal(prefix + '-' + pad(d)));
  const max = Math.max.apply(null, totals.concat([0]));

  const chart = document.getElementById('chart');
  const chartX = document.getElementById('chartX');
  chart.innerHTML = '';
  chartX.innerHTML = '';

  if (max === 0) {
    document.getElementById('chartEmpty').style.display = 'block';
    document.getElementById('chartWrap').style.display = 'none';
    return;
  }
  document.getElementById('chartEmpty').style.display = 'none';
  document.getElementById('chartWrap').style.display = 'block';

  totals.forEach(v => {
    const col = document.createElement('div');
    col.className = 'col' + (v === 0 ? ' zero' : '') + (v === max && v > 0 ? ' peak' : '');
    const numEl = document.createElement('span');
    numEl.className = 'num';
    numEl.textContent = v > 0 ? v : '';
    const fill = document.createElement('i');
    fill.className = 'fill';
    fill.style.height = Math.max(2, (v / max) * 100) + '%';
    col.append(numEl, fill);
    chart.appendChild(col);
  });

  const labels = new Set([1, 5, 10, 15, 20, 25, lastDay]);
  for (let d = 1; d <= lastDay; d++) {
    const c = document.createElement('div');
    c.className = 'col';
    c.textContent = labels.has(d) ? d : '';
    chartX.appendChild(c);
  }
}

function renderAll() {
  renderCalendar();
  renderList();
  renderStats();

  const log = state.logs[selDate] || {};
  const total = state.items.length;
  const done = state.items.filter(i => (Number(log[i.id]) || 0) > 0).length;
  document.getElementById('count').textContent = done + ' / ' + total;
  document.getElementById('bar').style.width = (total ? Math.round(done / total * 100) : 0) + '%';

  const d = new Date(selDate + 'T00:00:00');
  document.getElementById('selectedTitle').textContent =
    d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) +
    (selDate === todayStr() ? ' (오늘)' : '');
}

/* ---------- 이벤트 ---------- */
document.getElementById('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const nameEl = document.getElementById('newName');
  const unitEl = document.getElementById('newUnit');
  const name = nameEl.value.trim();
  if (!name) return;
  addItem(name, unitEl.value.trim());
  nameEl.value = ''; unitEl.value = '';
  nameEl.focus();
});

document.getElementById('prevMonth').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderAll();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  const now = new Date();
  if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderAll();
});

const _now = new Date();
viewYear = _now.getFullYear();
viewMonth = _now.getMonth();
selDate = todayStr();

document.getElementById('todayLabel').textContent =
  '오늘 ' + _now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

load();
renderAll();

/* ---------- PWA: 서비스 워커 등록 ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('서비스 워커 등록 실패', err);
    });
  });
}

/* ---------- PWA: 설치 배너 ---------- */
let deferredPrompt = null;
const installBox = document.getElementById('installBox');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBox.classList.add('show');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBox.classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  installBox.classList.remove('show');
  deferredPrompt = null;
});

/* ---------- 오프라인 표시 ---------- */
const offlineTag = document.getElementById('offlineTag');
function syncOnline() { offlineTag.classList.toggle('show', !navigator.onLine); }
window.addEventListener('online', syncOnline);
window.addEventListener('offline', syncOnline);
syncOnline();

/* ---------- 서비스 워커가 새 버전을 알리면 새로고침 ---------- */
if ('serviceWorker' in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}
