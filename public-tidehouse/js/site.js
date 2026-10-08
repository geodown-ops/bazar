// 潮裡小木屋 guest site: homepage, room detail and booking flow.
// All copy, rooms and prices come from the tenant config (api/config), which
// the B&B edits in its admin. API paths are relative so the same files work
// under host.yutis.net/tidehouse and on a custom domain.
const API = 'api/';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => 'NT$' + Number(n || 0).toLocaleString('en-US');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const ARW = '<svg viewBox="0 0 26 12" width="26" height="12" aria-hidden="true"><path d="M0 6h24.5M19 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

const ymd = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const todayStr = () => { const d = new Date(); return ymd(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))); };
const shortDate = s => { const d = new Date(s + 'T00:00:00Z'); return (d.getUTCMonth() + 1) + '.' + d.getUTCDate() + ' ' + WD[d.getUTCDay()]; };
const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

async function getJSON(url, opts) {
  const res = await fetch(API + url, opts);
  return res.json();
}

function markSVG(col, cls = 'mark') {
  let s = '<svg class="' + cls + '" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="cpt' + cls + '"><circle cx="50" cy="50" r="46"/></clipPath></defs><g clip-path="url(#cpt' + cls + ')" fill="' + col + '">';
  for (let i = 0; i < 12; i++) { const y = 6 + i * 7.6, h = 1.2 + i * 0.42; s += '<path d="M0 ' + y + ' Q25 ' + (y - 3) + ' 50 ' + y + ' T100 ' + y + ' V' + (y + h) + ' Q75 ' + (y + h + 3) + ' 50 ' + (y + h) + ' T0 ' + (y + h) + 'Z"/>'; }
  return s + '</g></svg>';
}

function spMark(kind) {
  const id = 'sp' + kind;
  let b = '', top = '', defs = '<clipPath id="' + id + 'c"><circle cx="50" cy="50" r="46"/></clipPath>';
  const band = (i, lift) => { const y = 6 + i * 7.6, h = 1.2 + i * 0.42; let a = '', z = ''; for (let x = 0; x <= 100; x += 4) { const w = 1.5 * Math.sin(Math.PI * x / 50) + (lift ? lift(x, i) : 0); a += (x ? ' L' : 'M') + x + ' ' + (y - w).toFixed(2); } for (let x = 100; x >= 0; x -= 4) { const w = 1.5 * Math.sin(Math.PI * x / 50) + (lift ? lift(x, i) : 0); z += ' L' + x + ' ' + (y + h - w).toFixed(2); } return '<path d="' + a + z + 'Z"/>'; };
  if (kind === 'sun') { defs += '<clipPath id="' + id + 's"><path clip-rule="evenodd" d="M0 0H100V46.2H0Z M0 36.4H100V37.8H0Z M0 41.2H100V43.2H0Z"/></clipPath>'; top = '<g clip-path="url(#' + id + 's)"><circle cx="50" cy="47" r="22"/></g>'; for (let i = 6; i < 12; i++) b += band(i); }
  else { defs += '<clipPath id="' + id + 'm"><path clip-rule="evenodd" d="M0 0H100V100H0Z M52 23a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/></clipPath>'; top = '<g clip-path="url(#' + id + 'm)"><circle cx="58" cy="30" r="16"/></g>'; const lift = (x, i) => 3.2 * Math.max(0, (11 - i) / 5) * Math.exp(-(((x - 58) / 16) ** 2)); for (let i = 6; i < 12; i++) b += band(i, lift); }
  return '<svg class="sp-mk" viewBox="0 0 100 100" aria-hidden="true"><defs>' + defs + '</defs><g clip-path="url(#' + id + 'c)" fill="currentColor">' + top + b + '</g></svg>';
}

const px = (src, speed, cls = 'bgwrap') => '<div class="' + cls + '" aria-hidden="true"><div class="px" data-speed="' + speed + '" style="background-image:url(' + esc(src) + ')"></div></div>';

function applyBrand(cfg) {
  const c = (cfg.brand && cfg.brand.colors) || {};
  Object.entries(c).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));
}

// Sticky header for inner pages
function topBar(cfg) {
  const b = cfg.brand;
  return '<header class="s-top solid"><a class="brand" href="./">' + markSVG('var(--d)') + esc(b.en) + '</a>' +
    '<nav aria-label="主選單"><a href="./#rooms">房型</a><a href="./#acts">島嶼玩法</a><a href="./#contact">聯絡</a></nav>' +
    '<a class="bk" href="book.html">立即訂房 ' + ARW + '</a></header>';
}

