// Yutis Host B&B admin (tenant: whatever path this page is served under).
// Built on the shared booking APIs; layout follows the admin Figma.
const API = 'api/';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-US');
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const ymd = d => d.toISOString().slice(0, 10);
const todayStr = () => { const d = new Date(); return ymd(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))); };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const md = s => { const d = new Date(s + 'T00:00:00Z'); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
const wd = s => WD[new Date(s + 'T00:00:00Z').getUTCDay()];

let token = '';
try { token = sessionStorage.getItem('yh-admin-' + location.pathname) || ''; } catch (e) { /* storage blocked */ }
const S = { page: 'overview', cfg: null, bookings: [], calFrom: todayStr(), sel: null };

const STATUS = {
  Pending: ['待付款', 'b-warn'], Paid: ['已付款', 'b-ok'], Completed: ['已退房', 'b-gray'], Cancelled: ['已取消', 'b-bad']
};
const badge = st => '<span class="badge ' + (STATUS[st] || ['', 'b-gray'])[1] + '">' + (STATUS[st] || [st])[0] + '</span>';

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
    body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body
  });
  const data = await res.json().catch(() => ({ success: false, message: '伺服器回應錯誤。' }));
  if (res.status === 403) { logout(); throw new Error('登入已過期'); }
  return data;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400);
}

function logout() {
  token = '';
  try { sessionStorage.removeItem('yh-admin-' + location.pathname); } catch (e) { /* ignore */ }
  renderLogin();
}

// ---------------- Login ----------------
function renderLogin() {
  document.body.innerHTML = '<form class="login" id="lf"><div class="logo"><i></i><div><b>Yutis Host</b><small>民宿管理後台</small></div></div>' +
    '<h1>登入後台</h1><p>示範帳號密碼：tide888</p><label class="f">管理密碼<input type="password" name="pw" autocomplete="current-password" required></label>' +
    '<button class="btn pri" type="submit">登入</button><div class="msg" id="lm" aria-live="polite"></div></form><div class="toast" id="toast" role="status"></div>';
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await fetch(API + 'admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: e.target.pw.value }) });
    const data = await res.json();
    if (!data.success) { $('#lm').textContent = data.message || '登入失敗'; return; }
    token = data.token;
    try { sessionStorage.setItem('yh-admin-' + location.pathname, token); } catch (err) { /* ignore */ }
    boot();
  });
  $('#lf').pw.focus();
}

// ---------------- Shell ----------------
const PAGES = [
  ['overview', '總覽'], ['calendar', '房態日曆'], ['orders', '訂單'], ['channels', '通路串接'], ['rooms', '房型與房價'],
  ['addons', '加購與優惠碼'], ['payout', '收款與撥款'], ['site', '網站與版型'], ['domain', '網域設定'], ['staff', '員工與權限'], ['settings', '民宿設定']
];

function shell() {
  const b = S.cfg.brand;
  const site = location.origin + location.pathname.replace(/admin(\.html)?$/, '');
  document.body.innerHTML = '<div class="wrap"><header class="topnav"><div class="logo"><i></i><div><b>Yutis Host</b><small>民宿管理後台</small></div></div>' +
    '<nav class="nav" aria-label="後台選單">' + PAGES.map(([k, l]) => '<button type="button" data-p="' + k + '"' + (S.page === k ? ' aria-current="page"' : '') + '>' + l + '</button>').join('') + '</nav>' +
    '<button type="button" class="me" id="logout" title="登出" style="border:0;cursor:pointer"><i></i><div style="text-align:left"><b>' + esc(b.name.slice(0, 2)) + '</b><small>擁有者 · 登出</small></div></button></header>' +
    '<div class="sub"><span class="chip">' + esc(b.name) + '</span><a href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(site.replace(/^https?:\/\//, '')) + ' ↗</a></div>' +
    '<main id="main"></main></div><div class="toast" id="toast" role="status"></div><dialog id="dlg"></dialog>';
  document.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.p)));
  $('#logout').onclick = logout;
}

