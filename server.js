const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// TapPay payment gateway (Direct Pay / Pay by Prime)
// Key resolution order: tappay.local.json (gitignored) > environment
// variables > TapPay public sandbox demo keys (test cards only).
let tappayLocal = {};
try {
  tappayLocal = require('./tappay.local.json');
  console.log('TapPay: loaded keys from tappay.local.json');
} catch (e) { /* file not present — fall back to env vars / demo keys */ }

const TAPPAY = {
  env: (tappayLocal.env || process.env.TAPPAY_ENV) === 'production' ? 'production' : 'sandbox',
  appId: parseInt(tappayLocal.appId || process.env.TAPPAY_APP_ID, 10) || 11327,
  appKey: tappayLocal.appKey || process.env.TAPPAY_APP_KEY || 'app_whdEWBH8e8Lzy4N6BysVRRMILYORF6UxXbiOFsICkz0J9j1C0JUlCHv1tVJC',
  partnerKey: tappayLocal.partnerKey || process.env.TAPPAY_PARTNER_KEY || 'partner_6ID1DoDlaPrfHw6HBZsULfTYtDmWs0q0ZZGKMBpp4YICWBxgK97eK3RM',
  merchantId: tappayLocal.merchantId || process.env.TAPPAY_MERCHANT_ID || 'GlobalTesting_CTBC'
};
const TAPPAY_API_URL = TAPPAY.env === 'production'
  ? 'https://prod.tappaysdk.com/tpc/payment/pay-by-prime'
  : 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

// Email notifications (payment confirmation)
// Key resolution order: email.local.json (gitignored) > environment variables.
// When neither is configured, emails are skipped and logged.
const nodemailer = require('nodemailer');
let emailLocal = {};
try {
  emailLocal = require('./email.local.json');
  console.log('Email: loaded SMTP settings from email.local.json');
} catch (e) { /* file not present — fall back to env vars */ }

const MAIL = {
  host: emailLocal.host || process.env.SMTP_HOST || '',
  port: parseInt(emailLocal.port || process.env.SMTP_PORT, 10) || 465,
  secure: (emailLocal.secure !== undefined) ? !!emailLocal.secure : (process.env.SMTP_SECURE !== 'false'),
  user: emailLocal.user || process.env.SMTP_USER || '',
  pass: emailLocal.pass || process.env.SMTP_PASS || '',
  from: emailLocal.from || process.env.MAIL_FROM || ''
};

const mailTransporter = MAIL.host && MAIL.user
  ? nodemailer.createTransport({
      host: MAIL.host,
      port: MAIL.port,
      secure: MAIL.secure,
      auth: { user: MAIL.user, pass: MAIL.pass }
    })
  : null;

const roomDisplayNames = {
  double: '翠竹雙人房',
  quad: '鄉村 / 自然 / 樸石四人房',
  pool_quad: '弦木 / 澄花泳池四人房',
  charter: '10 人小包棟'
};