function footer(cfg) {
  const b = cfg.brand;
  return '<footer><div class="foot"><div class="fm">' + markSVG('var(--d)') + '<span>' + esc(b.en) + '</span></div>' +
    '<div><b>房型</b>' + cfg.rooms.map(r => '<a href="room.html?id=' + esc(r.id) + '">' + esc(r.name) + '</a>').join('') + '</div>' +
    '<div><b>島嶼玩法</b>' + (cfg.guide || []).map(g => '<span>' + esc(g.name) + '</span>').join('') + '</div>' +
    '<div><b>住宿須知</b><span>' + esc(cfg.rules.checkin) + '</span><span>取消政策見訂房頁</span><a href="book.html">線上訂房</a></div></div>' +
    '<div class="copy">© ' + new Date().getFullYear() + ' ' + esc(b.name) + ' · 由 Yutis Host 提供訂房系統</div></footer>';
}

function roomPhotos(r, eager) {
  return r.images.map((src, j) => '<img class="rs' + (j ? '' : ' on') + '" src="' + esc(src) + '" alt="' + esc(r.name) + '照片 ' + (j + 1) + '"' + (eager ? '' : ' loading="lazy"') + '>').join('') +
    (r.images.length > 1 ? '<div class="r-dots" role="group" aria-label="' + esc(r.name) + '照片">' + r.images.map((_, j) => '<button type="button" aria-label="第 ' + (j + 1) + ' 張"' + (j ? '' : ' aria-current="true"') + '></button>').join('') + '</div>' : '');
}

// ---- interactions (ported from the design preview) ----
function photoWire(el) {
  el.querySelectorAll('.ph,.sp-ph').forEach(ph => {
    const sl = [...ph.querySelectorAll('.rs')], ds = [...ph.querySelectorAll('.r-dots button')];
    if (sl.length < 2) return;
    let cur = 0, x0 = null;
    const go = i => { cur = (i + sl.length) % sl.length; sl.forEach((x, j) => x.classList.toggle('on', j === cur)); ds.forEach((d, j) => d.setAttribute('aria-current', j === cur ? 'true' : 'false')); };
    ds.forEach((d, j) => d.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(j); }));
    ph.addEventListener('pointerdown', e => { x0 = e.clientX; });
    ph.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 30) go(cur + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  });
}

const carNav = (id, lb) => '<div class="more car-nav" data-car-nav="' + id + '"><button type="button" class="cbtn prev" aria-label="上一組' + lb + '" aria-disabled="true">' + ARW + '</button><button type="button" class="cbtn next" aria-label="下一組' + lb + '">' + ARW + '</button></div>';
function carWire(el) {
  el.querySelectorAll('[data-car]').forEach(car => {
    const tr = car.querySelector('.car-track'), items = [...tr.children], nav = el.querySelector('[data-car-nav="' + car.dataset.car + '"]');
    if (!nav || !items.length) return;
    const pv = nav.querySelector('.prev'), nx = nav.querySelector('.next');
    let p = 0;
    const upd = () => {
      const off = getComputedStyle(nav).display === 'none', w = items[0].getBoundingClientRect().width, g = parseFloat(getComputedStyle(tr).columnGap) || 0;
      const n = Math.max(1, Math.round((tr.clientWidth + g) / (w + g))), max = Math.max(0, items.length - n);
      if (off) { p = 0; tr.style.transform = ''; items.forEach(it => { it.classList.remove('off-l', 'off-r'); it.inert = false; }); return; }
      p = Math.min(Math.max(p, 0), max); tr.style.transform = 'translateX(' + (-p * (w + g)) + 'px)';
      items.forEach((it, i) => { const l = i < p, r = i >= p + n; it.classList.toggle('off-l', l); it.classList.toggle('off-r', r); it.inert = l || r; });
      pv.setAttribute('aria-disabled', p === 0 ? 'true' : 'false'); nx.setAttribute('aria-disabled', p >= max ? 'true' : 'false');
    };
    pv.addEventListener('click', () => { if (pv.getAttribute('aria-disabled') !== 'true') { p--; upd(); } });
    nx.addEventListener('click', () => { if (nx.getAttribute('aria-disabled') !== 'true') { p++; upd(); } });
    new ResizeObserver(upd).observe(tr); upd();
  });
}

function heroWire(el) {
  const sl = [...el.querySelectorAll('.hero .bgwrap.sl')];
  if (sl.length < 2) return;
  const ds = [...el.querySelectorAll('.h-dots button')];
  let cur = 0, timer = null;
  const go = i => { cur = i; sl.forEach((s, k) => s.classList.toggle('on', k === i)); ds.forEach((d, k) => d.setAttribute('aria-current', k === i)); };
  const auto = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go((cur + 1) % sl.length), 5200); };
  ds.forEach((d, i) => d.addEventListener('click', () => { go(i); auto(); }));
  auto();
}