function go(page) {
  S.page = page;
  document.querySelectorAll('[data-p]').forEach(b => { if (b.dataset.p === page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  try { history.replaceState(null, '', '#' + page); } catch (e) { /* ignore */ }
  ({ overview, calendar, orders, rooms, addons, payout, settings }[page] || soon)();
}

async function reload() {
  const [c, b] = await Promise.all([api('config'), api('admin/bookings')]);
  S.cfg = c.siteConfig;
  S.bookings = b.bookings || [];
}

const roomName = id => (S.cfg.rooms.find(r => r.id === id) || {}).name || id;
const live = b => b.paymentStatus !== 'Cancelled';
const paid = b => b.paymentStatus === 'Paid' || b.paymentStatus === 'Completed';
const isTransfer = b => !b.payment;

function holdLeft(b) {
  const mins = b.paymentMethod === 'transfer' ? 24 * 60 : 30;
  const left = mins * 60000 - (Date.now() - new Date(b.createdAt).getTime());
  if (left <= 0) return '保留已過期';
  return left > 3600000 ? '剩 ' + Math.ceil(left / 3600000) + ' 小時' : '剩 ' + Math.ceil(left / 60000) + ' 分';
}

function head(title, desc, btns = '') {
  return '<div class="head"><div><h1>' + title + '</h1><p>' + desc + '</p></div><div class="btns">' + btns + '</div></div>';
}

// ---------------- 總覽 ----------------
function overview() {
  const t = todayStr(), mon = t.slice(0, 7);
  const monthB = S.bookings.filter(b => live(b) && b.checkIn.slice(0, 7) === mon);
  const revenue = monthB.filter(paid).reduce((s, b) => s + b.totalPrice, 0);
  const pending = S.bookings.filter(b => b.paymentStatus === 'Pending');
  const units = S.cfg.rooms.reduce((s, r) => s + (r.units || 0), 0);
  const days = new Date(Date.UTC(+mon.slice(0, 4), +mon.slice(5, 7), 0)).getUTCDate();
  let sold = 0;
  S.bookings.filter(b => live(b) && b.paymentStatus !== 'Pending').forEach(b => {
    for (let d = b.checkIn; d < b.checkOut; d = addDays(d, 1)) if (d.slice(0, 7) === mon) sold++;
  });
  const occ = units ? Math.round(sold / (units * days) * 100) : 0;
  const ins = S.bookings.filter(b => live(b) && b.checkIn === t), outs = S.bookings.filter(b => live(b) && b.checkOut === t);

  const bars = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i);
    bars.push([d, S.bookings.filter(b => paid(b) && b.createdAt.slice(0, 10) === d).reduce((s, b) => s + b.totalPrice, 0)]);
  }
  const max = Math.max(1, ...bars.map(x => x[1]));
  const m = +mon.slice(5, 7);

  $('#main').innerHTML = head('早安，' + esc(S.cfg.brand.name), md(t) + '（' + wd(t) + '）· 今天 ' + ins.length + ' 組入住、' + outs.length + ' 組退房，有 ' + pending.length + ' 件事要處理',
      '<button class="btn" data-go="calendar">看房態日曆</button><button class="btn pri" id="newB">＋ 手動建單</button>') +
    '<div class="grid4">' +
      '<div class="stat"><small>' + m + ' 月營收</small><b>' + money(revenue) + ' 元</b><span>已付款訂單，依入住日計</span></div>' +
      '<div class="stat"><small>' + m + ' 月住房率</small><b>' + occ + '%</b><span>' + sold + ' 間夜 / 共 ' + units * days + ' 間夜</span></div>' +
      '<div class="stat"><small>' + m + ' 月訂單</small><b>' + monthB.length + ' 筆</b><span>官網直訂 ' + monthB.length + ' · 訂房平台 0</span></div>' +
      '<div class="stat"><small>待處理</small><b>' + pending.length + ' 件</b><span>' + pending.filter(b => b.paymentMethod === 'transfer').length + ' 筆匯款待確認</span></div></div>' +
    '<div class="two"><div class="card"><div class="ch"><div><h2>近 14 天營收</h2><p>依付款訂單建立日，已扣除取消訂單</p></div><span class="badge b-gray">每日</span></div>' +
      '<div class="bars">' + bars.map(([d, v]) => '<div><span>' + (v ? money(v) : '') + '</span><i style="height:' + Math.round(v / max * 100) + '%"></i><span>' + md(d) + '</span></div>').join('') + '</div></div>' +
      '<div class="card"><div class="ch"><div><h2>訂單來源</h2><p>' + m + ' 月，依訂單數</p></div></div><div class="list">' +
        '<div class="row"><span>官網直訂</span><b>100%</b></div><div class="row"><span>Booking.com · Agoda</span><span class="note">尚未串接</span></div>' +
        '<p class="note" style="margin:12px 0 0">官網直訂不付平台抽成。串接訂房平台後，這裡會分開統計。</p></div></div></div>' +
    '<div class="two"><div class="card"><div class="ch"><div><h2>待處理</h2><p>需要你確認的事</p></div></div><div class="list">' +
      (pending.length ? pending.map(b => '<div class="row"><div><b>' + (b.paymentMethod === 'transfer' ? '確認匯款入帳 ' : '保留中 ') + esc(b.id) + '</b><small>' + esc(b.name) + ' · ' + md(b.checkIn) + ' ' + esc(roomName(b.roomType)) + ' · ' + money(b.totalPrice) + ' 元</small></div>' +
        '<span class="badge b-hold">' + holdLeft(b) + '</span><button class="btn link" data-paid="' + esc(b.id) + '">確認入帳</button></div>').join('') : '<div class="empty">目前沒有待處理的事</div>') +
    '</div></div><div class="card"><div class="ch"><div><h2>今日入住與退房</h2><p>' + md(t) + '（' + wd(t) + '）</p></div><button class="btn sm" data-go="orders">全部名單</button></div><div class="list">' +
      (ins.concat(outs).map(b => '<div class="row"><div><b>' + esc(b.name) + '</b><small>' + (b.checkIn === t ? '入住' : '退房') + '</small></div><div>' + esc(roomName(b.roomType)) + ' · ' + b.nights + ' 晚</div>' + badge(b.paymentStatus) + '</div>').join('') || '<div class="empty">今天沒有入住或退房</div>') +
    '</div></div></div><p class="note">示範資料，旅客姓名為虛構。</p>';

  $('#main').querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  $('#main').querySelectorAll('[data-paid]').forEach(b => b.onclick = () => setStatus(b.dataset.paid, 'Paid'));
  $('#newB').onclick = () => newBooking();
}

async function setStatus(id, st) {
  const data = await api('admin/bookings/' + encodeURIComponent(id), { method: 'PUT', body: { paymentStatus: st } });
  if (!data.success) return toast(data.message);
  toast('訂單 ' + id + ' 已改為' + STATUS[st][0]);
  await reload(); go(S.page);
}

// ---------------- 房態日曆 ----------------
async function calendar() {
  const from = S.calFrom, t = todayStr();
  const data = await api('admin/inventory?from=' + from + '&days=14');
  const ins = S.bookings.filter(b => live(b) && b.checkIn === t), outs = S.bookings.filter(b => live(b) && b.checkOut === t);
  const held = S.bookings.filter(b => b.paymentStatus === 'Pending');
  const tn = data.rooms.map(r => r.nights[t]).filter(Boolean);
  const leftToday = tn.reduce((s, n) => s + n.left, 0);
  const end = addDays(from, 13);

  $('#main').innerHTML = head('房態日曆', from.replace(/-/g, '/') + ' 至 ' + end.slice(5).replace('-', '/') + ' · 點一格看當晚訂單，可連續點選同一房型的多個日期，再批次關房或改價',
      '<button class="btn" id="prevW">◀ 上兩週</button><button class="btn" id="todayW">今天</button><button class="btn" id="nextW">下兩週 ▶</button>') +
    '<div class="grid4"><div class="stat"><small>今日入住</small><b>' + ins.length + ' 組</b><span>' + (ins.map(b => esc(roomName(b.roomType))).join('、') || '—') + '</span></div>' +
      '<div class="stat"><small>今日退房</small><b>' + outs.length + ' 組</b><span>' + (outs.map(b => esc(roomName(b.roomType))).join('、') || '—') + '</span></div>' +
      '<div class="stat"><small>保留中</small><b>' + held.length + ' 筆</b><span>' + (held[0] ? esc(held[0].id) + ' ' + holdLeft(held[0]) : '沒有待付款訂單') + '</span></div>' +
      '<div class="stat"><small>今晚空房</small><b>' + leftToday + ' 間</b><span>即時庫存，官網不會超賣</span></div></div>' +
    '<div class="legend">圖例 <span class="badge b-warn">剩 1 間</span><span class="badge b-bad">客滿</span><span class="badge b-gray">關房</span><span class="badge b-hold">含保留中訂單</span><span class="badge" style="color:var(--o2)">橘字＝自訂房價</span></div>' +
    '<div class="tblw"><table class="cal"><thead><tr><th>房型（總間數）</th>' + data.dates.map(d => '<th class="' + (d === t ? 'today' : '') + ([5, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay()) ? ' we' : '') + '">' + (d === t ? '今天' : md(d)) + '<br><small>' + wd(d) + '</small></th>').join('') + '</tr></thead><tbody>' +
      data.rooms.map(r => '<tr><td><b>' + esc(r.name) + '</b><small>' + r.units + ' 間 · 平日 ' + money(r.priceWeekday) + '／假日 ' + money(r.priceHoliday) + '</small></td>' + data.dates.map(d => {
        const n = r.nights[d];
        const cls = n.closed ? 'closed' : n.left === 0 ? (n.held ? 'held' : 'full') : n.held ? 'held' : n.left === 1 && n.units > 1 ? 'few' : '';
        const custom = n.price !== (n.weekend ? r.priceHoliday : r.priceWeekday);
        const sel = S.sel && S.sel.room === r.id && S.sel.dates.includes(d);
        return '<td class="c ' + cls + (sel ? ' sel' : '') + '" data-r="' + esc(r.id) + '" data-d="' + d + '" tabindex="0"><b>' + (n.closed ? '關房' : n.left === 0 ? (n.held ? '保留中' : '客滿') : n.left + '/' + n.units) + '</b><small class="' + (custom ? 'pr' : '') + '">' + money(n.price) + '</small></td>';
      }).join('') + '</tr>').join('') +
    '</tbody></table></div>' +
    '<div class="two" style="margin-top:16px"><div class="card"><div class="ch"><div><h2>今日入住與退房 · ' + md(t) + '（' + wd(t) + '）</h2></div></div><div class="list">' +
      (ins.concat(outs).map(b => '<div class="row"><div><b>' + esc(b.name) + '</b><small>' + (b.checkIn === t ? '入住' : '退房') + ' · ' + esc(roomName(b.roomType)) + ' · ' + b.nights + ' 晚</small></div>' + badge(b.paymentStatus) + '</div>').join('') || '<div class="empty">今天沒有入住或退房</div>') +
    '</div></div><div class="card" id="cellPanel"></div></div>';

  $('#prevW').onclick = () => { S.calFrom = addDays(S.calFrom, -14); S.sel = null; calendar(); };
  $('#nextW').onclick = () => { S.calFrom = addDays(S.calFrom, 14); S.sel = null; calendar(); };
  $('#todayW').onclick = () => { S.calFrom = todayStr(); S.sel = null; calendar(); };
  const pick = td => {
    const { r, d } = td.dataset;
    if (!S.sel || S.sel.room !== r) S.sel = { room: r, dates: [d] };
    else if (S.sel.dates.includes(d)) S.sel.dates = S.sel.dates.filter(x => x !== d);
    else S.sel.dates.push(d);
    S.sel.dates.sort();
    document.querySelectorAll('.cal td.c').forEach(c => c.classList.toggle('sel', S.sel.room === c.dataset.r && S.sel.dates.includes(c.dataset.d)));
    panel(data);
  };
  document.querySelectorAll('.cal td.c').forEach(td => {
    td.addEventListener('click', () => pick(td));
    td.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(td); } });
  });
  panel(data);
}