function sendPaymentConfirmationEmail(booking) {
  if (!booking.email) {
    console.log(`Email: booking ${booking.id} has no guest email, skipping confirmation mail.`);
    return;
  }
  if (!mailTransporter) {
    console.log('Email: SMTP not configured (email.local.json / SMTP_* env), skipping confirmation mail.');
    return;
  }

  const db = readDb();
  const roomsConfig = (db.siteConfig && db.siteConfig.rooms) || [];
  const roomConf = roomsConfig.find(r => r.id === booking.roomType);
  const roomName = (roomConf && roomConf.name) || roomDisplayNames[booking.roomType] || booking.roomType;

  const packageRows = (booking.packageDetails || []).map(p =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${p.name}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${p.desc}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">NT$ ${p.cost.toLocaleString()}</td></tr>`
  ).join('') || '<tr><td colspan="3" style="padding:6px 10px;color:#6b7280;">無加購項目</td></tr>';

  const html = `
  <div style="font-family:'Microsoft JhengHei',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
    <div style="background:linear-gradient(135deg,#3a8a50,#1e4d2b);border-radius:12px 12px 0 0;padding:24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:22px;">🌴 bazar花園 芭扎民宿</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:.9;">訂房付款成功確認信</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      <p>${booking.name} 您好：</p>
      <p>我們已成功收到您的款項，房間已為您保留完成！民宿主人將會儘快與您電話聯繫確認交通船班資訊。</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
        <tr><td style="padding:6px 10px;color:#6b7280;width:120px;">訂單編號</td><td style="padding:6px 10px;font-weight:bold;">${booking.id}</td></tr>
        <tr><td style="padding:6px 10px;color:#6b7280;">房型</td><td style="padding:6px 10px;">${roomName}（${booking.nights} 晚）</td></tr>
        <tr><td style="padding:6px 10px;color:#6b7280;">入住期間</td><td style="padding:6px 10px;">${booking.checkIn} ~ ${booking.checkOut}</td></tr>
        <tr><td style="padding:6px 10px;color:#6b7280;">入住人數</td><td style="padding:6px 10px;">${booking.adults} 大 ${booking.kids} 小</td></tr>
      </table>
      <h3 style="font-size:15px;margin:16px 0 8px;">加購套裝行程</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${packageRows}</table>
      <p style="font-size:16px;font-weight:bold;text-align:right;margin:16px 0;color:#f58f29;">
        已付總金額：NT$ ${booking.totalPrice.toLocaleString()}
      </p>
      <p style="font-size:12px;color:#6b7280;">付款方式：信用卡（末四碼 ${booking.payment ? booking.payment.cardLastFour : ''}）｜交易編號：${booking.payment ? booking.payment.recTradeId : ''}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
      <p style="font-size:12px;color:#6b7280;">
        芭扎民宿 bazar花園｜屏東縣琉球鄉｜電話：0975-080-788<br>
        此為系統自動發送的信件，請勿直接回覆。
      </p>
    </div>
  </div>`;

  mailTransporter.sendMail({
    from: MAIL.from || MAIL.user,
    to: booking.email,
    subject: `【bazar花園】訂房付款成功確認 - 訂單 ${booking.id}`,
    html
  }).then(info => {
    console.log(`Email: confirmation sent to ${booking.email} for ${booking.id} (${info.messageId})`);
  }).catch(err => {
    console.error(`Email: failed to send confirmation for ${booking.id}:`, err.message);
  });
}

// Configure Multer for local uploads
const UPLOADS_DIR = path.join(__dirname, 'public', 'assets', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/bzzar', express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Redirect root to /bzzar/
app.get('/', (req, res) => {
  res.redirect('/bzzar/');
});

// Redirect /bzzar without trailing slash
app.get('/bzzar', (req, res) => {
  res.redirect('/bzzar/');
});

// Simple JSON Database Initialization
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ bookings: [], settings: { adminPassword: 'bazar888' } }, null, 2), 'utf8');
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, returning empty structure:', err);
    return { bookings: [], settings: { adminPassword: 'bazar888' } };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Helper: Calculate Booking Price on Server Side (Security Check)