function parallax() {
  const vh = innerHeight;
  document.querySelectorAll('.px').forEach(el => {
    const r = el.parentNode.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed), lim = r.height * 0.14;
    el.style.transform = 'translate3d(0,' + Math.max(-lim, Math.min(lim, d)) + 'px,0)';
  });
}
if (!reduce) {
  let tick = false;
  const on = () => { if (!tick) { tick = true; requestAnimationFrame(() => { parallax(); tick = false; }); } };
  addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
}

// ---------------- Homepage ----------------
function renderHome(cfg) {
  const b = cfg.brand, s = cfg.sections, el = $('#app');
  const heroInk = b.colors.d;
  const feat = cfg.rooms.find(r => r.id === cfg.feature.roomId) || cfg.rooms[0];
  const ci = addDays(todayStr(), 7), co = addDays(ci, 2);
  const minRate = Math.min(...cfg.rooms.map(r => r.priceWeekday));

  el.innerHTML =
    '<div class="hero" style="color:' + heroInk + '">' +
      cfg.hero.map((src, i) => px(src, -0.18, 'bgwrap sl' + (i ? '' : ' on'))).join('') +
      (cfg.hero.length > 1 ? '<div class="h-dots" role="group" aria-label="主視覺輪播">' + cfg.hero.map((_, i) => '<button type="button" aria-label="第 ' + (i + 1) + ' 張" aria-current="' + (i === 0) + '">0' + (i + 1) + '</button>').join('') + '</div>' : '') +
      '<header class="s-top"><div class="l"><span class="lang">中 / EN</span><nav aria-label="主選單"><a href="#rooms">房型</a><a href="#acts">島嶼玩法</a><a href="#contact">聯絡</a></nav></div><a class="bk" href="book.html">立即訂房 <span aria-hidden="true">→</span></a></header>' +
      '<div class="vert">' + esc(b.side) + '</div>' +
      '<div class="h-in">' + markSVG(heroInk) + '<h1 class="wm" style="margin-bottom:0">' + esc(b.en) + '</h1><div class="wm-sub">' + esc(b.name) + '</div><div class="h-tag">' + esc(b.heroSub) + '</div></div>' +
      '<a class="scroll" href="#rooms"><span>往下探索</span><span class="circ">↓</span></a></div>' +
    '<form class="book" id="bookBar" aria-label="查詢空房">' +
      '<label><small>入住</small><input type="date" name="checkIn" value="' + ci + '" min="' + todayStr() + '" required></label>' +
      '<label><small>退房</small><input type="date" name="checkOut" value="' + co + '" min="' + addDays(todayStr(), 1) + '" required></label>' +
      '<label><small>人數</small><span class="ppl"><select name="adults" aria-label="大人">' + [1, 2, 3, 4].map(n => '<option value="' + n + '"' + (n === 2 ? ' selected' : '') + '>' + n + ' 大</option>').join('') + '</select><select name="kids" aria-label="小孩">' + [0, 1, 2].map(n => '<option value="' + n + '">' + n + ' 小</option>').join('') + '</select></span></label>' +
      '<button type="submit">查詢空房 <span aria-hidden="true">→</span></button></form>' +
    '<div class="avail" id="avail" aria-live="polite"></div>' +

    '<section class="sec" id="rooms"><div class="sh-row"><div><div class="s-eye">' + esc(s.roomsE) + '</div><h2 class="s-h">' + esc(s.roomsH) + '</h2></div>' + carNav('rooms', '房型') + '</div>' +
      '<div class="car" data-car="rooms"><div class="car-track">' + cfg.rooms.map(r =>
        '<a class="room" href="room.html?id=' + esc(r.id) + '" data-room="' + esc(r.id) + '"><div class="ph">' + roomPhotos(r) + '<span class="pill">' + esc(r.tag) + '</span></div>' +
        '<div class="meta"><div><h4>' + esc(r.name) + '</h4><p>' + esc(r.desc) + '</p></div><div class="price"><b>' + fmt(r.priceWeekday) + '</b><small>每晚起</small></div><span class="left-tag" hidden></span></div></a>').join('') +
      '</div></div></section>' +

    '<section class="sec"><div class="split"><div class="acc">' +
      '<details open><summary><span>房型細節</span><span>/ 01</span></summary><div class="amen"><span>' + feat.maxGuests + ' 人</span><span>' + esc(feat.size) + '</span><span>' + esc(feat.bed) + '</span><span>獨立衛浴</span></div></details>' +
      '<details><summary><span>房內設施</span><span>/ 02</span></summary><div class="amen">' + feat.amenities.map(a => '<span>' + esc(a) + '</span>').join('') + '</div></details>' +
      '<details><summary><span>取消政策</span><span>/ 03</span></summary><div class="body">' + esc(cfg.rules.cancel) + '</div></details></div>' +
      '<div class="detail"><div class="s-eye">房型亮點</div><div class="big">' + esc(feat.name) + '</div><p style="font-size:13px;margin:0">' + esc(feat.intro) + '</p><div class="incl">' + cfg.feature.incl.map(x => '<div><i></i>' + esc(x) + '</div>').join('') + '</div><a class="cta" href="room.html?id=' + esc(feat.id) + '">訂這間房 →</a></div></div></section>' +

    '<section class="band" id="acts">' + px(cfg.band, -0.12) + '<div class="band-in"><div class="car" data-car="acts"><div class="car-track">' +
      cfg.acts.map(a => '<div class="act"><img src="' + esc(a.img) + '" alt="' + esc(a.name) + '照片，遠處是' + esc(b.name) + '" loading="lazy"><div class="ab"><small>' + esc(a.time) + '</small><h4>' + esc(a.name) + '</h4><p>' + esc(a.desc) + '</p></div></div>').join('') +
      '</div></div><div class="sh-row acts-h"><div><div class="s-eye">' + esc(s.actsE) + '</div><h2 class="s-h">' + esc(s.actsH) + '</h2></div>' + carNav('acts', '活動') + '</div></div></section>' +

    '<section class="sec"><div class="sh-row"><div><div class="s-eye">' + esc(s.spacesE) + '</div><h2 class="s-h">' + esc(s.spacesH) + '</h2></div></div><div class="spaces">' +
      cfg.spaces.map(a => '<div class="sp"><div class="sp-ph">' + a.imgs.map((src, j) => '<img class="rs' + (j ? '' : ' on') + '" src="' + esc(src) + '" alt="' + esc(a.name) + '照片 ' + (j + 1) + '" loading="lazy">').join('') +
        '<div class="r-dots" role="group" aria-label="' + esc(a.name) + '照片">' + a.imgs.map((_, j) => '<button type="button" aria-label="第 ' + (j + 1) + ' 張"' + (j ? '' : ' aria-current="true"') + '></button>').join('') + '</div></div>' +
        '<div class="ab"><div class="sp-top"><div class="sp-logo">' + spMark(a.mark) + '<div><h4>' + esc(a.name) + '</h4><span class="sp-en">' + esc(a.en) + '</span></div></div><small>' + esc(a.time) + '</small></div><p>' + esc(a.desc) + '</p></div></div>').join('') +
    '</div></section>' +

    '<section class="sec"><div class="revs">' + cfg.reviews.map(r => '<div class="rev"><span class="rp">' + esc(r.tag) + '</span><p>' + esc(r.text) + '</p><div class="who"><span class="av">' + esc(r.who[0]) + '</span><div>' + esc(r.who) + '<div class="stars" aria-label="五顆星">★★★★★</div></div></div></div>').join('') + '</div></section>' +

    '<section class="sec"><div class="sh-row"><div><div class="s-eye">' + esc(s.guideE) + '</div><h2 class="s-h">' + esc(s.guideH) + '</h2></div></div>' +
      '<div class="guide">' + cfg.guide.map(g => '<div><h4>' + esc(g.name) + '</h4><p>' + esc(g.desc) + '</p></div>').join('') + '</div></section>' +

    '<section class="sec contact" id="contact"><div class="form"><h4>還有問題嗎？</h4><p>訂房前想先問問看，直接打電話或傳訊息給我們。也可以用訂單電話查詢已訂的房間。</p>' +
      '<a class="cta" href="tel:' + esc(b.phone.replace(/[^\d]/g, '')) + '">撥打訂房專線</a><a class="cta ghost" href="book.html">線上訂房與查空房</a></div>' +
      '<div class="info"><div class="map"></div><h5>聯絡我們</h5><div class="big2">' + esc(b.name) + '</div><div>' + esc(b.address) + '<br>訂房專線 ' + esc(b.phone) + '</div></div></section>' +
    footer(cfg) +
    '<a class="mbook" href="book.html" id="mbook"><span>' + shortDate(ci) + '–' + shortDate(co) + ' · 2 人<br><b>' + fmt(minRate * 2) + '</b> 起</span><span class="btn">立即訂房</span></a>';

  heroWire(el); photoWire(el); carWire(el);
  requestAnimationFrame(parallax);

  const form = $('#bookBar');
  const check = async () => {
    const f = Object.fromEntries(new FormData(form));
    if (f.checkOut <= f.checkIn) { form.checkOut.value = f.checkOut = addDays(f.checkIn, 1); }
    const q = new URLSearchParams(f).toString();
    const avail = $('#avail');
    const data = await getJSON('availability?' + q).catch(() => null);
    if (!data || !data.success) { avail.textContent = (data && data.message) || '暫時無法查詢空房。'; return; }
    const open = data.rooms.filter(r => r.available && r.fits);
    const n = nightsBetween(f.checkIn, f.checkOut);
    avail.className = 'avail' + (open.length ? '' : ' full');
    avail.innerHTML = open.length
      ? '<span><i></i>這 ' + n + ' 晚還有 ' + open.length + ' 種房型可訂</span><a href="book.html?' + q + '" style="font-weight:600">前往訂房 →</a><span style="opacity:.7">即時庫存 · 不會超賣</span>'
      : '<span><i></i>這 ' + n + ' 晚已客滿，換個日期看看</span>';
    data.rooms.forEach(r => {
      const card = el.querySelector('.room[data-room="' + r.id + '"]');
      if (!card) return;
      card.href = 'room.html?id=' + r.id + '&' + q;
      const tag = card.querySelector('.left-tag');
      tag.hidden = false;
      tag.className = 'left-tag' + (r.available && r.fits ? '' : ' full');
      tag.textContent = !r.fits ? '人數超過' : r.available ? (r.left <= 2 ? '剩 ' + r.left + ' 間' : '可訂') : '客滿';
    });
    $('#mbook').href = 'book.html?' + q;
    $('#mbook span').innerHTML = shortDate(f.checkIn) + '–' + shortDate(f.checkOut) + ' · ' + (+f.adults + +f.kids) + ' 人<br><b>' + fmt(Math.min(...data.rooms.map(r => r.roomPrice))) + '</b> 起';
  };
  form.addEventListener('submit', e => { e.preventDefault(); check(); });
  form.addEventListener('change', check);
  check();
}