function panel(data) {
  const box = $('#cellPanel');
  if (!S.sel || !S.sel.dates.length) {
    box.innerHTML = '<div class="ch"><div><h2>選取日期</h2><p>點表格中的格子查看當晚訂單；同一房型可點選多天，再一次關房或改價。</p></div></div>';
    return;
  }
  const r = data.rooms.find(x => x.id === S.sel.room);
  const ds = S.sel.dates, first = r.nights[ds[0]];
  const allClosed = ds.every(d => r.nights[d].closed);
  const guests = ds.length === 1 ? first.guests : [];
  box.innerHTML = '<div class="ch"><div><h2>' + (ds.length === 1 ? md(ds[0]) + '（' + wd(ds[0]) + '）' : ds.length + ' 晚 · ' + md(ds[0]) + ' 起') + ' ' + esc(r.name) + '</h2>' +
    (ds.length === 1 ? '<p>總 ' + first.units + ' 間 · 已售 ' + first.booked + ' · 保留 ' + first.held + ' · ' + (first.closed ? '已關房' : '剩 ' + first.left) + '</p>' : '<p>' + ds.map(md).join('、') + '</p>') + '</div></div>' +
    (ds.length === 1 ? '<p style="margin:0 0 6px">當晚房價 ' + money(first.price) + ' 元（' + (first.weekend ? '假日' : '平日') + '）</p>' + guests.map(g => '<p class="note" style="margin:0">訂單 ' + esc(g.id) + ' · ' + esc(g.name) + ' · ' + (STATUS[g.status] || [g.status])[0] + '</p>').join('') : '') +
    '<div class="btns" style="margin-top:12px"><button class="btn" id="cClose">' + (allClosed ? '開房' : '關房') + '</button><button class="btn" id="cPrice">改當日價</button>' +
    (ds.length === 1 && first.left > 0 ? '<button class="btn pri" id="cNew">手動建單</button>' : '') + '<button class="btn link" id="cClear">清除選取</button></div>';
  const put = async body => {
    const res = await api('admin/inventory', { method: 'PUT', body: { roomId: r.id, dates: ds, ...body } });
    toast(res.message); calendar();
  };
  $('#cClose').onclick = () => put({ closed: !allClosed });
  $('#cPrice').onclick = () => priceDialog(r, ds, put);
  $('#cClear').onclick = () => { S.sel = null; calendar(); };
  if ($('#cNew')) $('#cNew').onclick = () => newBooking({ room: r.id, checkIn: ds[0], checkOut: addDays(ds[0], 1) });
}