function calculatePrice(bookingData) {
  const { roomType, checkIn, checkOut, adults, kids, isSummer, isHolidayPackage, packages } = bookingData;
  
  const adultCount = parseInt(adults) || 0;
  const kidCount = parseInt(kids) || 0;
  const totalPeople = adultCount + kidCount;

  // 1. Calculate Nights and Dates
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let roomPrice = 0;
  let currentDate = new Date(inDate);

  // Room pricing rules (dynamically fetched from siteConfig.rooms in db.json)
  const dbData = readDb();
  const roomsConfig = dbData.siteConfig ? dbData.siteConfig.rooms : [];
  const roomConf = roomsConfig.find(r => r.id === roomType);
  const rates = roomConf ? {
    weekday: roomConf.priceWeekday,
    summer: roomConf.priceSummer,
    holiday: roomConf.priceHoliday,
    consecutive: roomConf.priceConsecutive
  } : { weekday: 2000, summer: 2800, holiday: 2800, consecutive: 3200 };

  for (let i = 0; i < nights; i++) {
    const dayOfWeek = currentDate.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0); // Friday, Saturday, Sunday
    
    if (isHolidayPackage) {
      roomPrice += rates.consecutive;
    } else if (isSummer) {
      roomPrice += rates.summer;
    } else if (isWeekend) {
      roomPrice += rates.holiday;
    } else {
      roomPrice += rates.weekday;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 2. Calculate Packages Price
  let packagePrice = 0;
  const packageDetails = [];

  if (packages) {
    // Round-trip ferry ticket: Adult 430, Child (3-12) 200
    if (packages.ferry) {
      const ferryAdult = (parseInt(packages.ferryAdultCount) || 0) * 430;
      const ferryKid = (parseInt(packages.ferryKidCount) || 0) * 200;
      const cost = ferryAdult + ferryKid;
      packagePrice += cost;
      packageDetails.push({ name: '來回船票', cost, desc: `大人 ${packages.ferryAdultCount} 人, 小孩 ${packages.ferryKidCount} 人` });
    }

    // Scooter: 400 per 24 hours per scooter (shared by 2 people)
    if (packages.scooter) {
      const scooterCount = parseInt(packages.scooterCount) || Math.ceil(totalPeople / 2);
      const scooterDays = parseInt(packages.scooterDays) || nights;
      const cost = scooterCount * 400 * scooterDays;
      packagePrice += cost;
      packageDetails.push({ name: '機車出租', cost, desc: `${scooterCount} 台, 共 ${scooterDays} 天` });
    }

    // Ecological activities
    if (packages.tidePool) {
      const count = parseInt(packages.tidePoolCount) || totalPeople;
      const cost = count * 100;
      packagePrice += cost;
      packageDetails.push({ name: '潮間帶導覽', cost, desc: `${count} 人` });
    }
    if (packages.nightTour) {
      const count = parseInt(packages.nightTourCount) || totalPeople;
      const cost = count * 100;
      packagePrice += cost;
      packageDetails.push({ name: '夜遊導覽', cost, desc: `${count} 人` });
    }

    // Water Sports
    if (packages.snorkeling) {
      const count = parseInt(packages.snorkelingCount) || 0;
      const cost = count * 450;
      packagePrice += cost;
      packageDetails.push({ name: '浮潛體驗', cost, desc: `${count} 人` });
    }
    if (packages.diving) {
      const count = parseInt(packages.divingCount) || 0;
      const cost = count * 2550;
      packagePrice += cost;
      packageDetails.push({ name: '體驗潛水', cost, desc: `${count} 人` });
    }
    if (packages.sup) {
      const count = parseInt(packages.supCount) || 0;
      const cost = count * 1250;
      packagePrice += cost;
      packageDetails.push({ name: 'SUP 一人一板', cost, desc: `${count} 板` });
    }
    if (packages.kayakNormal) {
      const count = parseInt(packages.kayakNormalCount) || 0;
      const cost = count * 650;
      packagePrice += cost;
      packageDetails.push({ name: '一般獨木舟(兩人共乘)', cost, desc: `${count} 人` });
    }
    if (packages.kayakClear) {
      const count = parseInt(packages.kayakClearCount) || 0;
      const cost = count * 850;
      packagePrice += cost;
      packageDetails.push({ name: '透明獨木舟(兩人共乘)', cost, desc: `${count} 人` });
    }

    // BBQ Dinner: Adult 450, Child 250
    if (packages.bbq) {
      const bbqAdult = (parseInt(packages.bbqAdultCount) || 0) * 450;
      const bbqKid = (parseInt(packages.bbqKidCount) || 0) * 250;
      const cost = bbqAdult + bbqKid;
      packagePrice += cost;
      packageDetails.push({ name: '築安心/極香燒烤', cost, desc: `大人 ${packages.bbqAdultCount} 人, 小孩 ${packages.bbqKidCount} 人` });
    }

    // Attractions
    if (packages.deer) {
      const deerAdult = (parseInt(packages.deerAdultCount) || 0) * 220;
      const deerKid = (parseInt(packages.deerKidCount) || 0) * 50;
      const cost = deerAdult + deerKid;
      packagePrice += cost;
      packageDetails.push({ name: '鹿粼梅花鹿門票', cost, desc: `大人 ${packages.deerAdultCount} 人, 小孩 ${packages.deerKidCount} 人` });
    }
    if (packages.aquarium) {
      const aqAdult = (parseInt(packages.aquariumAdultCount) || 0) * 200;
      const aqKid = (parseInt(packages.aquariumKidCount) || 0) * 160;
      const cost = aqAdult + aqKid;
      packagePrice += cost;
      packageDetails.push({ name: '海洋館門票', cost, desc: `大人 ${packages.aquariumAdultCount} 人, 小孩 ${packages.aquariumKidCount} 人` });
    }
    if (packages.glassBoat) {
      const gbAdult = (parseInt(packages.glassBoatAdultCount) || 0) * 230;
      const gbKid = (parseInt(packages.glassBoatKidCount) || 0) * 150;
      const cost = gbAdult + gbKid;
      packagePrice += cost;
      packageDetails.push({ name: '藍鯨號玻璃船票', cost, desc: `大人 ${packages.glassBoatAdultCount} 人, 小孩 ${packages.glassBoatKidCount} 人` });
    }
  }

  const totalPrice = roomPrice + packagePrice;

  return {
    nights,
    roomPrice,
    packagePrice,
    totalPrice,
    packageDetails
  };
}

// ----------------- APIs -----------------

// 1. Submit Booking Request
app.post('/api/bookings', (req, res) => {
  const { name, phone, email, roomType, checkIn, checkOut, adults, kids, isSummer, isHolidayPackage, packages, note } = req.body;

  if (!name || !phone || !roomType || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, message: '必填欄位缺失。' });
  }

  const calculation = calculatePrice({ roomType, checkIn, checkOut, adults, kids, isSummer, isHolidayPackage, packages });

  const db = readDb();
  const bookingId = 'BZ' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 10);
  
  const newBooking = {
    id: bookingId,
    name,
    phone,
    email: email || '',
    roomType,
    checkIn,
    checkOut,
    nights: calculation.nights,
    adults: parseInt(adults) || 1,
    kids: parseInt(kids) || 0,
    isSummer: !!isSummer,
    isHolidayPackage: !!isHolidayPackage,
    packages: packages || {},
    packageDetails: calculation.packageDetails,
    roomPrice: calculation.roomPrice,
    packagePrice: calculation.packagePrice,
    totalPrice: calculation.totalPrice,
    paymentStatus: 'Pending', // Pending, Paid, Cancelled, Completed
    note: note || '',
    createdAt: new Date().toISOString()
  };

  db.bookings.push(newBooking);
  writeDb(db);

  res.json({
    success: true,
    bookingId,
    totalPrice: calculation.totalPrice,
    message: '預約成功！請進行模擬付款。'
  });
});

