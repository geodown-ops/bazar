// Admin Global State
let adminToken = localStorage.getItem('bazar_admin_token') || null;
let allBookings = [];
let dashboardStats = null;
let currentActiveTab = 'bookings';

// DOM Elements
const adminLoginOverlay = document.getElementById('adminLoginOverlay');
const adminDashboard = document.getElementById('adminDashboard');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const bookingsTableBody = document.getElementById('bookingsTableBody');
const emptyBookingsMsg = document.getElementById('emptyBookingsMsg');

// Check initial auth state
if (adminToken) {
  showDashboard();
} else {
  showLogin();
}

function showLogin() {
  adminLoginOverlay.style.display = 'flex';
  adminDashboard.style.display = 'none';
}

function showDashboard() {
  adminLoginOverlay.style.display = 'none';
  adminDashboard.style.display = 'block';
  loadDashboardData();
  loadCmsData();
}

// 1. Admin Login
async function loginAdmin() {
  const password = document.getElementById('adminPassword').value;
  if (!password) {
    showLoginError('請輸入密碼！');
    return;
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const result = await res.json();
    
    if (result.success) {
      adminToken = result.token;
      localStorage.setItem('bazar_admin_token', adminToken);
      loginErrorMsg.style.display = 'none';
      showDashboard();
    } else {
      showLoginError(result.message || '登入失敗，密碼錯誤！');
    }
  } catch (err) {
    console.error('Error logging in:', err);
    showLoginError('伺服器連線錯誤！');
  }
}

function showLoginError(msg) {
  loginErrorMsg.textContent = msg;
  loginErrorMsg.style.display = 'block';
}

// 2. Admin Logout
function logoutAdmin() {
  adminToken = null;
  localStorage.removeItem('bazar_admin_token');
  document.getElementById('adminPassword').value = '';
  showLogin();
}

// 3. Tab Switching
function switchTab(tabName) {
  currentActiveTab = tabName;
  
  // Update sidebar active state
  document.querySelectorAll('.admin-sidebar li').forEach(li => {
    li.classList.remove('active');
  });
  document.getElementById(`tab_${tabName}_nav`).classList.add('active');

  // Show/Hide tab content
  document.getElementById('tab_bookings').style.display = tabName === 'bookings' ? 'block' : 'none';
  document.getElementById('tab_stats').style.display = tabName === 'stats' ? 'block' : 'none';
  document.getElementById('tab_cms').style.display = tabName === 'cms' ? 'block' : 'none';
  document.getElementById('tab_settings').style.display = tabName === 'settings' ? 'block' : 'none';

  if (tabName === 'stats') {
    renderStatsCharts();
  } else if (tabName === 'cms') {
    loadCmsData();
    switchCmsSubTab(currentCmsSubTab || 'rooms');
  }
}

