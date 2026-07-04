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

// Dynamic room rates configuration loaded from API
let roomRates = {};

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

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

// 2. Accordion Toggle
packageHeader.addEventListener('click', () => {
  const isOpen = packageContent.style.display === 'block';
  packageContent.style.display = isOpen ? 'none' : 'block';
  const icon = packageHeader.querySelector('.fa-chevron-down, .fa-chevron-up');
  if (icon) {
    icon.className = isOpen ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
  }
});
packageContent.style.display = 'block';

// 3. Set Default Dates (Today & Tomorrow)
function initDates() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  checkInInput.value = today.toISOString().split('T')[0];
  checkOutInput.value = tomorrow.toISOString().split('T')[0];
  
  checkInInput.min = today.toISOString().split('T')[0];
  updateCheckOutMin();
}

function updateCheckOutMin() {
  const checkInVal = checkInInput.value;
  if (checkInVal) {
    const minOut = new Date(checkInVal);
    minOut.setDate(minOut.getDate() + 1);
    checkOutInput.min = minOut.toISOString().split('T')[0];
    
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

// 4. Select Room Type from Room Cards
function selectRoomType(type) {
  roomTypeSelect.value = type;
  calculateClientPrice();
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// 5. Dynamic Content Loading & Rendering
async function loadDynamicContent() {
  try {
    const res = await fetch('/api/config');
    const result = await res.json();
    
    if (result.success && result.siteConfig) {
      const config = result.siteConfig;

      // A. Render Hero Carousel
      renderCarousel(config.carousel || []);

      // A-2. Render About Section
      renderAbout(config.about || {});

      // B. Render Room Cards & Dropdown
      renderRooms(config.rooms || []);

      // C. Render Gallery
      renderGallery(config.gallery || []);

      // D. Render Rules
      renderRules(config.rules || {});
    }
  } catch (err) {
    console.error('Error loading dynamic B&B content:', err);
  }
}

// Render About Section (falls back to static HTML content when a field is empty)
function renderAbout(about) {
  if (!about || Object.keys(about).length === 0) return;

  if (about.subtitle) document.getElementById('aboutSubtitle').textContent = about.subtitle;
  if (about.title) document.getElementById('aboutTitle').textContent = about.title;

  // Multi-image slider (falls back to legacy single `image` field)
  const aboutImages = Array.isArray(about.images) && about.images.length > 0
    ? about.images
    : (about.image ? [about.image] : []);
  if (aboutImages.length > 0) renderAboutSlider(aboutImages);

  if (about.paragraph1) document.getElementById('aboutP1').textContent = about.paragraph1;
  if (about.paragraph2) document.getElementById('aboutP2').textContent = about.paragraph2;

  if (Array.isArray(about.features) && about.features.length > 0) {
    const box = document.getElementById('aboutFeatures');
    box.innerHTML = '';
    about.features.forEach(f => {
      const iconClass = (f.icon || 'fa-circle-check').replace(/[^a-z0-9-]/g, '');
      const item = document.createElement('div');
      item.className = 'feature-item';
      item.innerHTML = `
        <div class="feature-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div>
          <h4 class="feature-title"></h4>
          <p class="feature-desc"></p>
        </div>
      `;
      item.querySelector('.feature-title').textContent = f.title || '';
      item.querySelector('.feature-desc').textContent = f.desc || '';
      box.appendChild(item);
    });
  }
}

// About image carousel — independent state so renderRooms() map resets can't break it
let aboutSliderImages = [];
let aboutSlideIndex = 0;
let aboutSliderTimer = null;

function renderAboutSlider(images) {
  const box = document.getElementById('aboutImgBox');
  aboutSliderImages = images;
  aboutSlideIndex = 0;

  const slidesHtml = images.map((url, i) => `
    <img src="${url}" alt="芭扎民宿環境實景" class="room-img ${i === 0 ? 'active' : ''}" onclick="openLightbox('${url}')" style="cursor: pointer;" title="點擊放大觀看原圖">
  `).join('');

  const hasMultiple = images.length > 1;
  box.innerHTML = `
    <div class="room-slides-track" id="about_track">
      ${slidesHtml}
    </div>
    ${hasMultiple ? `
      <button type="button" class="room-slider-btn prev" onclick="changeAboutSlide(-1, event)"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="room-slider-btn next" onclick="changeAboutSlide(1, event)"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="room-slider-dots" id="about_dots">
        ${images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="setAboutSlide(${i}, event)"></span>`).join('')}
      </div>
    ` : ''}
  `;

  restartAboutSliderTimer();
}

function restartAboutSliderTimer() {
  if (aboutSliderTimer) clearInterval(aboutSliderTimer);
  if (aboutSliderImages.length > 1) {
    aboutSliderTimer = setInterval(() => changeAboutSlide(1), 6000);
  }
}

function changeAboutSlide(dir, event) {
  if (event) {
    event.stopPropagation();
    restartAboutSliderTimer(); // manual action resets the autoplay countdown
  }
  if (aboutSliderImages.length <= 1) return;
  aboutSlideIndex = (aboutSlideIndex + dir + aboutSliderImages.length) % aboutSliderImages.length;
  updateAboutSliderDOM();
}

function setAboutSlide(index, event) {
  if (event) {
    event.stopPropagation();
    restartAboutSliderTimer();
  }
  aboutSlideIndex = index;
  updateAboutSliderDOM();
}

function updateAboutSliderDOM() {
  const track = document.getElementById('about_track');
  const dots = document.getElementById('about_dots');
  if (track) {
    track.querySelectorAll('.room-img').forEach((img, i) => img.classList.toggle('active', i === aboutSlideIndex));
  }
  if (dots) {
    dots.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === aboutSlideIndex));
  }
}

// Render Carousel Slider
let heroSlidesData = [];

function renderCarousel(carousel) {
  const heroSlider = document.getElementById('heroSlider');
  heroSlider.innerHTML = '';
  heroSlidesData = carousel;

  carousel.forEach((slide, index) => {
    const div = document.createElement('div');
    div.className = `slide ${index === 0 ? 'active' : ''}`;
    div.style.backgroundImage = `url('${slide.image}')`;
    heroSlider.appendChild(div);
  });

  applyHeroText(0, true);
  setupSliderLoop();
}

// Sync hero headline/tagline with the active slide's stored title/desc
function applyHeroText(index, instant) {
  const slide = heroSlidesData[index];
  if (!slide || (!slide.title && !slide.desc)) return; // keep current text as fallback

  const titleEl = document.getElementById('heroTitle');
  const taglineEl = document.getElementById('heroTagline');

  const swap = () => {
    if (slide.title) titleEl.textContent = slide.title;
    if (slide.desc) taglineEl.textContent = slide.desc;
    titleEl.classList.remove('hero-text-fade');
    taglineEl.classList.remove('hero-text-fade');
  };

  if (instant) {
    swap();
    return;
  }

  titleEl.classList.add('hero-text-fade');
  taglineEl.classList.add('hero-text-fade');
  setTimeout(swap, 350);
}

let sliderInterval = null;
function setupSliderLoop() {
  if (sliderInterval) clearInterval(sliderInterval);

  const slides = document.querySelectorAll('#heroSlider .slide');
  if (slides.length <= 1) return;

  let currentSlide = 0;
  sliderInterval = setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
    applyHeroText(currentSlide);
  }, 5000);
}

// Render Room List & Rates setup
let roomImagesMap = {};
let roomSlideIndexMap = {};

function changeRoomSlide(roomId, dir, event) {
  if (event) event.stopPropagation();
  const images = roomImagesMap[roomId] || [];
  if (images.length <= 1) return;

  let currentIndex = roomSlideIndexMap[roomId] || 0;
  currentIndex = (currentIndex + dir + images.length) % images.length;
  roomSlideIndexMap[roomId] = currentIndex;

  updateRoomSliderDOM(roomId);
}

function setRoomSlide(roomId, index, event) {
  if (event) event.stopPropagation();
  roomSlideIndexMap[roomId] = index;
  updateRoomSliderDOM(roomId);
}

function updateRoomSliderDOM(roomId) {
  const currentIndex = roomSlideIndexMap[roomId] || 0;
  const track = document.getElementById(`room_track_${roomId}`);
  const dotsBox = document.getElementById(`room_dots_${roomId}`);

  if (track) {
    const imgs = track.querySelectorAll('.room-img');
    imgs.forEach((img, i) => {
      if (i === currentIndex) img.classList.add('active');
      else img.classList.remove('active');
    });
  }

  if (dotsBox) {
    const dots = dotsBox.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      if (i === currentIndex) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }
}

function renderRooms(rooms) {
  const roomsGrid = document.getElementById('roomsGrid');
  roomsGrid.innerHTML = '';
  roomTypeSelect.innerHTML = '';
  roomRates = {};
  roomImagesMap = {};
  roomSlideIndexMap = {};

  rooms.forEach(room => {
    roomRates[room.id] = {
      weekday: room.priceWeekday,
      summer: room.priceSummer,
      holiday: room.priceHoliday,
      consecutive: room.priceConsecutive,
      name: room.name
    };

    const opt = document.createElement('option');
    opt.value = room.id;
    opt.textContent = room.name;
    roomTypeSelect.appendChild(opt);

    const images = room.images && room.images.length > 0 ? room.images : ['assets/room_double.jpg'];
    roomImagesMap[room.id] = images;
    roomSlideIndexMap[room.id] = 0;

    const card = document.createElement('div');
    card.className = 'room-card';
    
    const amenitiesHtml = room.amenities.map(a => `<span class="amenity">${a}</span>`).join('');
    
    let capacityText = '2';
    if (room.name.includes('四人') || room.id.includes('quad')) capacityText = '4';
    else if (room.name.includes('包棟') || room.id.includes('charter')) capacityText = '10';

    const slidesHtml = images.map((imgUrl, i) => `
      <img src="${imgUrl}" alt="${room.name}" class="room-img ${i === 0 ? 'active' : ''}" onclick="openLightbox('${imgUrl}')" style="cursor: pointer;" title="點擊放大觀看原圖">
    `).join('');

    const hasMultiple = images.length > 1;

    card.innerHTML = `
      <div class="room-img-box room-carousel-box" id="room_slider_${room.id}">
        <span class="room-badge">${capacityText} 人房</span>
        <div class="room-slides-track" id="room_track_${room.id}">
          ${slidesHtml}
        </div>
        ${hasMultiple ? `
          <button type="button" class="room-slider-btn prev" onclick="changeRoomSlide('${room.id}', -1, event)"><i class="fa-solid fa-chevron-left"></i></button>
          <button type="button" class="room-slider-btn next" onclick="changeRoomSlide('${room.id}', 1, event)"><i class="fa-solid fa-chevron-right"></i></button>
          <div class="room-slider-dots" id="room_dots_${room.id}">
            ${images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="setRoomSlide('${room.id}', ${i}, event)"></span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="room-content">
        <h3 class="room-title">${room.name}</h3>
        <p class="room-desc">${room.description}</p>
        <div class="room-amenities">
          ${amenitiesHtml}
        </div>
        <div class="room-pricing">
          <div class="price-item">平日房價 <span class="price-val">NT$ ${room.priceWeekday.toLocaleString()}</span></div>
          <div class="price-item">假日/暑假 <span class="price-val">NT$ ${room.priceHoliday.toLocaleString()}</span></div>
        </div>
        <a href="#booking" class="btn-book-room" onclick="selectRoomType('${room.id}')">選擇此房型</a>
      </div>
    `;
    roomsGrid.appendChild(card);
  });
}

// Render Gallery Grid
function renderGallery(gallery) {
  const galleryGrid = document.getElementById('galleryGrid');
  galleryGrid.innerHTML = '';

  gallery.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.onclick = () => openLightbox(item.image);
    card.innerHTML = `
      <img src="${item.image}" alt="${item.title}">
      <div class="gallery-overlay">
        <h4 class="gallery-title">${item.title}</h4>
        <p class="gallery-desc">${item.desc}</p>
      </div>
    `;
    galleryGrid.appendChild(card);
  });
}