// ---------------- Room detail ----------------
function renderRoom(cfg) {
  const p = new URLSearchParams(location.search);
  const r = cfg.rooms.find(x => x.id === p.get('id')) || cfg.rooms[0];
  document.title = r.name + ' | ' + cfg.brand.name;
  const el = $('#app');
  el.innerHTML = topBar(cfg) +
    '<main class="page"><div class="crumb"><a href="./">首頁</a> / <a href="./#rooms">房型</a> / ' + esc(r.name) + '</div>' +
    '<div class="r-head"><div><div class="s-eye">' + esc(r.tag) + ' · ' + r.maxGuests + ' 人 · ' + esc(r.size) + ' · ' + esc(r.bed) + '</div><h1>' + esc(r.name) + '</h1></div>' +
      '<div class="price"><b>' + fmt(r.priceWeekday) + '</b><small>平日每晚 · 假日 ' + fmt(r.priceHoliday) + '</small></div></div>' +
    '<div class="gal">' + r.images.slice(0, 3).map((src, i) => '<img src="' + esc(src) + '" alt="' + esc(r.name) + '照片 ' + (i + 1) + '"' + (i ? ' loading="lazy"' : '') + '>').join('') + '</div>' +
    '<div class="r-body"><div>' +
      '<p style="font-size:15px;line-height:1.9">' + esc(r.intro) + '</p>' +
      '<div class="acc" style="margin:20px 0">' +
        '<details open><summary><span>房內設施</span><span>/ 01</span></summary><div class="amen">' + r.amenities.map(a => '<span>' + esc(a) + '</span>').join('') + '</div></details>' +
        '<details><summary><span>入住須知</span><span>/ 02</span></summary><div class="body">' + esc(cfg.rules.checkin) + '</div></details>' +
        '<details><summary><span>取消政策</span><span>/ 03</span></summary><div class="body">' + esc(cfg.rules.cancel) + '</div></details></div>' +
      '<div class="cal" id="cal"></div></div>' +
      '<aside class="sum" id="sum" aria-live="polite"></aside></div></main>' + footer(cfg);

  const today = todayStr();
  let month = (p.get('checkIn') || today).slice(0, 7);
  let ci = p.get('checkIn') || '', co = p.get('checkOut') || '';
  let days = {};

  const sum = () => {
    const box = $('#sum');
    if (!ci || !co) {
      box.innerHTML = '<div class="s-eye">選擇日期</div><p style="margin:0;font-size:13px">在月曆上點入住日，再點退房日。客滿或關房的日期無法選取。</p><a class="cta ghost" href="book.html">看所有房型的空房</a>';
      return;
    }
    const nights = [];
    for (let d = ci; d < co; d = addDays(d, 1)) nights.push(d);
    const known = nights.every(d => days[d]);
    const total = known ? nights.reduce((t, d) => t + days[d].price, 0) : null;
    const q = new URLSearchParams({ room: r.id, checkIn: ci, checkOut: co, adults: Math.min(2, r.maxGuests) }).toString();
    box.innerHTML = '<div class="s-eye">你的日期</div><div class="row"><span>入住</span><b>' + shortDate(ci) + '</b></div><div class="row"><span>退房</span><b>' + shortDate(co) + '</b></div>' +
      '<div class="row"><span>' + nights.length + ' 晚房價</span><span class="tot">' + (total !== null ? fmt(total) : '—') + '</span></div>' +
      '<a class="cta" href="book.html?' + q + '">訂這間房 →</a><p style="margin:0;font-size:12px;opacity:.7">下一步可加購活動、填寫資料與使用優惠碼。</p>';
  };

  const draw = async () => {
    const data = await getJSON('availability/calendar?roomId=' + encodeURIComponent(r.id) + '&month=' + month);
    (data.days || []).forEach(d => { days[d.date] = d; });
    const first = new Date(month + '-01T00:00:00Z');
    const lead = first.getUTCDay();
    const [y, m] = month.split('-').map(Number);
    const can = month > today.slice(0, 7);
    let h = '<div class="cal-h"><button type="button" id="calPrev" aria-label="上個月" style="transform:rotate(180deg)"' + (can ? '' : ' disabled') + '>' + ARW + '</button><span>' + y + ' 年 ' + m + ' 月</span><button type="button" id="calNext" aria-label="下個月">' + ARW + '</button></div><div class="cal-g">' +
      WD.map(w => '<span class="dw">' + w + '</span>').join('') + '<span></span>'.repeat(lead);
    (data.days || []).forEach(d => {
      const past = d.date < today;
      // A sold-out night can still be a checkout day (the guest leaves that morning)
      const asCheckout = ci && !co && d.date > ci;
      const off = past || (!asCheckout && d.left <= 0);
      const cls = [d.date === ci || d.date === co ? 'sel' : '', ci && co && d.date > ci && d.date < co ? 'mid' : '', d.left > 0 && d.left <= 1 ? 'few' : ''].join(' ');
      h += '<button type="button" data-d="' + d.date + '" class="' + cls + '"' + (off ? ' disabled' : '') + ' aria-label="' + d.date + (d.left > 0 ? '，剩 ' + d.left + ' 間，' + d.price + ' 元' : '，客滿') + '">' + Number(d.date.slice(8)) +
        '<small>' + (past ? '' : d.left > 0 ? (d.price / 1000).toFixed(1) + 'k' : '滿') + '</small></button>';
    });
    $('#cal').innerHTML = h + '</div><p class="cal-note">價格為每晚房價（千元）。紅字表示只剩最後 1 間，劃線日期已客滿或不開放。</p>';
    $('#calPrev').onclick = () => { const d = new Date(month + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); month = ymd(d).slice(0, 7); draw(); };
    $('#calNext').onclick = () => { const d = new Date(month + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); month = ymd(d).slice(0, 7); draw(); };
    $('#cal').querySelectorAll('[data-d]').forEach(btn => btn.addEventListener('click', () => {
      const d = btn.dataset.d;
      if (!ci || co || d <= ci) { ci = d; co = ''; }
      else {
        // every night in between must still have a room
        for (let x = ci; x < d; x = addDays(x, 1)) if (days[x] && days[x].left <= 0) { ci = d; co = ''; draw(); sum(); return; }
        co = d;
      }
      draw(); sum();
    }));
  };
  draw().then(sum);
}

