const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/bzzar', express.static(path.join(__dirname, 'public')));

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

  // Room pricing rules
  // double: 翠竹雙人房
  // quad: 鄉村/自然/樸石四人房
  // pool_quad: 弦木/澄花四人房 (私人泳池)
  // charter: 10人小包棟
  const roomRates = {
    double: { weekday: 2000, summer: 2800, holiday: 2800, consecutive: 3200 },
    quad: { weekday: 3000, summer: 3800, holiday: 3800, consecutive: 4800 },
    pool_quad: { weekday: 4000, summer: 4800, holiday: 4800, consecutive: 5600 },
    charter: { weekday: 8000, summer: 10000, holiday: 10000, consecutive: 12000 }
  };

  let roomPrice = 0;
  let currentDate = new Date(inDate);

  for (let i = 0; i < nights; i++) {
    const dayOfWeek = currentDate.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0); // Friday, Saturday, Sunday
    
    const rates = roomRates[roomType] || roomRates.double;

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

// 3. Mock Payment Notify (Simulates webhook callback from ECPay / Line Pay)
app.post('/api/payment/simulate', (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: '缺少訂單編號。' });
  }

  const db = readDb();
  const index = db.bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '找不到訂單。' });
  }

  db.bookings[index].paymentStatus = 'Paid';
  writeDb(db);

  res.json({
    success: true,
    message: '模擬金流扣款成功！訂單已更新為「已付款」',
    booking: db.bookings[index]
  });
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
