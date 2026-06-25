// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const roomTypeSelect = document.getElementById('roomType');
const checkInInput = document.getElementById('checkIn');
const checkOutInput = document.getElementById('checkOut');
const adultsInput = document.getElementById('adults');
const kidsInput = document.getElementById('kids');
const isSummerCheckbox = document.getElementById('isSummer');
const isHolidayPackageCheckbox = document.getElementById('isHolidayPackage');
const packageHeader = document.querySelector('.package-header');
const packageContent = document.getElementById('packageContent');

// Package Checkboxes & Qty Fields
const pkgs = {
  ferry: {
    chk: document.getElementById('pkg_ferry'),
    card: document.getElementById('pkg_ferry_card'),
    qtyBox: document.getElementById('ferry_qty_box'),
    inputs: [document.getElementById('ferry_adult_qty'), document.getElementById('ferry_kid_qty')]
  },
  scooter: {
    chk: document.getElementById('pkg_scooter'),
    card: document.getElementById('pkg_scooter_card'),
    qtyBox: document.getElementById('scooter_qty_box'),
    inputs: [document.getElementById('scooter_qty'), document.getElementById('scooter_days')]
  },
  tidePool: { chk: document.getElementById('pkg_tidePool') },
  nightTour: { chk: document.getElementById('pkg_nightTour') },
  snorkeling: {
    chk: document.getElementById('pkg_snorkeling'),
    card: document.getElementById('pkg_snorkeling_card'),
    qtyBox: document.getElementById('snorkeling_qty_box'),
    inputs: [document.getElementById('snorkeling_qty')]
  },
  diving: {
    chk: document.getElementById('pkg_diving'),
    card: document.getElementById('pkg_diving_card'),
    qtyBox: document.getElementById('diving_qty_box'),
    inputs: [document.getElementById('diving_qty')]
  },
  sup: {
    chk: document.getElementById('pkg_sup'),
    card: document.getElementById('pkg_sup_card'),
    qtyBox: document.getElementById('sup_qty_box'),
    inputs: [document.getElementById('sup_qty')]
  },
  kayakNormal: {
    chk: document.getElementById('pkg_kayakNormal'),
    card: document.getElementById('pkg_kayakNormal_card'),
    qtyBox: document.getElementById('kayakNormal_qty_box'),
    inputs: [document.getElementById('kayakNormal_qty')]
  },
  kayakClear: {
    chk: document.getElementById('pkg_kayakClear'),
    card: document.getElementById('pkg_kayakClear_card'),
    qtyBox: document.getElementById('kayakClear_qty_box'),
    inputs: [document.getElementById('kayakClear_qty')]
  },
  bbq: {
    chk: document.getElementById('pkg_bbq'),
    card: document.getElementById('pkg_bbq_card'),
    qtyBox: document.getElementById('bbq_qty_box'),
    inputs: [document.getElementById('bbq_adult_qty'), document.getElementById('bbq_kid_qty')]
  },
  deer: {
    chk: document.getElementById('pkg_deer'),
    card: document.getElementById('pkg_deer_card'),
    qtyBox: document.getElementById('deer_qty_box'),
    inputs: [document.getElementById('deer_adult_qty'), document.getElementById('deer_kid_qty')]
  },
  aquarium: {
    chk: document.getElementById('pkg_aquarium'),
    card: document.getElementById('pkg_aquarium_card'),
    qtyBox: document.getElementById('aquarium_qty_box'),
    inputs: [document.getElementById('aquarium_adult_qty'), document.getElementById('aquarium_kid_qty')]
  },
  glassBoat: {
    chk: document.getElementById('pkg_glassBoat'),
    card: document.getElementById('pkg_glassBoat_card'),
    qtyBox: document.getElementById('glassBoat_qty_box'),
    inputs: [document.getElementById('glassBoat_adult_qty'), document.getElementById('glassBoat_kid_qty')]
  }
};