function priceDialog(r, ds, put) {
  const dlg = $('#dlg');
  dlg.innerHTML = '<form method="dialog"><h3>改當日價 · ' + esc(r.name) + '</h3><p class="note">' + ds.map(md).join('、') + '。留空並儲存會恢復平日／假日原價。</p>' +
    '<label class="f">每晚房價（元）<input type="number" name="price" min="0" step="100" placeholder="' + r.priceWeekday + '"></label>' +
    '<div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn" value="cancel">取消</button><button class="btn pri" value="ok">儲存</button></div></form>';
  dlg.showModal();
  dlg.onclose = () => { if (dlg.returnValue === 'ok') put({ price: dlg.querySelector('[name=price]').value || 0 }); };
}

function newBooking(pre = {}) {
  const dlg = $('#dlg'), t = todayStr();
  dlg.innerHTML = '<form method="dialog" id="nb"><h3>手動建單</h3><p class="note">電話或現場訂房。建立後是「待付款」，收到款項後在訂單頁確認入帳。</p><div class="form-grid" style="margin-top:12px">' +
    '<label class="f span2">房型<select name="roomType">' + S.cfg.rooms.map(r => '<option value="' + esc(r.id) + '"' + (r.id === pre.room ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select></label>' +
    '<label class="f">入住<input type="date" name="checkIn" value="' + (pre.checkIn || t) + '" required></label><label class="f">退房<input type="date" name="checkOut" value="' + (pre.checkOut || addDays(t, 1)) + '" required></label>' +
    '<label class="f span2">旅客姓名<input name="name" required></label><label class="f span2">手機<input name="phone" required></label>' +
    '<label class="f">大人<input type="number" name="adults" value="2" min="1" max="6"></label><label class="f">小孩<input type="number" name="kids" value="0" min="0" max="4"></label>' +
    '<label class="f span2">備註<input name="note"></label></div><div class="msg" id="nbm"></div>' +
    '<div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn" value="cancel" formnovalidate>取消</button><button class="btn pri" id="nbOk" type="button">建立訂單</button></div></form>';
  dlg.showModal();
  $('#nbOk').onclick = async () => {
    const f = $('#nb');
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    body.note = ('（後台手動建單）' + body.note).trim();
    const data = await api('bookings', { method: 'POST', body });
    if (!data.success) { $('#nbm').textContent = data.message; return; }
    dlg.close(); toast('已建立訂單 ' + data.bookingId);
    await reload(); go(S.page);
  };
}

// ---------------- 訂單 ----------------
function orders() {
  $('#main').innerHTML = head('訂單', '共 ' + S.bookings.length + ' 筆 · 匯款訂單收到款項後按「確認入帳」，會一併核銷優惠碼',
      '<button class="btn pri" id="newB">＋ 手動建單</button>') +
    '<div class="filters"><input type="search" id="q" placeholder="搜尋姓名、電話、訂單編號" aria-label="搜尋訂單"><select id="fs" aria-label="付款狀態"><option value="">全部狀態</option>' +
    Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '">' + v[0] + '</option>').join('') + '</select>' +
    '<select id="fr" aria-label="房型"><option value="">全部房型</option>' + S.cfg.rooms.map(r => '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>').join('') + '</select></div>' +
    '<div class="tblw"><table class="dt"><thead><tr><th>訂單</th><th>旅客</th><th>房型</th><th>入住</th><th>金額</th><th>付款</th><th>狀態</th><th></th></tr></thead><tbody id="ob"></tbody></table></div>';
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase(), fs = $('#fs').value, fr = $('#fr').value;
    const rows = S.bookings.filter(b => (!fs || b.paymentStatus === fs) && (!fr || b.roomType === fr) &&
      (!q || [b.id, b.name, b.phone].some(x => String(x).toLowerCase().includes(q))));
    $('#ob').innerHTML = rows.map(b => '<tr><td><b>' + esc(b.id) + '</b><small>' + b.createdAt.slice(0, 10) + '</small></td><td>' + esc(b.name) + '<small>' + esc(b.phone) + '</small></td>' +
      '<td>' + esc(roomName(b.roomType)) + '<small>' + b.adults + ' 大 ' + b.kids + ' 小</small></td><td>' + md(b.checkIn) + ' – ' + md(b.checkOut) + '<small>' + b.nights + ' 晚</small></td>' +
      '<td>' + money(b.totalPrice) + (b.discount ? '<small>' + esc(b.promoCode) + ' −' + money(b.discount) + '</small>' : '') + '</td>' +
      '<td>' + (b.payment ? '信用卡<small>末四碼 ' + esc(b.payment.cardLastFour) + '</small>' : b.paymentMethod === 'transfer' ? '銀行轉帳' : '—') + '</td>' +
      '<td>' + badge(b.paymentStatus) + (b.paymentStatus === 'Pending' ? '<small>' + holdLeft(b) + '</small>' : '') + '</td><td style="white-space:nowrap">' +
      (b.paymentStatus === 'Pending' ? '<button class="btn sm pri" data-s="Paid" data-id="' + esc(b.id) + '">確認入帳</button> <button class="btn sm danger" data-s="Cancelled" data-id="' + esc(b.id) + '">取消</button>' : '') +
      (b.paymentStatus === 'Paid' ? '<button class="btn sm" data-s="Completed" data-id="' + esc(b.id) + '">標記退房</button>' : '') + '</td></tr>').join('') ||
      '<tr><td colspan="8" class="empty">沒有符合條件的訂單</td></tr>';
    $('#ob').querySelectorAll('[data-s]').forEach(btn => btn.onclick = () => {
      if (btn.dataset.s === 'Cancelled' && !confirm('確定取消訂單 ' + btn.dataset.id + '？取消後房間會釋出。')) return;
      setStatus(btn.dataset.id, btn.dataset.s);
    });
  };
  ['q', 'fs', 'fr'].forEach(id => $('#' + id).addEventListener('input', draw));
  $('#newB').onclick = () => newBooking();
  draw();
}