// 4. Fetch Dashboard Data
async function loadDashboardData() {
  if (!adminToken) return;

  try {
    // A. Load Bookings
    const resB = await fetch('/api/admin/bookings', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (resB.status === 403) {
      // Token expired or invalid
      logoutAdmin();
      return;
    }
    const resultB = await resB.json();
    if (resultB.success) {
      allBookings = resultB.bookings;
      renderBookingsTable();
    }

    // B. Load Stats
    const resS = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const resultS = await resS.json();
    if (resultS.success) {
      dashboardStats = resultS.stats;
      updateStatsWidgets(resultS.stats);
      if (currentActiveTab === 'stats') {
        renderStatsCharts();
      }
    }
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

// 5. Update Top Stat Cards
function updateStatsWidgets(stats) {
  document.getElementById('stat_paidRevenue').textContent = `NT$ ${stats.paidRevenue.toLocaleString()}`;
  document.getElementById('stat_totalRevenue').textContent = `預估總額: NT$ ${stats.totalRevenue.toLocaleString()}`;
  
  document.getElementById('stat_paidBookings').textContent = `${stats.paidBookings} 筆`;
  document.getElementById('stat_totalBookings').textContent = `總訂單數: ${stats.totalBookings} 筆`;
  
  document.getElementById('stat_pendingBookings').textContent = `${stats.pendingBookings} 筆`;
}

// 6. Render Bookings Table with Filters
const roomNames = {
  double: '翠竹雙人房',
  quad: '鄉村/自然/樸石四人房',
  pool_quad: '弦木/澄花泳池房',
  charter: '10人小包棟'
};

function renderBookingsTable() {
  const statusFilter = document.getElementById('filterStatus').value;
  const searchQuery = document.getElementById('searchQuery').value.trim().toLowerCase();

  // Filter bookings
  const filtered = allBookings.filter(b => {
    const matchesStatus = statusFilter === 'all' || b.paymentStatus === statusFilter;
    const matchesQuery = !searchQuery || 
                         b.name.toLowerCase().includes(searchQuery) || 
                         b.phone.includes(searchQuery) ||
                         b.id.toLowerCase().includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  bookingsTableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    emptyBookingsMsg.style.display = 'block';
    return;
  }
  emptyBookingsMsg.style.display = 'none';

  filtered.forEach(b => {
    const tr = document.createElement('tr');
    
    // Status text and class
    let statusText = '待付款';
    let statusClass = 'pending';
    if (b.paymentStatus === 'Paid') { statusText = '已付款'; statusClass = 'paid'; }
    else if (b.paymentStatus === 'Completed') { statusText = '已完成'; statusClass = 'completed'; }
    else if (b.paymentStatus === 'Cancelled') { statusText = '已取消'; statusClass = 'cancelled'; }

    const roomName = roomNames[b.roomType] || b.roomType;
    
    // Detail info for packages
    let pkgDetailsHtml = '';
    if (b.packageDetails && b.packageDetails.length > 0) {
      pkgDetailsHtml = b.packageDetails.map(p => `• ${p.name}: ${p.desc}`).join('\n');
    } else {
      pkgDetailsHtml = '無加購項目';
    }

    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: var(--secondary-color);" title="下單時間: ${new Date(b.createdAt).toLocaleString()}">${b.id}</td>
      <td><strong>${b.name}</strong></td>
      <td>${b.phone}</td>
      <td title="${b.adults} 大 ${b.kids} 小">${roomName}</td>
      <td>${b.checkIn} <br> ${b.checkOut} (${b.nights}晚)</td>
      <td style="font-weight: 700; color: var(--primary-color);" title="房價: ${b.roomPrice} / 套裝: ${b.packagePrice}">${b.totalPrice.toLocaleString()}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <div class="admin-actions">
          <select onchange="updateBookingStatus('${b.id}', this.value)" style="padding: 4px; border-radius: 4px; font-size:12px; width: 90px;">
            <option value="Pending" ${b.paymentStatus === 'Pending' ? 'selected' : ''}>待付款</option>
            <option value="Paid" ${b.paymentStatus === 'Paid' ? 'selected' : ''}>已付款</option>
            <option value="Completed" ${b.paymentStatus === 'Completed' ? 'selected' : ''}>已完成</option>
            <option value="Cancelled" ${b.paymentStatus === 'Cancelled' ? 'selected' : ''}>已取消</option>
          </select>
          <button class="btn-action-small" onclick="viewBookingDetails('${b.id}')" title="查看明細"><i class="fa-solid fa-eye"></i></button>
          <button class="btn-action-small" onclick="deleteBooking('${b.id}')" style="color: #dc2626;" title="刪除"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    `;
    bookingsTableBody.appendChild(tr);
  });
}

// 7. Update Booking Status (Paid, Completed, Cancelled)
async function updateBookingStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentStatus: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      loadDashboardData();
    } else {
      alert(`更新失敗: ${result.message}`);
    }
  } catch (err) {
    console.error('Error updating booking status:', err);
    alert('伺服器連線錯誤！');
  }
}

// 8. Delete Booking
async function deleteBooking(id) {
  if (!confirm(`確定要刪除訂單 ${id} 嗎？此操作無法還原。`)) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const result = await res.json();
    if (result.success) {
      loadDashboardData();
    } else {
      alert(`刪除失敗: ${result.message}`);
    }
  } catch (err) {
    console.error('Error deleting booking:', err);
    alert('伺服器連線錯誤！');
  }
}

// 9. View Booking Details popup
function viewBookingDetails(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  const pkgList = booking.packageDetails.length > 0
    ? booking.packageDetails.map(p => `  - ${p.name} (${p.desc}): NT$ ${p.cost.toLocaleString()}`).join('\n')
    : '  無加購套裝';

  const roomName = roomNames[booking.roomType] || booking.roomType;

  alert(`
=== 訂單 ${booking.id} 詳細明細 ===
聯絡姓名：${booking.name}
聯絡電話：${booking.phone}
聯絡信箱：${booking.email || '未填寫'}
房型：${roomName}
入住期間：${booking.checkIn} 至 ${booking.checkOut} (${booking.nights} 晚)
住房人數：${booking.adults} 大人, ${booking.kids} 小孩
客房小計：NT$ ${booking.roomPrice.toLocaleString()}

套裝內容：
${pkgList}
套裝小計：NT$ ${booking.packagePrice.toLocaleString()}

應收總額：NT$ ${booking.totalPrice.toLocaleString()}
付款狀態：${booking.paymentStatus}
下單時間：${new Date(booking.createdAt).toLocaleString()}
備註需求：${booking.note || '無'}
  `);
}

// 10. Render Charts dynamically using custom DOM bar charts
function renderStatsCharts() {
  if (!dashboardStats) return;

  // A. Room Stats Chart
  const roomChart = document.getElementById('roomStatsChart');
  roomChart.innerHTML = '';
  
  const roomTitles = {
    double: '翠竹雙人房',
    quad: '四人房(鄉村/自然/樸石)',
    pool_quad: '泳池房(弦木/澄花)',
    charter: '10人小包棟'
  };

  // Find max value for scaling
  const rStats = dashboardStats.roomStats;
  const maxRoom = Math.max(...Object.values(rStats), 1);

  Object.keys(rStats).forEach(key => {
    const val = rStats[key];
    const percentage = (val / maxRoom) * 100;
    
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <div class="chart-label">${roomTitles[key] || key}</div>
      <div class="chart-track">
        <div class="chart-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="chart-value">${val} 次</div>
    `;
    roomChart.appendChild(row);
  });

  // B. Packages Stats Chart
  const pkgChart = document.getElementById('packageStatsChart');
  pkgChart.innerHTML = '';

  const pStats = dashboardStats.packageStats;
  const pkgKeys = Object.keys(pStats);

  if (pkgKeys.length === 0) {
    pkgChart.innerHTML = '<div style="color: var(--text-light); font-size:14px;">目前暫無加購套裝銷售數據。</div>';
    return;
  }

  // Sort packages by popularity
  const sortedPkgs = pkgKeys.map(k => ({ name: k, count: pStats[k] }))
                            .sort((a, b) => b.count - a.count);
  
  const maxPkg = Math.max(...sortedPkgs.map(p => p.count), 1);

  sortedPkgs.forEach(p => {
    const percentage = (p.count / maxPkg) * 100;
    
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <div class="chart-label">${p.name}</div>
      <div class="chart-track">
        <div class="chart-fill" style="width: ${percentage}%; background-color: var(--secondary-color);"></div>
      </div>
      <div class="chart-value">${p.count} 次</div>
    `;
    pkgChart.appendChild(row);
  });
}

// 11. Change Admin Password
async function updateAdminPassword() {
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;
  const passwordMsg = document.getElementById('passwordMsg');

  if (!newPass || newPass.length < 4) {
    showPasswordMsg('密碼長度需至少 4 碼！', '#dc2626');
    return;
  }

  if (newPass !== confirmPass) {
    showPasswordMsg('兩次輸入的新密碼不相同！', '#dc2626');
    return;
  }

  try {
    const res = await fetch('/api/admin/settings/password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword: newPass })
    });
    const result = await res.json();
    if (result.success) {
      showPasswordMsg('密碼修改成功！下次登入將生效。', '#10b981');
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    } else {
      showPasswordMsg(`修改失敗: ${result.message}`, '#dc2626');
    }
  } catch (err) {
    console.error('Error updating password:', err);
    showPasswordMsg('伺服器連線錯誤！', '#dc2626');
  }
}

function showPasswordMsg(text, color) {
  passwordMsg.textContent = text;
  passwordMsg.style.color = color;
}

// ==========================================
// 12. CMS Content Management Logic
// ==========================================

function getImgSrc(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return url.replace(/^(\.\.\/|\/)+/, '');
}

let cmsRooms = [];
let cmsCarousel = [];
let cmsGallery = [];
let cmsRules = {};
let currentCmsSubTab = 'rooms';

// Subtab switching in CMS
function switchCmsSubTab(subTab) {
  currentCmsSubTab = subTab;
  
  // Update buttons classes
  ['rooms', 'carousel', 'gallery', 'rules'].forEach(tab => {
    const btn = document.getElementById(`subtab_${tab}_btn`);
    const pane = document.getElementById(`cms_subtab_${tab}`);
    if (tab === subTab) {
      btn.classList.add('btn-action-primary');
      pane.style.display = 'block';
    } else {
      btn.classList.remove('btn-action-primary');
      pane.style.display = 'none';
    }
  });

  if (subTab === 'rooms') closeRoomEditor();
}

// Load dynamic config from database
async function loadCmsData() {
  if (!adminToken) return;

  try {
    const res = await fetch('/api/config');
    const result = await res.json();
    if (result.success && result.siteConfig) {
      cmsRooms = result.siteConfig.rooms || [];
      cmsCarousel = result.siteConfig.carousel || [];
      cmsGallery = result.siteConfig.gallery || [];
      cmsRules = result.siteConfig.rules || { checkInTime: '15:00', checkOutTime: '11:00', reminders: [], payment: '' };

      renderCmsRooms();
      renderCmsCarousel();
      renderCmsGallery();
      renderCmsRules();
    }
  } catch (err) {
    console.error('Error loading CMS config:', err);
  }
}

// A. Rooms Management
function renderCmsRooms() {
  const tbody = document.getElementById('cmsRoomsTableBody');
  tbody.innerHTML = '';

  if (cmsRooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-light);">尚無任何房型配置</td></tr>';
    return;
  }

  cmsRooms.forEach(room => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:bold;">${room.id}</td>
      <td><strong>${room.name}</strong></td>
      <td>NT$ ${room.priceWeekday.toLocaleString()}</td>
      <td>NT$ ${room.priceHoliday.toLocaleString()}</td>
      <td>NT$ ${room.priceConsecutive.toLocaleString()}</td>
      <td>
        <div class="admin-actions">
          <button class="btn-action-small" onclick="openRoomEditor('${room.id}')" title="編輯房型"><i class="fa-solid fa-pen-to-square"></i> 編輯</button>
          <button class="btn-action-small" onclick="deleteRoomConfig('${room.id}')" style="color:#dc2626;" title="刪除房型"><i class="fa-solid fa-trash-can"></i> 刪除</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let currentEditingRoomImages = [];

function renderRoomImagesGrid() {
  const grid = document.getElementById('editRoom_images_grid');
  grid.innerHTML = '';
  
  if (currentEditingRoomImages.length === 0) {
    grid.innerHTML = '<p style="font-size: 12px; color: var(--text-light);">尚未加入任何照片，請點擊上方按鈕選擇並上傳照片。</p>';
    return;
  }

  currentEditingRoomImages.forEach((url, idx) => {
    const card = document.createElement('div');
    card.style.cssText = 'position: relative; width: 100px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color);';
    card.innerHTML = `
      <img src="${getImgSrc(url)}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" onclick="removeRoomImage(${idx})" style="position: absolute; top: 4px; right: 4px; background: #dc2626; color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;" title="刪除此照片"><i class="fa-solid fa-xmark"></i></button>
    `;
    grid.appendChild(card);
  });
}

function removeRoomImage(idx) {
  currentEditingRoomImages.splice(idx, 1);
  renderRoomImagesGrid();
}

function openRoomEditor(roomId = null) {
  const formBox = document.getElementById('roomEditorFormBox');
  const titleEl = document.getElementById('roomEditorTitle');
  const isNewEl = document.getElementById('editRoom_isNew');
  
  const idInput = document.getElementById('editRoom_id');
  const nameInput = document.getElementById('editRoom_name');
  const weekdayInput = document.getElementById('editRoom_priceWeekday');
  const holidayInput = document.getElementById('editRoom_priceHoliday');
  const summerInput = document.getElementById('editRoom_priceSummer');
  const consecutiveInput = document.getElementById('editRoom_priceConsecutive');
  const descInput = document.getElementById('editRoom_description');
  const amenitiesInput = document.getElementById('editRoom_amenities');
  const imgInput = document.getElementById('editRoom_image');
  const previewImg = document.getElementById('editRoom_preview');

  // Reset file input
  document.getElementById('editRoom_file').value = '';

  if (roomId) {
    // Edit existing room
    const room = cmsRooms.find(r => r.id === roomId);
    if (!room) return;

    titleEl.textContent = '編輯特色房型';
    isNewEl.value = 'false';
    idInput.value = room.id;
    idInput.disabled = true; // Cannot edit unique ID once created

    nameInput.value = room.name;
    weekdayInput.value = room.priceWeekday;
    holidayInput.value = room.priceHoliday;
    summerInput.value = room.priceSummer;
    consecutiveInput.value = room.priceConsecutive;
    descInput.value = room.description;
    amenitiesInput.value = room.amenities.join(', ');
    
    currentEditingRoomImages = [...(room.images || [])]; renderRoomImagesGrid();
    imgInput.value = imageUrl;
    
    if (imageUrl) {
      previewImg.src = getImgSrc(imageUrl); // Path correction for preview
      previewImg.style.display = 'block';
    } else {
      previewImg.style.display = 'none';
    }
  } else {
    // Add new room
    titleEl.textContent = '新增特色房型';
    isNewEl.value = 'true';
    idInput.value = '';
    idInput.disabled = false;

    nameInput.value = '';
    weekdayInput.value = '2000';
    holidayInput.value = '2800';
    summerInput.value = '2800';
    consecutiveInput.value = '3200';
    descInput.value = '';
    amenitiesInput.value = '液晶電視, 冷氣, 獨立陽台';
    currentEditingRoomImages = []; renderRoomImagesGrid();
  }

  formBox.style.display = 'block';
  formBox.scrollIntoView({ behavior: 'smooth' });
}

function closeRoomEditor() {
  document.getElementById('roomEditorFormBox').style.display = 'none';
}

// Upload file to server via Ajax
async function uploadCmsImage(type) {
  let fileInput = null;
  if (type === 'room') fileInput = document.getElementById('editRoom_file');
  else if (type === 'carousel') fileInput = document.getElementById('carousel_file');
  else if (type === 'gallery') fileInput = document.getElementById('gallery_file');

  if (!fileInput || fileInput.files.length === 0) {
    alert('請先選擇一個相片檔案。');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    });
    
    const result = await res.json();
    if (result.success) {
      const url = result.imageUrl;
      if (type === 'room') {
        const urls = result.imageUrls || [result.imageUrl];
        urls.forEach(u => currentEditingRoomImages.push(u));
        renderRoomImagesGrid();
        fileInput.value = '';
        alert(`成功上傳 ${urls.length} 張相片！`);
      } else if (type === 'carousel') {
        const cBox = document.getElementById('carousel_preview_box');
        if (cBox) cBox.style.display = 'none';
        await addCarouselImage(url);
      } else if (type === 'gallery') {
        const gBox = document.getElementById('gallery_preview_box');
        if (gBox) gBox.style.display = 'none';
        await addGalleryItem(url);
      }
    } else {
      alert(`上傳失敗: ${result.message}`);
    }
  } catch (err) {
    console.error('Error uploading image:', err);
    alert('圖片上傳錯誤，請確認伺服器連線正常。');
  }
}

// Save room config
async function saveRoomConfig() {
  const isNew = document.getElementById('editRoom_isNew').value === 'true';
  const id = document.getElementById('editRoom_id').value.trim();
  const name = document.getElementById('editRoom_name').value.trim();
  const priceWeekday = parseInt(document.getElementById('editRoom_priceWeekday').value);
  const priceHoliday = parseInt(document.getElementById('editRoom_priceHoliday').value);
  const priceSummer = parseInt(document.getElementById('editRoom_priceSummer').value);
  const priceConsecutive = parseInt(document.getElementById('editRoom_priceConsecutive').value);
  const description = document.getElementById('editRoom_description').value.trim();
  const amenitiesStr = document.getElementById('editRoom_amenities').value;
  if (!id || !name || isNaN(priceWeekday) || isNaN(priceHoliday) || isNaN(priceSummer) || isNaN(priceConsecutive) || !description) {
    alert('所有有 * 號的欄位均為必填項目，且房價必須為有效數字！');
    return;
  }

  if (currentEditingRoomImages.length === 0) {
    alert('請至少為客房上傳一張照片！');
    return;
  }

  const amenities = amenitiesStr.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);

  const roomData = {
    id, name, priceWeekday, priceHoliday, priceSummer, priceConsecutive, description,
    amenities, images: currentEditingRoomImages
  };

  if (isNew) {
    // Check if ID duplicates
    if (cmsRooms.some(r => r.id === id)) {
      alert('房型代碼已存在，請使用不同的代碼。');
      return;
    }
    cmsRooms.push(roomData);
  } else {
    const idx = cmsRooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      cmsRooms[idx] = roomData;
    }
  }

  try {
    const res = await fetch('/api/admin/config/rooms', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rooms: cmsRooms })
    });
    const result = await res.json();
    if (result.success) {
      alert('房型配置儲存成功！');
      closeRoomEditor();
      loadCmsData();
    } else {
      alert(`儲存失敗: ${result.message}`);
    }
  } catch (err) {
    console.error('Error saving rooms:', err);
    alert('伺服器連線錯誤。');
  }
}

// Delete room
async function deleteRoomConfig(roomId) {
  if (!confirm(`確定要刪除房型 ${roomId} 嗎？刪除後前台估價與首頁列表將不再呈現此房型。`)) return;

  const filtered = cmsRooms.filter(r => r.id !== roomId);
  try {
    const res = await fetch('/api/admin/config/rooms', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rooms: filtered })
    });
    const result = await res.json();
    if (result.success) {
      alert('房型刪除成功。');
      loadCmsData();
    }
  } catch (err) {
    console.error('Error deleting room config:', err);
  }
}

// B. Carousel Management
function renderCmsCarousel() {
  const grid = document.getElementById('cmsCarouselGrid');
  grid.innerHTML = '';

  if (cmsCarousel.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-light); padding: 20px;">目前尚無首頁輪播圖，首頁將呈現空白。</div>';
    return;
  }

  cmsCarousel.forEach((slide, index) => {
    const div = document.createElement('div');
    div.className = 'room-card';
    div.style.padding = '0';
    div.innerHTML = `
      <div style="position:relative; width:100%; height:130px; overflow:hidden;">
        <img src="${getImgSrc(slide.image)}" style="width:100%; height:100%; object-fit:cover;">
        <button onclick="deleteCarouselConfig(${index})" style="position:absolute; top:8px; right:8px; background-color:#dc2626; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;" title="刪除此圖"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="padding:12px;">
        <h5 style="margin:0; font-size:14px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${slide.title || '無標題'}</h5>
      </div>
    `;
    grid.appendChild(div);
  });
}

async function addCarouselImage(url) {
  const title = prompt('請輸入此張圖片的輪播標題 (選填，例如: bazar花園)：') || '';
  const desc = prompt('請輸入此張圖片的輪播副標題 (選填，例如: 小琉球特色民宿)：') || '';
  
  const newItem = {
    id: 'c-' + Date.now(),
    image: url,
    title,
    desc
  };

  cmsCarousel.push(newItem);

  try {
    const res = await fetch('/api/admin/config/carousel', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ carousel: cmsCarousel })
    });
    const result = await res.json();
    if (result.success) {
      alert('首頁輪播圖上傳且新增成功！');
      document.getElementById('carousel_file').value = '';
      loadCmsData();
    }
  } catch (err) {
    console.error('Error adding carousel slide:', err);
  }
}

async function deleteCarouselConfig(index) {
  if (!confirm('確定要刪除這張輪播大圖嗎？')) return;

  cmsCarousel.splice(index, 1);

  try {
    const res = await fetch('/api/admin/config/carousel', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ carousel: cmsCarousel })
    });
    const result = await res.json();
    if (result.success) {
      loadCmsData();
    }
  } catch (err) {
    console.error('Error deleting carousel slide:', err);
  }
}

// C. Gallery Management
function renderCmsGallery() {
  const grid = document.getElementById('cmsGalleryGrid');
  grid.innerHTML = '';

  if (cmsGallery.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-light); padding: 20px;">目前圖庫尚無照片。</div>';
    return;
  }

  cmsGallery.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'room-card';
    div.style.padding = '0';
    div.innerHTML = `
      <div style="position:relative; width:100%; height:130px; overflow:hidden;">
        <img src="${getImgSrc(item.image)}" style="width:100%; height:100%; object-fit:cover;">
        <button onclick="deleteGalleryConfig(${index})" class="btn-delete-gal" style="position:absolute; top:8px; right:8px; background-color:#dc2626; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;" title="刪除此圖"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="padding:12px;">
        <h5 style="margin:0 0 4px 0; font-size:14px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.title}</h5>
        <p style="margin:0; font-size:12px; color:var(--text-light); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.desc}</p>
      </div>
    `;
    
    // Fix delete index interpolation
    div.querySelector('.btn-delete-gal').onclick = () => deleteGalleryConfig(index);
    grid.appendChild(div);
  });
}

async function addGalleryItem(url) {
  const title = document.getElementById('gallery_title').value.trim();
  const desc = document.getElementById('gallery_desc').value.trim();

  if (!title || !desc) {
    alert('請填寫相片標題與相片描述！');
    return;
  }

  const newItem = {
    id: 'g-' + Date.now(),
    image: url,
    title,
    desc
  };

  cmsGallery.push(newItem);

  try {
    const res = await fetch('/api/admin/config/gallery', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gallery: cmsGallery })
    });
    const result = await res.json();
    if (result.success) {
      alert('圖庫照片新增成功！');
      document.getElementById('gallery_title').value = '';
      document.getElementById('gallery_desc').value = '';
      document.getElementById('gallery_file').value = '';
      loadCmsData();
    }
  } catch (err) {
    console.error('Error adding gallery item:', err);
  }
}

async function deleteGalleryConfig(index) {
  if (!confirm('確定要從圖庫中移除這張照片嗎？')) return;

  cmsGallery.splice(index, 1);

  try {
    const res = await fetch('/api/admin/config/gallery', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gallery: cmsGallery })
    });
    const result = await res.json();
    if (result.success) {
      loadCmsData();
    }
  } catch (err) {
    console.error('Error deleting gallery item:', err);
  }
}

// D. Rules Management
function renderCmsRules() {
  document.getElementById('editRules_checkInTime').value = cmsRules.checkInTime || '15:00';
  document.getElementById('editRules_checkOutTime').value = cmsRules.checkOutTime || '11:00';
  
  const reminders = cmsRules.reminders || [];
  document.getElementById('editRules_reminders').value = reminders.join('\n');
  document.getElementById('editRules_payment').value = cmsRules.payment || '';
}

async function saveRulesConfig() {
  const checkInTime = document.getElementById('editRules_checkInTime').value.trim();
  const checkOutTime = document.getElementById('editRules_checkOutTime').value.trim();
  const remindersText = document.getElementById('editRules_reminders').value;
  const payment = document.getElementById('editRules_payment').value.trim();
  const rulesConfigMsg = document.getElementById('rulesConfigMsg');

  // Split reminders text by line break
  const reminders = remindersText.split('\n').map(r => r.trim()).filter(r => r.length > 0);

  const updatedRules = {
    checkInTime,
    checkOutTime,
    reminders,
    payment
  };

  try {
    const res = await fetch('/api/admin/config/rules', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rules: updatedRules })
    });
    const result = await res.json();
    if (result.success) {
      rulesConfigMsg.textContent = '住宿守則與匯款設定儲存成功！';
      rulesConfigMsg.style.color = '#10b981';
      setTimeout(() => { rulesConfigMsg.textContent = ''; }, 3000);
      loadCmsData();
    } else {
      rulesConfigMsg.textContent = `儲存失敗: ${result.message}`;
      rulesConfigMsg.style.color = '#dc2626';
    }
  } catch (err) {
    console.error('Error saving rules config:', err);
    rulesConfigMsg.textContent = '伺服器連線錯誤。';
    rulesConfigMsg.style.color = '#dc2626';
  }
}

// ==========================================
// Live Photo Upload Instant Previews
// ==========================================
function setupImagePreviewListeners() {
  const roomFile = document.getElementById('editRoom_file');
  if (roomFile) {
    roomFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const previewImg = document.getElementById('editRoom_preview');
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = 'inline-block';
      }
    });
  }

  const carouselFile = document.getElementById('carousel_file');
  if (carouselFile) {
    carouselFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const box = document.getElementById('carousel_preview_box');
      const img = document.getElementById('carousel_preview');
      if (file && box && img) {
        img.src = URL.createObjectURL(file);
        box.style.display = 'block';
      }
    });
  }

  const galleryFile = document.getElementById('gallery_file');
  if (galleryFile) {
    galleryFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const box = document.getElementById('gallery_preview_box');
      const img = document.getElementById('gallery_preview');
      if (file && box && img) {
        img.src = URL.createObjectURL(file);
        box.style.display = 'block';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', setupImagePreviewListeners);
if (document.readyState !== 'loading') {
  setupImagePreviewListeners();
}