// Summary Elements
const summaryRoom = document.getElementById('summaryRoom');
const summaryNights = document.getElementById('summaryNights');
const summaryPeople = document.getElementById('summaryPeople');
const summaryRoomPrice = document.getElementById('summaryRoomPrice');
const summaryPackagesList = document.getElementById('summaryPackagesList');
const summaryPackagePrice = document.getElementById('summaryPackagePrice');
const summaryTotal = document.getElementById('summaryTotal');
const btnSubmitBooking = document.getElementById('btnSubmitBooking');

// 1. Mobile Menu Toggle
menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Close nav links when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

// 2. Hero Slider
const slides = document.querySelectorAll('#heroSlider .slide');
let currentSlide = 0;
setInterval(() => {
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}, 5000);

// 3. Accordion Toggle
packageHeader.addEventListener('click', () => {
  const isOpen = packageContent.style.display === 'block';
  packageContent.style.display = isOpen ? 'none' : 'block';
  const icon = packageHeader.querySelector('.fa-chevron-down, .fa-chevron-up');
  if (icon) {
    icon.className = isOpen ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
  }
});
// Open by default on page load for better exposure
packageContent.style.display = 'block';

// 4. Set Default Dates (Today & Tomorrow)
function initDates() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  checkInInput.value = today.toISOString().split('T')[0];
  checkOutInput.value = tomorrow.toISOString().split('T')[0];
  
  // Set min check-in date
  checkInInput.min = today.toISOString().split('T')[0];
  updateCheckOutMin();
}

function updateCheckOutMin() {
  const checkInVal = checkInInput.value;
  if (checkInVal) {
    const minOut = new Date(checkInVal);
    minOut.setDate(minOut.getDate() + 1);
    checkOutInput.min = minOut.toISOString().split('T')[0];
    
    // If current check-out is before new min check-out, update it
    if (new Date(checkOutInput.value) <= new Date(checkInVal)) {
      checkOutInput.value = minOut.toISOString().split('T')[0];
    }
  }
}

checkInInput.addEventListener('change', () => {
  updateCheckOutMin();
  calculateClientPrice();
});
checkOutInput.addEventListener('change', calculateClientPrice);

