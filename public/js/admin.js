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
  document.getElementById('tab_settings').style.display = tabName === 'settings' ? 'block' : 'none';

  if (tabName === 'stats') {
    renderStatsCharts();
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