// ---------------- 房型與房價 ----------------
function rooms() {
  $('#main').innerHTML = head('房型與房價', '間數就是每晚可賣的庫存，官網訂房會依此檢查空房；單日特價請到房態日曆設定', '<button class="btn pri" id="saveR">儲存變更</button>') +
    '<div class="card">' + S.cfg.rooms.map((r, i) => '<div class="roomcard"><img src="' + esc(r.images[0]) + '" alt="' + esc(r.name) + '"><div class="form-grid">' +
      '<label class="f span2">房型名稱<input data-i="' + i + '" data-k="name" value="' + esc(r.name) + '"></label><label class="f">標籤<input data-i="' + i + '" data-k="tag" value="' + esc(r.tag) + '"></label>' +
      '<label class="f">間數（庫存）<input type="number" min="0" max="50" data-i="' + i + '" data-k="units" value="' + r.units + '"></label>' +
      '<label class="f">平日價<input type="number" min="0" step="100" data-i="' + i + '" data-k="priceWeekday" value="' + r.priceWeekday + '"></label>' +
      '<label class="f">假日價（週五、六）<input type="number" min="0" step="100" data-i="' + i + '" data-k="priceHoliday" value="' + r.priceHoliday + '"></label>' +
      '<label class="f">最多入住人數<input type="number" min="1" max="12" data-i="' + i + '" data-k="maxGuests" value="' + r.maxGuests + '"></label>' +
      '<label class="f">坪數<input data-i="' + i + '" data-k="size" value="' + esc(r.size) + '"></label>' +
      '<label class="f span4">一句話介紹（首頁卡片）<input data-i="' + i + '" data-k="desc" value="' + esc(r.desc) + '"></label></div></div>').join('') + '</div>';
  $('#saveR').onclick = async () => {
    const next = S.cfg.rooms.map(r => ({ ...r }));
    document.querySelectorAll('[data-k]').forEach(inp => {
      const r = next[inp.dataset.i], k = inp.dataset.k;
      r[k] = inp.type === 'number' ? Math.max(0, parseInt(inp.value, 10) || 0) : inp.value.trim();
    });
    const data = await api('admin/config/rooms', { method: 'PUT', body: { rooms: next } });
    toast(data.message); await reload(); rooms();
  };
}