// 5. Select Room Type from Room Cards
function selectRoomType(type) {
  roomTypeSelect.value = type;
  calculateClientPrice();
  // Scroll to booking form
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// 6. Pricing Rules & Dynamic Client Calculator
const roomRates = {
  double: { weekday: 2000, summer: 2800, holiday: 2800, consecutive: 3200, name: '翠竹雙人房' },
  quad: { weekday: 3000, summer: 3800, holiday: 3800, consecutive: 4800, name: '鄉村/自然/樸石四人房' },
  pool_quad: { weekday: 4000, summer: 4800, holiday: 4800, consecutive: 5600, name: '弦木/澄花泳池四人房' },
  charter: { weekday: 8000, summer: 10000, holiday: 10000, consecutive: 12000, name: '10人小包棟' }
};

function calculateClientPrice() {
  const roomType = roomTypeSelect.value;
  const checkIn = checkInInput.value;
  const checkOut = checkOutInput.value;
  const adults = parseInt(adultsInput.value) || 1;
  const kids = parseInt(kidsInput.value) || 0;
  const isSummer = isSummerCheckbox.checked;
  const isHolidayPackage = isHolidayPackageCheckbox.checked;
  const totalPeople = adults + kids;

  if (!checkIn || !checkOut) return;

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Calculate room cost night by night
  let roomPrice = 0;
  let currentDate = new Date(inDate);
  for (let i = 0; i < nights; i++) {
    const dayOfWeek = currentDate.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
    const rates = roomRates[roomType];

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

  // Sync summary info
  summaryRoom.textContent = roomRates[roomType].name;
  summaryNights.textContent = `${nights} 晚`;
  summaryPeople.textContent = `${adults} 大 ${kids} 小`;
  summaryRoomPrice.textContent = `NT$ ${roomPrice.toLocaleString()}`;

  // Package calculation
  let packagePrice = 0;
  const selectedPackages = [];

  // Round-trip ferry: Adult 430, Child 200
  if (pkgs.ferry.chk.checked) {
    const ferryAdultCount = parseInt(document.getElementById('ferry_adult_qty').value) || 0;
    const ferryKidCount = parseInt(document.getElementById('ferry_kid_qty').value) || 0;
    const cost = (ferryAdultCount * 430) + (ferryKidCount * 200);
    packagePrice += cost;
    selectedPackages.push(`來回船票 x ${ferryAdultCount}大 ${ferryKidCount}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Scooter: 400 per 24 hours per scooter (shared by 2 people)
  if (pkgs.scooter.chk.checked) {
    const scooterCount = parseInt(document.getElementById('scooter_qty').value) || 0;
    const scooterDays = parseInt(document.getElementById('scooter_days').value) || nights;
    const cost = scooterCount * 400 * scooterDays;
    packagePrice += cost;
    selectedPackages.push(`機車租借 x ${scooterCount}台 ${scooterDays}天 (NT$ ${cost.toLocaleString()})`);
  }

  // Tide pool
  if (pkgs.tidePool.chk.checked) {
    const cost = totalPeople * 100;
    packagePrice += cost;
    selectedPackages.push(`潮間帶生態導覽 x ${totalPeople}人 (NT$ ${cost.toLocaleString()})`);
  }

  // Night tour
  if (pkgs.nightTour.chk.checked) {
    const cost = totalPeople * 100;
    packagePrice += cost;
    selectedPackages.push(`夜遊導覽 x ${totalPeople}人 (NT$ ${cost.toLocaleString()})`);
  }

  // Snorkeling
  if (pkgs.snorkeling.chk.checked) {
    const qty = parseInt(document.getElementById('snorkeling_qty').value) || 0;
    const cost = qty * 450;
    packagePrice += cost;
    selectedPackages.push(`浮潛體驗 x ${qty}人 (NT$ ${cost.toLocaleString()})`);
  }

  // Diving
  if (pkgs.diving.chk.checked) {
    const qty = parseInt(document.getElementById('diving_qty').value) || 0;
    const cost = qty * 2550;
    packagePrice += cost;
    selectedPackages.push(`體驗潛水 x ${qty}人 (NT$ ${cost.toLocaleString()})`);
  }

  // SUP
  if (pkgs.sup.chk.checked) {
    const qty = parseInt(document.getElementById('sup_qty').value) || 0;
    const cost = qty * 1250;
    packagePrice += cost;
    selectedPackages.push(`SUP立槳 x ${qty}板 (NT$ ${cost.toLocaleString()})`);
  }

  // Kayak Normal
  if (pkgs.kayakNormal.chk.checked) {
    const qty = parseInt(document.getElementById('kayakNormal_qty').value) || 0;
    const cost = qty * 650;
    packagePrice += cost;
    selectedPackages.push(`一般獨木舟 x ${qty}人 (NT$ ${cost.toLocaleString()})`);
  }

  // Kayak Clear
  if (pkgs.kayakClear.chk.checked) {
    const qty = parseInt(document.getElementById('kayakClear_qty').value) || 0;
    const cost = qty * 850;
    packagePrice += cost;
    selectedPackages.push(`透明獨木舟 x ${qty}人 (NT$ ${cost.toLocaleString()})`);
  }

  // BBQ
  if (pkgs.bbq.chk.checked) {
    const bbqAdult = parseInt(document.getElementById('bbq_adult_qty').value) || 0;
    const bbqKid = parseInt(document.getElementById('bbq_kid_qty').value) || 0;
    const cost = (bbqAdult * 450) + (bbqKid * 250);
    packagePrice += cost;
    selectedPackages.push(`築安心/極香燒烤 x ${bbqAdult}大 ${bbqKid}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Sika Deer
  if (pkgs.deer.chk.checked) {
    const deerAdult = parseInt(document.getElementById('deer_adult_qty').value) || 0;
    const deerKid = parseInt(document.getElementById('deer_kid_qty').value) || 0;
    const cost = (deerAdult * 220) + (deerKid * 50);
    packagePrice += cost;
    selectedPackages.push(`梅花鹿園區門票 x ${deerAdult}大 ${deerKid}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Aquarium
  if (pkgs.aquarium.chk.checked) {
    const aqAdult = parseInt(document.getElementById('aquarium_adult_qty').value) || 0;
    const aqKid = parseInt(document.getElementById('aquarium_kid_qty').value) || 0;
    const cost = (aqAdult * 200) + (aqKid * 160);
    packagePrice += cost;
    selectedPackages.push(`海洋館門票 x ${aqAdult}大 ${aqKid}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Glass bottom boat
  if (pkgs.glassBoat.chk.checked) {
    const gbAdult = parseInt(document.getElementById('glassBoat_adult_qty').value) || 0;
    const gbKid = parseInt(document.getElementById('glassBoat_kid_qty').value) || 0;
    const cost = (gbAdult * 230) + (gbKid * 150);
    packagePrice += cost;
    selectedPackages.push(`玻璃船票 x ${gbAdult}大 ${gbKid}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Render Package list in Summary Card
  summaryPackagesList.innerHTML = '';
  if (selectedPackages.length === 0) {
    const li = document.createElement('li');
    li.textContent = '無加購項目';
    summaryPackagesList.appendChild(li);
  } else {
    selectedPackages.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      summaryPackagesList.appendChild(li);
    });
  }

  summaryPackagePrice.textContent = `NT$ ${packagePrice.toLocaleString()}`;
  
  const grandTotal = roomPrice + packagePrice;
  summaryTotal.textContent = `NT$ ${grandTotal.toLocaleString()}`;
}

// 7. Event listeners for quantity synchronization & cards display
function setupEventHandlers() {
  // Recalculate price on any base details change
  roomTypeSelect.addEventListener('change', calculateClientPrice);
  adultsInput.addEventListener('change', () => {
    // Sync default ferry adult quantity, bbq, etc.
    const val = parseInt(adultsInput.value) || 1;
    document.getElementById('ferry_adult_qty').value = val;
    document.getElementById('bbq_adult_qty').value = val;
    document.getElementById('deer_adult_qty').value = val;
    document.getElementById('aquarium_adult_qty').value = val;
    document.getElementById('glassBoat_adult_qty').value = val;
    
    // Default scooter count is ceil(people/2)
    const total = val + (parseInt(kidsInput.value) || 0);
    document.getElementById('scooter_qty').value = Math.ceil(total / 2);
    
    calculateClientPrice();
  });

  kidsInput.addEventListener('change', () => {
    const val = parseInt(kidsInput.value) || 0;
    document.getElementById('ferry_kid_qty').value = val;
    document.getElementById('bbq_kid_qty').value = val;
    document.getElementById('deer_kid_qty').value = val;
    document.getElementById('aquarium_kid_qty').value = val;
    document.getElementById('glassBoat_kid_qty').value = val;
    
    // Default scooter count
    const total = val + (parseInt(adultsInput.value) || 1);
    document.getElementById('scooter_qty').value = Math.ceil(total / 2);

    calculateClientPrice();
  });

  isSummerCheckbox.addEventListener('change', calculateClientPrice);
  isHolidayPackageCheckbox.addEventListener('change', calculateClientPrice);

  // Setup show/hide handlers for each package checkbox
  Object.keys(pkgs).forEach(key => {
    const p = pkgs[key];
    p.chk.addEventListener('change', () => {
      if (p.chk.checked) {
        if (p.card) p.card.classList.add('selected');
        if (p.qtyBox) p.qtyBox.style.display = 'flex';
      } else {
        if (p.card) p.card.classList.remove('selected');
        if (p.qtyBox) p.qtyBox.style.display = 'none';
      }
      calculateClientPrice();
    });

    // Also trigger on change of any sub-inputs (like quantity selectors)
    if (p.inputs) {
      p.inputs.forEach(input => {
        input.addEventListener('change', calculateClientPrice);
      });
    }
  });
}

// 8. Submit booking form to backend API
btnSubmitBooking.addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const roomType = roomTypeSelect.value;
  const checkIn = checkInInput.value;
  const checkOut = checkOutInput.value;
  const adults = adultsInput.value;
  const kids = kidsInput.value;
  const isSummer = isSummerCheckbox.checked;
  const isHolidayPackage = isHolidayPackageCheckbox.checked;
  const note = document.getElementById('note').value.trim();

  if (!name || !phone || !checkIn || !checkOut) {
    alert('請填寫姓名、電話與入住/退房日期！');
    return;
  }

  // Package flags & inputs
  const packages = {};
  
  if (pkgs.ferry.chk.checked) {
    packages.ferry = true;
    packages.ferryAdultCount = document.getElementById('ferry_adult_qty').value;
    packages.ferryKidCount = document.getElementById('ferry_kid_qty').value;
  }
  if (pkgs.scooter.chk.checked) {
    packages.scooter = true;
    packages.scooterCount = document.getElementById('scooter_qty').value;
    packages.scooterDays = document.getElementById('scooter_days').value;
  }
  if (pkgs.tidePool.chk.checked) packages.tidePool = true;
  if (pkgs.nightTour.chk.checked) packages.nightTour = true;
  if (pkgs.snorkeling.chk.checked) {
    packages.snorkeling = true;
    packages.snorkelingCount = document.getElementById('snorkeling_qty').value;
  }
  if (pkgs.diving.chk.checked) {
    packages.diving = true;
    packages.divingCount = document.getElementById('diving_qty').value;
  }
  if (pkgs.sup.chk.checked) {
    packages.sup = true;
    packages.supCount = document.getElementById('sup_qty').value;
  }
  if (pkgs.kayakNormal.chk.checked) {
    packages.kayakNormal = true;
    packages.kayakNormalCount = document.getElementById('kayakNormal_qty').value;
  }
  if (pkgs.kayakClear.chk.checked) {
    packages.kayakClear = true;
    packages.kayakClearCount = document.getElementById('kayakClear_qty').value;
  }
  if (pkgs.bbq.chk.checked) {
    packages.bbq = true;
    packages.bbqAdultCount = document.getElementById('bbq_adult_qty').value;
    packages.bbqKidCount = document.getElementById('bbq_kid_qty').value;
  }
  if (pkgs.deer.chk.checked) {
    packages.deer = true;
    packages.deerAdultCount = document.getElementById('deer_adult_qty').value;
    packages.deerKidCount = document.getElementById('deer_kid_qty').value;
  }
  if (pkgs.aquarium.chk.checked) {
    packages.aquarium = true;
    packages.aquariumAdultCount = document.getElementById('aquarium_adult_qty').value;
    packages.aquariumKidCount = document.getElementById('aquarium_kid_qty').value;
  }
  if (pkgs.glassBoat.chk.checked) {
    packages.glassBoat = true;
    packages.glassBoatAdultCount = document.getElementById('glassBoat_adult_qty').value;
    packages.glassBoatKidCount = document.getElementById('glassBoat_kid_qty').value;
  }

  const payload = {
    name, phone, email, roomType, checkIn, checkOut,
    adults, kids, isSummer, isHolidayPackage, packages, note
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      // Redirect to simulated payment page
      window.location.href = `/payment.html?id=${result.bookingId}`;
    } else {
      alert(`預約失敗: ${result.message}`);
    }
  } catch (err) {
    console.error('Error submitting booking:', err);
    alert('伺服器連線錯誤，請稍後再試。');
  }
});

// 9. Lightbox logic
const lightboxModal = document.getElementById('lightboxModal');
const lightboxImg = document.getElementById('lightboxImg');

function openLightbox(src) {
  lightboxImg.src = src;
  lightboxModal.style.display = 'flex';
}

function closeLightbox() {
  lightboxModal.style.display = 'none';
}

// Esc key closes lightbox
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Init on load
initDates();
setupEventHandlers();
calculateClientPrice();