// 2. Get Booking Details (Used for payment and success page)
app.get('/api/bookings/:id', (req, res) => {
  const db = readDb();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, message: '找不到此訂單。' });
  }
  res.json({ success: true, booking });
});

// 2-1. Cancel a pending booking (guest returns to the form to re-edit)
app.put('/api/bookings/:id/cancel', (req, res) => {
  const db = readDb();
  const index = db.bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '找不到此訂單。' });
  }
  const booking = db.bookings[index];
  if (booking.paymentStatus !== 'Pending') {
    return res.status(400).json({ success: false, message: '此訂單已付款或已取消，無法取消。' });
  }
  booking.paymentStatus = 'Cancelled';
  writeDb(db);
  res.json({ success: true, booking });
});

// 2-2. Guest booking lookup by phone (booking id optional to narrow down)
app.post('/api/bookings/lookup', (req, res) => {
  const { phone, bookingId } = req.body;
  if (!phone || String(phone).trim().length < 4) {
    return res.status(400).json({ success: false, message: '請輸入訂房時填寫的聯絡電話。' });
  }

  const db = readDb();
  const normalize = s => String(s || '').replace(/[\s-]/g, '');
  let matches = db.bookings.filter(b => normalize(b.phone) === normalize(phone));
  if (bookingId && String(bookingId).trim()) {
    const idQuery = String(bookingId).trim().toUpperCase();
    matches = matches.filter(b => b.id.toUpperCase() === idQuery);
  }
  matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, bookings: matches });
});

// Payment methods setting: 'card' (credit card only) | 'transfer' (bank transfer only) | 'both'
function getPaymentMethods(db) {
  const m = db.settings && db.settings.paymentMethods;
  return (m === 'transfer' || m === 'both') ? m : 'card';
}

// 3. Payment - TapPay SDK config for the frontend (app key is a public client key)
app.get('/api/payment/config', (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    appId: TAPPAY.appId,
    appKey: TAPPAY.appKey,
    env: TAPPAY.env,
    methods: getPaymentMethods(db),
    transferInfo: (db.siteConfig && db.siteConfig.rules && db.siteConfig.rules.payment) || ''
  });
});