// Render Rules list and Payment block
function renderRules(rules) {
  const rulesList = document.getElementById('rulesList');
  const paymentInfoText = document.getElementById('paymentInfoText');
  
  rulesList.innerHTML = '';
  if (rules.reminders && rules.reminders.length > 0) {
    rules.reminders.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      rulesList.appendChild(li);
    });
  }

  paymentInfoText.textContent = rules.payment || '';
}

// 6. Pricing Rules & Dynamic Client Calculator
function calculateClientPrice() {
  const roomType = roomTypeSelect.value;
  const checkIn = checkInInput.value;
  const checkOut = checkOutInput.value;
  const adults = parseInt(adultsInput.value) || 1;
  const kids = parseInt(kidsInput.value) || 0;
  const isSummer = isSummerCheckbox.checked;
  const isHolidayPackage = isHolidayPackageCheckbox.checked;
  const totalPeople = adults + kids;

  if (!checkIn || !checkOut || !roomRates[roomType]) return;

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

  // Round-trip ferry
  if (pkgs.ferry.chk.checked) {
    const ferryAdultCount = parseInt(document.getElementById('ferry_adult_qty').value) || 0;
    const ferryKidCount = parseInt(document.getElementById('ferry_kid_qty').value) || 0;
    const cost = (ferryAdultCount * 430) + (ferryKidCount * 200);
    packagePrice += cost;
    selectedPackages.push(`來回船票 x ${ferryAdultCount}大 ${ferryKidCount}小 (NT$ ${cost.toLocaleString()})`);
  }

  // Scooter
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

// 7. Event handlers setup
function setupEventHandlers() {
  roomTypeSelect.addEventListener('change', calculateClientPrice);
  adultsInput.addEventListener('change', () => {
    const val = parseInt(adultsInput.value) || 1;
    document.getElementById('ferry_adult_qty').value = val;
    document.getElementById('bbq_adult_qty').value = val;
    document.getElementById('deer_adult_qty').value = val;
    document.getElementById('aquarium_adult_qty').value = val;
    document.getElementById('glassBoat_adult_qty').value = val;
    
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
    
    const total = val + (parseInt(adultsInput.value) || 1);
    document.getElementById('scooter_qty').value = Math.ceil(total / 2);

    calculateClientPrice();
  });

  isSummerCheckbox.addEventListener('change', calculateClientPrice);
  isHolidayPackageCheckbox.addEventListener('change', calculateClientPrice);

  // Setup package toggle checkboxes
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

    if (p.inputs) {
      p.inputs.forEach(input => {
        input.addEventListener('change', calculateClientPrice);
      });
    }
  });
}

// 8. Submit booking
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
      window.location.href = `payment.html?id=${result.bookingId}`;
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// 10. Parallax scrolling for hand-drawn decorations
function initParallaxDecor() {
  const decors = document.querySelectorAll('.decor[data-parallax]');
  if (decors.length === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  function update() {
    ticking = false;
    if (reduceMotion.matches) return;

    const vhHalf = window.innerHeight / 2;
    decors.forEach(el => {
      const host = el.closest('section') || document.body;
      const rect = host.getBoundingClientRect();
      // Skip offscreen sections to keep scrolling cheap
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;

      const progress = rect.top + rect.height / 2 - vhHalf;
      const speed = parseFloat(el.dataset.parallax) || 0;
      const rot = el.dataset.rotate ? ` rotate(${el.dataset.rotate}deg)` : '';
      el.style.transform = `translate3d(0, ${(progress * speed).toFixed(1)}px, 0)${rot}`;
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
}

// Page Initialization
async function initApp() {
  initDates();
  setupEventHandlers();
  initParallaxDecor();
  await loadDynamicContent(); // Load content from db.json dynamically
}

initApp();