// ---------------- 加購與優惠碼 ----------------
async function addons() {
  const pc = await api('admin/promocodes');
  $('#main').innerHTML = head('加購與優惠碼', '加購項目會出現在官網訂房第二步；優惠碼在訂單付款後才算使用（核銷）') +
    '<div class="two"><div class="card"><div class="ch"><div><h2>加購項目</h2><p>價格 × 數量，由系統計算</p></div><button class="btn sm pri" id="saveA">儲存</button></div>' +
      '<table class="dt"><thead><tr><th>名稱</th><th>價格</th><th>單位</th><th></th></tr></thead><tbody id="ab">' +
      (S.cfg.addons || []).map(a => addonRow(a)).join('') + '</tbody></table><button class="btn sm" id="addA" style="margin-top:10px">＋ 新增項目</button></div>' +
    '<div class="card"><div class="ch"><div><h2>新增優惠碼</h2></div></div><form id="pf" class="form-grid" style="grid-template-columns:1fr 1fr">' +
      '<label class="f">代碼<input name="code" required placeholder="SUMMER10"></label><label class="f">類型<select name="type"><option value="amount">折抵金額</option><option value="percent">百分比</option></select></label>' +
      '<label class="f">數值<input type="number" name="value" min="1" required></label><label class="f">使用上限（0＝不限）<input type="number" name="maxUses" min="0" value="0"></label>' +
      '<label class="f">到期日<input type="date" name="expiresAt"></label><label class="f">備註<input name="note"></label>' +
      '<div class="span4"><button class="btn pri" type="submit">建立優惠碼</button></div></form></div></div>' +
    '<div class="card"><div class="ch"><div><h2>優惠碼</h2></div></div><table class="dt"><thead><tr><th>代碼</th><th>折扣</th><th>已使用</th><th>到期</th><th>狀態</th><th></th></tr></thead><tbody>' +
      ((pc.promoCodes || []).map(p => '<tr><td><b>' + esc(p.code) + '</b><small>' + esc(p.note) + '</small></td><td>' + (p.type === 'percent' ? p.value + '%' : money(p.value) + ' 元') + '</td>' +
        '<td>' + p.usedCount + (p.maxUses ? ' / ' + p.maxUses : '') + '</td><td>' + (p.expiresAt || '不限') + '</td><td>' + (p.enabled ? '<span class="badge b-ok">啟用</span>' : '<span class="badge b-gray">停用</span>') + '</td>' +
        '<td><button class="btn sm" data-pc="' + esc(p.code) + '" data-en="' + (p.enabled ? 0 : 1) + '">' + (p.enabled ? '停用' : '啟用') + '</button></td></tr>').join('') || '<tr><td colspan="6" class="empty">還沒有優惠碼</td></tr>') +
    '</tbody></table></div>';
  const wireRows = () => $('#ab').querySelectorAll('.rmA').forEach(b => b.onclick = () => b.closest('tr').remove());
  wireRows();
  $('#addA').onclick = () => { $('#ab').insertAdjacentHTML('beforeend', addonRow({ id: 'a' + Date.now().toString(36), name: '', price: 0, unit: '人' })); wireRows(); };
  $('#saveA').onclick = async () => {
    const list = [...$('#ab').querySelectorAll('tr')].map(tr => ({ id: tr.dataset.id, name: tr.querySelector('[name=n]').value.trim(), price: parseInt(tr.querySelector('[name=p]').value, 10) || 0, unit: tr.querySelector('[name=u]').value.trim() || '人' })).filter(a => a.name);
    const data = await api('admin/config/addons', { method: 'PUT', body: { addons: list } });
    toast(data.message); await reload(); addons();
  };
  $('#pf').addEventListener('submit', async e => {
    e.preventDefault();
    const data = await api('admin/promocodes', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    toast(data.message); if (data.success) addons();
  });
  document.querySelectorAll('[data-pc]').forEach(b => b.onclick = async () => {
    const data = await api('admin/promocodes/' + encodeURIComponent(b.dataset.pc), { method: 'PUT', body: { enabled: b.dataset.en === '1' } });
    toast(data.message); addons();
  });
}
const addonRow = a => '<tr data-id="' + esc(a.id) + '"><td><input name="n" value="' + esc(a.name) + '" aria-label="名稱" class="f" style="border:1px solid var(--line);border-radius:10px;padding:6px 10px;width:100%"></td>' +
  '<td><input name="p" type="number" min="0" value="' + a.price + '" aria-label="價格" style="border:1px solid var(--line);border-radius:10px;padding:6px 10px;width:90px"></td>' +
  '<td><input name="u" value="' + esc(a.unit) + '" aria-label="單位" style="border:1px solid var(--line);border-radius:10px;padding:6px 10px;width:70px"></td><td><button type="button" class="btn sm link rmA">移除</button></td></tr>';

// ---------------- 收款與撥款 ----------------
async function payout() {
  const pc = await api('payment/config');
  const mon = todayStr().slice(0, 7);
  const card = S.bookings.filter(b => paid(b) && b.payment && b.payment.paidAt && b.payment.paidAt.slice(0, 7) === mon);
  const cardSum = card.reduce((s, b) => s + b.totalPrice, 0), fee = Math.round(cardSum * 0.08);
  const methods = pc.methods;
  $('#main').innerHTML = head('收款與撥款', '信用卡由平台代收（TapPay，含 3D 驗證），手續費 8%；銀行轉帳直接匯入民宿帳戶') +
    '<div class="grid4"><div class="stat"><small>本月信用卡收款</small><b>' + money(cardSum) + '</b><span>' + card.length + ' 筆</span></div>' +
      '<div class="stat"><small>平台手續費 8%</small><b>' + money(fee) + '</b><span>撥款時扣除</span></div>' +
      '<div class="stat"><small>預計撥款</small><b>' + money(cardSum - fee) + '</b><span>示範：每月 5 日撥入</span></div>' +
      '<div class="stat"><small>金流環境</small><b style="font-size:20px">' + (pc.env === 'production' ? '正式' : '測試（Sandbox）') + '</b><span>App ID ' + esc(pc.appId) + '</span></div></div>' +
    '<div class="two"><div class="card"><div class="ch"><div><h2>開放的付款方式</h2><p>旅客在付款頁可以選的方式</p></div></div>' +
      '<div class="toggle" role="group" aria-label="付款方式">' + [['both', '信用卡＋轉帳'], ['card', '只收信用卡'], ['transfer', '只收轉帳']].map(([k, l]) => '<button type="button" data-m="' + k + '" aria-pressed="' + (methods === k) + '">' + l + '</button>').join('') + '</div>' +
      '<p class="note" style="margin-top:12px">信用卡訂單未付款會保留房間 30 分鐘，轉帳訂單保留 24 小時，逾時自動釋出房間。</p></div>' +
    '<div class="card"><div class="ch"><div><h2>匯款資訊</h2><p>顯示在付款頁的轉帳說明</p></div><button class="btn sm pri" id="saveT">儲存</button></div>' +
      '<textarea id="tinfo" rows="6" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:10px 12px">' + esc(S.cfg.rules.payment) + '</textarea></div></div>';
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
    const data = await api('admin/settings/payment-methods', { method: 'PUT', body: { method: b.dataset.m } });
    toast(data.message); payout();
  });
  $('#saveT').onclick = async () => {
    const data = await api('admin/config/rules', { method: 'PUT', body: { rules: { ...S.cfg.rules, payment: $('#tinfo').value } } });
    toast(data.message); await reload();
  };
}