// 3-1. Payment - TapPay Pay by Prime (real charge; replaces the old mock endpoint)
app.post('/api/payment/pay', async (req, res) => {
  const { bookingId, prime } = req.body;
  if (!bookingId || !prime) {
    return res.status(400).json({ success: false, message: '缺少訂單編號或交易憑證。' });
  }

  const db = readDb();
  if (getPaymentMethods(db) === 'transfer') {
    return res.status(403).json({ success: false, message: '目前僅開放銀行匯款，未開放信用卡付款。' });
  }
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: '找不到訂單。' });
  }
  if (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Completed') {
    return res.status(400).json({ success: false, message: '此訂單已完成付款，請勿重複扣款。' });
  }
  if (booking.paymentStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: '此訂單已取消，無法付款。' });
  }

  try {
    const tpRes = await fetch(TAPPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAPPAY.partnerKey
      },
      body: JSON.stringify({
        prime,
        partner_key: TAPPAY.partnerKey,
        merchant_id: TAPPAY.merchantId,
        amount: booking.totalPrice, // TWD: no x100 conversion needed
        currency: 'TWD',
        order_number: booking.id,
        details: `芭扎民宿訂房 ${booking.checkIn}~${booking.checkOut}`.slice(0, 100),
        cardholder: {
          phone_number: booking.phone,
          name: booking.name,
          email: booking.email || 'guest@bazar.idv.tw'
        },
        remember: false
      })
    });
    const tpResult = await tpRes.json();

    if (tpResult.status !== 0) {
      console.error('TapPay payment failed:', tpResult.status, tpResult.msg);
      return res.status(402).json({
        success: false,
        message: `付款失敗：${tpResult.msg || '銀行拒絕交易'} (代碼 ${tpResult.status})`
      });
    }

    // Charge succeeded — persist the payment record
    const fresh = readDb();
    const index = fresh.bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
      fresh.bookings[index].paymentStatus = 'Paid';
      fresh.bookings[index].payment = {
        gateway: 'TapPay',
        env: TAPPAY.env,
        recTradeId: tpResult.rec_trade_id,
        bankTransactionId: tpResult.bank_transaction_id,
        cardLastFour: tpResult.card_info ? tpResult.card_info.last_four : '',
        paidAt: new Date().toISOString()
      };
      writeDb(fresh);
      sendPaymentConfirmationEmail(fresh.bookings[index]); // fire-and-forget: never blocks the payment response
      return res.json({ success: true, message: '付款成功！', booking: fresh.bookings[index] });
    }

    res.json({ success: true, message: '付款成功！' });
  } catch (err) {
    console.error('TapPay request error:', err);
    res.status(502).json({ success: false, message: '金流服務連線失敗，請稍後再試。' });
  }
});

// 4. Admin API - Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const db = readDb();
  if (password === db.settings.adminPassword) {
    // In a real application, we would sign a JWT. Here we use a secure token string.
    res.json({ success: true, token: 'bazar-admin-super-token-12345' });
  } else {
    res.status(401).json({ success: false, message: '密碼錯誤！' });
  }
});

// Middleware for Admin Token check
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer bazar-admin-super-token-12345') {
    next();
  } else {
    res.status(403).json({ success: false, message: '權限不足。' });
  }
}

// 5. Admin API - Get Bookings
app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const db = readDb();
  // Sort bookings by creation date descending
  const sorted = [...db.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, bookings: sorted });
});

// 6. Admin API - Update Booking Status
app.put('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const { paymentStatus } = req.body;
  const db = readDb();
  const index = db.bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '找不到此訂單。' });
  }

  if (paymentStatus) {
    db.bookings[index].paymentStatus = paymentStatus;
  }
  
  writeDb(db);
  res.json({ success: true, booking: db.bookings[index] });
});

// 7. Admin API - Delete Booking
app.delete('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const index = db.bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '找不到此訂單。' });
  }

  db.bookings.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: '訂單刪除成功。' });
});

// 8. Admin API - Get Statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = readDb();
  const bookings = db.bookings;

  let totalRevenue = 0;
  let paidRevenue = 0;
  let totalBookings = bookings.length;
  let paidBookings = 0;
  let pendingBookings = 0;

  const roomStats = { double: 0, quad: 0, pool_quad: 0, charter: 0 };
  const packageStats = {};

  bookings.forEach(b => {
    totalRevenue += b.totalPrice;
    if (b.paymentStatus === 'Paid' || b.paymentStatus === 'Completed') {
      paidRevenue += b.totalPrice;
      paidBookings++;
      
      // Room usage count
      roomStats[b.roomType] = (roomStats[b.roomType] || 0) + 1;

      // Packages stats
      b.packageDetails.forEach(p => {
        packageStats[p.name] = (packageStats[p.name] || 0) + 1;
      });
    } else if (b.paymentStatus === 'Pending') {
      pendingBookings++;
    }
  });

  res.json({
    success: true,
    stats: {
      totalRevenue,
      paidRevenue,
      totalBookings,
      paidBookings,
      pendingBookings,
      roomStats,
      packageStats
    }
  });
});