// ---------------- Booking flow ----------------
function renderBook(cfg) {
  const p = new URLSearchParams(location.search);
  const el = $('#app');
  const st = {
    checkIn: p.get('checkIn') || addDays(todayStr(), 7),
    checkOut: p.get('checkOut') || addDays(todayStr(), 9),
    adults: +(p.get('adults') || 2), kids: +(p.get('kids') || 0),
    room: p.get('room') || '', avail: [], promo: null, editId: p.get('edit') || ''
  };
  el.innerHTML = topBar(cfg) +
    '<main class="page"><div class="crumb"><a href="./">首頁</a> / 線上訂房</div>' +
    '<div class="steps" aria-label="訂房步驟"><span class="on">1 選日期與房型</span><span id="st2">2 加購與資料</span><span>3 付款</span><span>4 完成</span></div>' +
    '<div class="r-body"><form id="bf" novalidate>' +
      '<div class="card"><h3>入住日期與人數</h3><div class="grid2">' +
        '<label class="field">入住<input type="date" name="checkIn" min="' + todayStr() + '" required></label>' +
        '<label class="field">退房<input type="date" name="checkOut" min="' + addDays(todayStr(), 1) + '" required></label>' +
        '<label class="field">大人<select name="adults">' + [1, 2, 3, 4].map(n => '<option>' + n + '</option>').join('') + '</select></label>' +
        '<label class="field">小孩<select name="kids">' + [0, 1, 2, 3].map(n => '<option>' + n + '</option>').join('') + '</select></label></div></div>' +
      '<div class="card"><h3>選擇房型</h3><div class="pick" id="pick" role="radiogroup" aria-label="房型"></div></div>' +
      '<div class="card"><h3>加購項目</h3><div class="addons">' + (cfg.addons || []).map(a =>
        '<div><span>' + esc(a.name) + '<br><small style="opacity:.7">' + fmt(a.price) + ' / ' + esc(a.unit) + '</small></span><input type="number" min="0" max="20" value="0" name="addon_' + esc(a.id) + '" aria-label="' + esc(a.name) + '數量"></div>').join('') + '</div></div>' +
      '<div class="card"><h3>訂房人資料</h3><div class="grid2">' +
        '<label class="field">姓名<input name="name" autocomplete="name" required></label>' +
        '<label class="field">手機<input name="phone" type="tel" autocomplete="tel" required></label></div>' +
        '<label class="field" style="margin-top:10px">Email（寄送付款確認信）<input name="email" type="email" autocomplete="email"></label>' +
        '<label class="field" style="margin-top:10px">備註<textarea name="note" placeholder="預計抵達時間、飲食需求等"></textarea></label>' +
        '<label class="field" style="margin-top:10px">優惠碼<span class="promo"><input name="promo" autocomplete="off" placeholder="例如 TIDE300"><button type="button" id="promoBtn">套用</button></span></label><div class="msg" id="promoMsg" aria-live="polite"></div></div>' +
      '<div class="card"><h3>取消政策</h3><p style="margin:0;font-size:13px">' + esc(cfg.rules.cancel) + '</p></div>' +
    '</form><aside class="sum" id="sum" aria-live="polite"></aside></div></main>' + footer(cfg);

  const f = $('#bf');
  f.checkIn.value = st.checkIn; f.checkOut.value = st.checkOut; f.adults.value = st.adults; f.kids.value = st.kids;

  const addonCounts = () => Object.fromEntries((cfg.addons || []).map(a => [a.id, Math.max(0, parseInt(f['addon_' + a.id].value, 10) || 0)]).filter(([, n]) => n));
  const subtotal = () => {
    const room = st.avail.find(r => r.id === st.room);
    const add = (cfg.addons || []).reduce((t, a) => t + (addonCounts()[a.id] || 0) * a.price, 0);
    return { room: room ? room.roomPrice : 0, add, total: (room ? room.roomPrice : 0) + add };
  };

  const drawSum = () => {
    const s = subtotal(), room = cfg.rooms.find(r => r.id === st.room);
    const disc = st.promo ? st.promo.discount : 0;
    const ok = room && st.avail.some(r => r.id === st.room && r.available && r.fits);
    $('#sum').innerHTML = '<div class="s-eye">訂單摘要</div>' +
      '<div class="row"><span>日期</span><b>' + shortDate(st.checkIn) + ' – ' + shortDate(st.checkOut) + '</b></div>' +
      '<div class="row"><span>人數</span><span>' + st.adults + ' 大 ' + st.kids + ' 小</span></div>' +
      '<div class="row"><span>' + (room ? esc(room.name) : '尚未選房型') + '</span><span>' + (room ? fmt(s.room) : '—') + '</span></div>' +
      (s.add ? '<div class="row"><span>加購</span><span>' + fmt(s.add) + '</span></div>' : '') +
      (disc ? '<div class="row"><span>優惠碼 ' + esc(st.promo.code) + '</span><span>−' + fmt(disc) + '</span></div>' : '') +
      '<div class="row" style="align-items:baseline"><span>總金額</span><span class="tot">' + fmt(s.total - disc) + '</span></div>' +
      '<button type="button" class="cta" id="submitBtn"' + (ok ? '' : ' disabled') + '>' + (st.editId ? '更新訂單並付款 →' : '前往付款 →') + '</button>' +
      '<div class="msg" id="formMsg" aria-live="assertive"></div>' +
      '<p style="margin:0;font-size:12px;opacity:.7">付款方式：信用卡（TapPay，含 3D 驗證）或銀行轉帳。信用卡訂單保留 30 分鐘，轉帳保留 24 小時。</p>';
    $('#submitBtn').onclick = submit;
  };

  const loadAvail = async () => {
    st.checkIn = f.checkIn.value; st.checkOut = f.checkOut.value; st.adults = +f.adults.value; st.kids = +f.kids.value;
    if (!st.checkIn || !st.checkOut || st.checkOut <= st.checkIn) {
      st.checkOut = f.checkOut.value = addDays(st.checkIn || todayStr(), 1);
    }
    const data = await getJSON('availability?' + new URLSearchParams({ checkIn: st.checkIn, checkOut: st.checkOut, adults: st.adults, kids: st.kids }));
    st.avail = data.rooms || [];
    if (!st.avail.some(r => r.id === st.room && r.available && r.fits)) {
      const first = st.avail.find(r => r.available && r.fits);
      st.room = first ? first.id : '';
    }
    $('#pick').innerHTML = st.avail.map(a => {
      const r = cfg.rooms.find(x => x.id === a.id), ok = a.available && a.fits;
      return '<label class="' + (ok ? '' : 'no') + '"><input type="radio" name="room" value="' + esc(a.id) + '"' + (st.room === a.id ? ' checked' : '') + (ok ? '' : ' disabled') + '>' +
        '<img src="' + esc(r.images[0]) + '" alt="">' +
        '<div><h4>' + esc(a.name) + '</h4><p>' + r.maxGuests + ' 人 · ' + esc(r.size) + ' · ' + esc(r.bed) + '</p><p>' + (!a.fits ? '超過可入住人數' : !a.available ? '這段日期已客滿' : a.left <= 2 ? '只剩 ' + a.left + ' 間' : '可訂') + '</p></div>' +
        '<div class="price"><b>' + fmt(a.roomPrice) + '</b><small>' + a.nights + ' 晚</small></div></label>';
    }).join('') || '<p>目前沒有房型資料。</p>';
    $('#pick').querySelectorAll('input').forEach(i => i.addEventListener('change', () => { st.room = i.value; revalidatePromo(); }));
    revalidatePromo();
  };

  const revalidatePromo = async () => {
    const code = f.promo.value.trim();
    if (!code) { st.promo = null; $('#promoMsg').textContent = ''; drawSum(); return; }
    const data = await getJSON('promo/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal: subtotal().total }) });
    const msg = $('#promoMsg');
    if (data.valid) { st.promo = { code: data.promo.code, discount: data.discount }; msg.className = 'msg ok'; msg.textContent = '已套用，折抵 ' + fmt(data.discount); }
    else { st.promo = null; msg.className = 'msg err'; msg.textContent = data.message; }
    drawSum();
  };

  async function submit() {
    const msg = $('#formMsg');
    if (!f.name.value.trim() || !f.phone.value.trim()) { msg.className = 'msg err'; msg.textContent = '請填寫姓名與手機。'; (f.name.value.trim() ? f.phone : f.name).focus(); return; }
    $('#submitBtn').disabled = true;
    msg.className = 'msg'; msg.textContent = '建立訂單中…';
    const body = {
      name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), note: f.note.value.trim(),
      roomType: st.room, checkIn: st.checkIn, checkOut: st.checkOut, adults: st.adults, kids: st.kids,
      packages: addonCounts(), promoCode: st.promo ? st.promo.code : ''
    };
    const data = await getJSON('bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => ({ success: false, message: '網路連線失敗，請再試一次。' }));
    if (!data.success) { msg.className = 'msg err'; msg.textContent = data.message; $('#submitBtn').disabled = false; loadAvail(); return; }
    location.href = 'payment.html?id=' + encodeURIComponent(data.bookingId);
  }

  f.addEventListener('change', e => {
    if (['checkIn', 'checkOut', 'adults', 'kids'].includes(e.target.name)) loadAvail();
    else if (e.target.name && e.target.name.startsWith('addon_')) revalidatePromo();
  });
  f.addEventListener('submit', e => e.preventDefault());
  $('#promoBtn').onclick = revalidatePromo;

  // Coming back from the payment page to edit (the old booking was cancelled there)
  if (st.editId) {
    getJSON('bookings/' + encodeURIComponent(st.editId)).then(d => {
      if (!d.success) return;
      const b = d.booking;
      f.checkIn.value = b.checkIn; f.checkOut.value = b.checkOut; f.adults.value = b.adults; f.kids.value = b.kids;
      f.name.value = b.name; f.phone.value = b.phone; f.email.value = b.email || ''; f.note.value = b.note || ''; f.promo.value = b.promoCode || '';
      Object.entries(b.packages || {}).forEach(([k, v]) => { if (f['addon_' + k]) f['addon_' + k].value = v; });
      st.room = b.roomType;
      loadAvail();
    });
  }
  loadAvail();
}

// ---------------- boot ----------------
getJSON('config').then(({ siteConfig: cfg }) => {
  applyBrand(cfg);
  const page = document.body.dataset.page;
  if (page === 'room') renderRoom(cfg);
  else if (page === 'book') renderBook(cfg);
  else renderHome(cfg);
}).catch(() => { $('#app').innerHTML = '<p style="padding:40px">網站資料載入失敗，請重新整理。</p>'; });