// ---------------- 民宿設定 ----------------
function settings() {
  $('#main').innerHTML = head('民宿設定', '基本資料與後台密碼') +
    '<div class="two"><div class="card"><div class="ch"><div><h2>基本資料</h2><p>官網頁尾與付款確認信會用到</p></div></div><div class="list">' +
      '<div class="row"><span>民宿名稱</span><b>' + esc(S.cfg.brand.name) + '</b></div><div class="row"><span>英文名稱</span><b>' + esc(S.cfg.brand.en) + '</b></div>' +
      '<div class="row"><span>地址</span><span>' + esc(S.cfg.brand.address) + '</span></div><div class="row"><span>電話</span><span>' + esc(S.cfg.brand.phone) + '</span></div>' +
      '<div class="row"><span>入退房</span><span>' + esc(S.cfg.rules.checkin) + '</span></div></div></div>' +
    '<div class="card"><div class="ch"><div><h2>修改後台密碼</h2></div></div><form id="pw" style="display:grid;gap:10px"><label class="f">新密碼（至少 4 碼）<input type="password" name="p" minlength="4" required autocomplete="new-password"></label><button class="btn pri" type="submit">更新密碼</button></form></div></div>';
  $('#pw').addEventListener('submit', async e => {
    e.preventDefault();
    const data = await api('admin/settings/password', { method: 'PUT', body: { newPassword: e.target.p.value } });
    toast(data.message); e.target.reset();
  });
}

// ---------------- Not built yet ----------------
const SOON = {
  channels: ['通路串接', '串接 Booking.com、Agoda、Trip.com 的房態與訂單（iCal／Channel Manager），平台訂單進來會自動扣庫存。'],
  site: ['網站與版型', '切換潮汐、漁港、珊瑚三套版型，編輯首頁文案與區塊順序。房型、價格與文章不需重填。'],
  domain: ['網域設定', '把自有網域（例如 www.tidehouse.tw）指向 Yutis Host。系統已能依網域辨識民宿，這裡之後會提供 DNS 設定步驟與 SSL 狀態。'],
  staff: ['員工與權限', '新增房務、櫃檯帳號，分別設定能看訂單、改房價或只看房態日曆。']
};
function soon() {
  const [t, d] = SOON[S.page] || ['即將推出', ''];
  $('#main').innerHTML = '<div class="soon"><span class="badge b-hold">下一階段</span><h2 style="margin-top:12px">' + t + '</h2><p>' + d + '</p></div>';
}

async function boot() {
  try { await reload(); } catch (e) { return; }
  const p = location.hash.slice(1);
  if (PAGES.some(x => x[0] === p)) S.page = p;
  shell(); go(S.page);
}

if (token) boot(); else renderLogin();