// 9. Admin API - Update Password
app.put('/api/admin/settings/password', requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: '密碼長度需至少 4 碼。' });
  }

  const db = readDb();
  db.settings.adminPassword = newPassword;
  writeDb(db);
  res.json({ success: true, message: '管理密碼修改成功！' });
});

// 9-1. Admin API - Update Payment Methods
app.put('/api/admin/settings/payment-methods', requireAdmin, (req, res) => {
  const { method } = req.body;
  if (!['card', 'transfer', 'both'].includes(method)) {
    return res.status(400).json({ success: false, message: '付款方式設定值不正確。' });
  }

  const db = readDb();
  db.settings.paymentMethods = method;
  writeDb(db);
  res.json({ success: true, message: '付款方式設定已更新。', method });
});

// 10. Front-end API - Get Site Configuration
app.get('/api/config', (req, res) => {
  const db = readDb();
  res.json({ success: true, siteConfig: db.siteConfig || {} });
});

// 11. Admin API - Upload Image (Single or Multiple)
app.post('/api/admin/upload', requireAdmin, upload.any(), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: '沒有上傳檔案或格式不符。' });
  }
  
  const imageUrls = req.files.map(f => `assets/uploads/${f.filename}`);
  res.json({ 
    success: true, 
    imageUrls: imageUrls, 
    imageUrl: imageUrls[0] 
  });
});

// 12. Admin API - Update Rooms Config
app.put('/api/admin/config/rooms', requireAdmin, (req, res) => {
  const { rooms } = req.body;
  if (!Array.isArray(rooms)) {
    return res.status(400).json({ success: false, message: '房型資料結構不正確。' });
  }

  const db = readDb();
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.rooms = rooms;
  writeDb(db);

  res.json({ success: true, message: '房型配置更新成功。' });
});

// 13. Admin API - Update Carousel Config
app.put('/api/admin/config/carousel', requireAdmin, (req, res) => {
  const { carousel } = req.body;
  if (!Array.isArray(carousel)) {
    return res.status(400).json({ success: false, message: '輪播資料結構不正確。' });
  }

  const db = readDb();
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.carousel = carousel;
  writeDb(db);

  res.json({ success: true, message: '首頁輪播圖更新成功。' });
});

// 14. Admin API - Update Gallery Config
app.put('/api/admin/config/gallery', requireAdmin, (req, res) => {
  const { gallery } = req.body;
  if (!Array.isArray(gallery)) {
    return res.status(400).json({ success: false, message: '圖庫資料結構不正確。' });
  }

  const db = readDb();
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.gallery = gallery;
  writeDb(db);

  res.json({ success: true, message: '寫真圖庫更新成功。' });
});

// 15. Admin API - Update Rules Config
app.put('/api/admin/config/rules', requireAdmin, (req, res) => {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'object') {
    return res.status(400).json({ success: false, message: '規則資料結構不正確。' });
  }

  const db = readDb();
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.rules = rules;
  writeDb(db);

  res.json({ success: true, message: '住宿規則與匯款資訊更新成功。' });
});

// 16. Admin API - Update About Config
app.put('/api/admin/config/about', requireAdmin, (req, res) => {
  const { about } = req.body;
  if (!about || typeof about !== 'object' || Array.isArray(about)) {
    return res.status(400).json({ success: false, message: '關於芭扎資料結構不正確。' });
  }

  const db = readDb();
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.about = about;
  writeDb(db);

  res.json({ success: true, message: '關於芭扎內容更新成功。' });
});

// Fallback: Route /bzzar/* requests to index.html (SPA feel)
app.get('/bzzar/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Any other route redirect to /bzzar/
app.get('*', (req, res) => {
  res.redirect('/bzzar/');
});

app.listen(PORT, () => {
  console.log(`Bazar Garden B&B server is running on http://localhost:${PORT}`);
});
