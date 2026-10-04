const API_BASE_URL = 'http://localhost:8000/api/v1';

// Global State
let state = {
  theme: localStorage.getItem('roomie_theme') || 'light',
  token: localStorage.getItem('roomie_token') || null,
  user: JSON.parse(localStorage.getItem('roomie_user') || 'null'),
  rooms: [],
  equipments: [],
  myBookings: [],
  selectedRoom: null,
  appliedPromo: null,
  selectedEquipments: {} // { eqId: qty }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuth();
  fetchRooms();
  fetchEquipments();
  setDefaultDates();
  initActiveTab();

  // Polling for Auto-Release Check & Data Sync every 30s
  setInterval(() => {
    fetchRooms();
  }, 30000);
});

function initActiveTab() {
  const hash = window.location.hash.replace('#', '');
  const savedTab = localStorage.getItem('roomie_active_tab');
  const targetTab = hash || savedTab || 'rooms';
  switchNavTab(targetTab);
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchNavTab(hash);
  }
});

// --- Theme Management ---
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('roomie_theme', state.theme);
  initTheme();
}

// --- Auth Management ---
function checkAuth() {
  const authButtons = document.getElementById('auth-buttons');
  const userBadge = document.getElementById('user-badge');
  const userNameDisplay = document.getElementById('user-name-display');
  const notifBtn = document.getElementById('notif-btn');
  const navAdmin = document.getElementById('nav-admin');

  if (state.token && state.user) {
    authButtons.style.display = 'none';
    userBadge.style.display = 'flex';
    userNameDisplay.innerText = `${state.user.full_name} (${state.user.role.toUpperCase()})`;
    notifBtn.style.display = 'flex';

    if (state.user.role === 'admin' || state.user.role === 'room_manager') {
      navAdmin.style.display = 'flex';
    } else {
      navAdmin.style.display = 'none';
    }
  } else {
    authButtons.style.display = 'flex';
    userBadge.style.display = 'none';
    notifBtn.style.display = 'none';
    navAdmin.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');

    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem('roomie_token', state.token);
    localStorage.setItem('roomie_user', JSON.stringify(state.user));

    closeModal('login-modal');
    checkAuth();
    Swal.fire({
      icon: 'success',
      title: 'เข้าสู่ระบบสำเร็จ',
      text: `ยินดีต้อนรับคุณ ${state.user.full_name}!`,
      timer: 2000,
      showConfirmButton: false
    });
    fetchRooms();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เข้าสู่ระบบไม่สำเร็จ',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, phone, password, role: 'member' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');

    closeModal('register-modal');
    Swal.fire({
      icon: 'success',
      title: 'สมัครสมาชิกสำเร็จ!',
      text: 'กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ',
      confirmButtonColor: '#6366F1'
    }).then(() => {
      openModal('login-modal');
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'สมัครสมาชิกไม่สำเร็จ',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('roomie_token');
  localStorage.removeItem('roomie_user');
  checkAuth();
  switchNavTab('rooms');
  Swal.fire({
    icon: 'info',
    title: 'ออกจากระบบเรียบร้อยแล้ว',
    timer: 1800,
    showConfirmButton: false
  });
}

// --- Navigation Tabs ---
function switchNavTab(tabName) {
  const validTabs = ['rooms', 'timeline', 'my-bookings', 'admin'];
  if (!validTabs.includes(tabName)) tabName = 'rooms';

  // Guard admin tab access
  if (tabName === 'admin') {
    if (!state.user || (state.user.role !== 'admin' && state.user.role !== 'room_manager')) {
      tabName = 'rooms';
    }
  }

  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('main > section').forEach(el => el.style.display = 'none');

  if (tabName === 'rooms') {
    document.getElementById('nav-rooms').classList.add('active');
    document.getElementById('view-rooms').style.display = 'block';
  } else if (tabName === 'timeline') {
    document.getElementById('nav-timeline').classList.add('active');
    document.getElementById('view-timeline').style.display = 'block';
    renderTimelineGrid();
  } else if (tabName === 'my-bookings') {
    document.getElementById('nav-my-bookings').classList.add('active');
    document.getElementById('view-my-bookings').style.display = 'block';
    fetchMyBookings();
  } else if (tabName === 'admin') {
    document.getElementById('nav-admin').classList.add('active');
    document.getElementById('view-admin').style.display = 'block';
    loadAdminDashboard();
  }

  if (window.location.hash.replace('#', '') !== tabName) {
    history.replaceState(null, '', '#' + tabName);
  }
  localStorage.setItem('roomie_active_tab', tabName);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setDefaultDates() {
  const todayObj = new Date();
  const todayStr = getLocalDateString(todayObj);

  const maxObj = new Date();
  maxObj.setDate(todayObj.getDate() + 15);
  const maxStr = getLocalDateString(maxObj);

  const filterDateInput = document.getElementById('filter-date');
  if (filterDateInput) {
    filterDateInput.value = todayStr;
  }

  const timelineDateInput = document.getElementById('timeline-date-picker');
  if (timelineDateInput) {
    timelineDateInput.value = todayStr;
    timelineDateInput.min = todayStr;
    timelineDateInput.max = maxStr;
  }

  const bookingDateInput = document.getElementById('booking-date');
  if (bookingDateInput) {
    bookingDateInput.value = todayStr;
    bookingDateInput.min = todayStr; // Lock past dates
    bookingDateInput.max = maxStr;   // Lock dates beyond 15 days
  }
}

// --- Fetch API Data ---
async function fetchRooms() {
  try {
    const res = await fetch(`${API_BASE_URL}/rooms`);
    state.rooms = await res.json();
    renderRooms(state.rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
  }
}

async function fetchEquipments() {
  try {
    const res = await fetch(`${API_BASE_URL}/equipments`);
    state.equipments = await res.json();
    renderEquipmentSelectList();
  } catch (err) {
    console.error("Error fetching equipments:", err);
  }
}

// --- Render Rooms ---
function renderRooms(rooms) {
  const container = document.getElementById('room-grid-container');
  document.getElementById('room-count').innerText = rooms.length;

  if (rooms.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">ไม่พบห้องประชุมที่ตรงกับเงื่อนไข</div>`;
    return;
  }

  container.innerHTML = rooms.map(room => `
    <div class="room-card">
      <div class="room-image-wrapper">
        <img src="${room.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80'}" class="room-image" alt="${room.name}">
        <span class="room-badge ${room.requires_approval ? 'badge-approval' : 'badge-auto'}">
          ${room.requires_approval ? '<i class="fa-solid fa-clock"></i> ต้องรออนุมัติ' : '<i class="fa-solid fa-bolt"></i> อนุมัติทันที'}
        </span>
      </div>
      <div class="room-content">
        <h3 class="room-title">${room.name}</h3>
        <div class="room-location"><i class="fa-solid fa-location-dot"></i> ${room.location}</div>
        
        <div class="room-meta">
          <span><i class="fa-solid fa-users"></i> ${room.capacity} คน</span>
          <span><i class="fa-solid fa-shield-halved"></i> ${room.status.toUpperCase()}</span>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; flex-grow: 1;">
          ${room.description || 'ห้องประชุมมาตรฐานอุปกรณ์ครบครัน'}
        </p>

        <div class="room-price-box">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">ราคาเริ่ม/ชม.</div>
            <div class="price-member">฿${parseFloat(room.member_price).toLocaleString()} <span style="font-size: 0.7rem; color: var(--accent-primary);">(สมาชิก)</span></div>
          </div>
          <div style="text-align: right;">
            <div class="price-standard">฿${parseFloat(room.standard_price).toLocaleString()}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">บุคคลทั่วไป</div>
          </div>
        </div>

        <button class="btn btn-primary" onclick="openBookingModal(${room.id})">
          <i class="fa-solid fa-calendar-plus"></i> จองห้องประชุมนี้
        </button>
      </div>
    </div>
  `).join('');
}

// Filter Rooms
function applyFilters() {
  const search = document.getElementById('filter-search').value.toLowerCase();
  const capacity = parseInt(document.getElementById('filter-capacity').value) || 0;

  const filtered = state.rooms.filter(room => {
    const matchSearch = room.name.toLowerCase().includes(search) || room.location.toLowerCase().includes(search);
    const matchCapacity = room.capacity >= capacity;
    return matchSearch && matchCapacity;
  });

  renderRooms(filtered);
}

function resetFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-capacity').value = '';
  setDefaultDates();
  renderRooms(state.rooms);
}

// --- Render Interactive FullCalendar Timeline ---
let calendarInstance = null;

async function renderTimelineGrid() {
  const container = document.getElementById('fullcalendar-container');
  if (!container) return;

  try {
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`${API_BASE_URL}/bookings/timeline`, { headers });
    
    if (!res.ok) {
      console.error("Failed to fetch timeline bookings. Status:", res.status);
      return;
    }
    
    const allBookings = await res.json();
    if (!Array.isArray(allBookings)) {
      console.error("Bookings payload is not an array:", allBookings);
      return;
    }

    const isPrivileged = state.user && (state.user.role === 'admin' || state.user.role === 'room_manager');

    const events = allBookings
      .filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED')
      .map(b => {
        let bgColor = '#10B981'; // Approved
        if (b.status === 'PENDING_APPROVAL') bgColor = '#F59E0B'; // Pending
        if (b.status === 'CHECKED_IN') bgColor = '#3B82F6'; // Checked in
        if (b.status === 'NO_SHOW') bgColor = '#6B7280'; // No show

        const roomName = b.room_name || `ห้อง #${b.room_id}`;
        const isOwner = state.user && state.user.id && (state.user.id === b.user_id);
        const canViewBooker = isPrivileged || isOwner;
        const titleText = canViewBooker
          ? `🏢 ${roomName} (${b.booking_mode === 'MEMBER' ? 'สมาชิก' : (b.guest_name || 'Guest')})`
          : `🏢 ${roomName} (ไม่ว่าง)`;

        return {
          id: String(b.id),
          title: titleText,
          start: b.start_time,
          end: b.end_time,
          backgroundColor: bgColor,
          borderColor: bgColor,
          extendedProps: b
        };
      });

    if (calendarInstance) {
      calendarInstance.destroy();
    }

    setTimeout(() => {
      calendarInstance = new FullCalendar.Calendar(container, {
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listYear'
        },
        buttonText: {
          today: 'วันนี้',
          day: 'รายวัน',
          week: 'รายสัปดาห์',
          month: 'รายเดือน',
          year: 'รายปี'
        },
        events: events,
        eventClick: function(info) {
          const b = info.event.extendedProps;
          const roomName = b.room_name || `ห้อง #${b.room_id}`;
          const startFormatted = formatDateTime(b.start_time);
          const endFormatted = formatTime(b.end_time);

          const isOwner = state.user && state.user.id && (state.user.id === b.user_id);
          const canViewDetails = isPrivileged || isOwner;

          let contentHtml = '';
          if (canViewDetails) {
            const booker = b.booking_mode === 'MEMBER' ? 'สมาชิกที่เข้าสู่ระบบ' : `${b.guest_name} (Guest: ${b.guest_phone || '-'})`;
            const priceFormatted = parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2});

            contentHtml = `
              <div style="text-align: left; font-size: 0.92rem; line-height: 1.6; background: var(--bg-tertiary); padding: 1.25rem; border-radius: 8px;">
                <p style="margin-bottom:0.4rem;">🏢 <strong>ห้องประชุม:</strong> ${roomName} (${b.room_location || ''})</p>
                <p style="margin-bottom:0.4rem;">👤 <strong>ผู้จอง:</strong> ${booker}</p>
                <p style="margin-bottom:0.4rem;">📌 <strong>หัวข้อ:</strong> ${b.subject || '-'}</p>
                <p style="margin-bottom:0.4rem;">📝 <strong>วัตถุประสงค์:</strong> ${b.purpose || '-'}</p>
                <p style="margin-bottom:0.4rem;">🕒 <strong>วันเวลา:</strong> ${startFormatted} - ${endFormatted}</p>
                <p style="margin-bottom:0.4rem;">💰 <strong>ยอดชำระสุทธิ:</strong> <strong style="color: #6366F1;">฿${priceFormatted}</strong></p>
                <p style="margin-bottom:0.4rem;">🏷️ <strong>สถานะการจอง:</strong> <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></p>
                <p style="margin-bottom:0.4rem;">💳 <strong>สถานะชำระเงิน:</strong> <span class="badge badge-${b.payment_status.toLowerCase()}">${b.payment_status}</span></p>
              </div>
            `;
          } else {
            contentHtml = `
              <div style="text-align: left; font-size: 0.92rem; line-height: 1.6; background: var(--bg-tertiary); padding: 1.25rem; border-radius: 8px;">
                <p style="margin-bottom:0.4rem;">🏢 <strong>ห้องประชุม:</strong> ${roomName} (${b.room_location || ''})</p>
                <p style="margin-bottom:0.4rem;">📌 <strong>หัวข้อการประชุม:</strong> ${b.subject || '-'}</p>
                <p style="margin-bottom:0.4rem;">🕒 <strong>วันเวลาที่ใช้งาน:</strong> ${startFormatted} - ${endFormatted}</p>
                <p style="margin-bottom:0.4rem;">🏷️ <strong>สถานะการจอง:</strong> <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></p>
              </div>
            `;
          }

          Swal.fire({
            title: `📌 รายละเอียดการจอง: ${b.booking_code}`,
            html: contentHtml,
            confirmButtonText: 'ปิดหน้าต่าง',
            confirmButtonColor: '#6366F1'
          });
        }
      });

      calendarInstance.render();
      calendarInstance.updateSize();
    }, 50);
  } catch (err) {
    console.error("Calendar render error:", err);
  }
}

function quickBookTimeline(roomId, date, time) {
  openBookingModal(roomId);
  document.getElementById('booking-date').value = date;
  document.getElementById('booking-start').value = time;
  
  // Default end time + 1 hour
  const startHour = parseInt(time.split(':')[0]);
  const endHour = String(startHour + 1).padStart(2, '0');
  document.getElementById('booking-end').value = `${endHour}:00`;
  calculateBookingPrice();
}

// --- Render Equipment Add-on Cards (Redesigned Stepper UI) ---
function renderEquipmentSelectList() {
  const container = document.getElementById('equipment-select-list');
  if (state.equipments.length === 0) {
    container.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted);">ไม่มีอุปกรณ์เสริม</div>`;
    return;
  }

  container.innerHTML = state.equipments.map(eq => {
    const qty = state.selectedEquipments[eq.id] || 0;
    const isActive = qty > 0 ? 'active' : '';

    return `
      <div class="equipment-addon-card ${isActive}" id="eq-card-${eq.id}">
        <div class="equipment-info">
          <div class="equipment-icon">
            <i class="fa-solid ${getEquipmentIcon(eq.name)}"></i>
          </div>
          <div>
            <div class="equipment-title">${eq.name}</div>
            <div class="equipment-prices">
              <span class="price-tag-member">สมาชิก: ฿${parseFloat(eq.member_price).toLocaleString()}</span>
              <span>•</span>
              <span class="price-tag-standard">ปกติ: ฿${parseFloat(eq.standard_price).toLocaleString()}</span>
              <span>•</span>
              <span style="color: var(--text-muted);">เหลือ ${eq.available_quantity} ชิ้น</span>
            </div>
          </div>
        </div>
        <div class="stepper-control">
          <button type="button" class="stepper-btn" onclick="changeEquipmentQty(${eq.id}, -1)" ${qty <= 0 ? 'disabled' : ''}>-</button>
          <span class="stepper-val" id="eq-qty-val-${eq.id}">${qty}</span>
          <button type="button" class="stepper-btn" onclick="changeEquipmentQty(${eq.id}, 1)" ${qty >= eq.available_quantity ? 'disabled' : ''}>+</button>
        </div>
      </div>
    `;
  }).join('');
}

function getEquipmentIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('mic') || n.includes('ไมค์')) return 'fa-microphone';
  if (n.includes('projector') || n.includes('โปรเจคเตอร์')) return 'fa-video';
  if (n.includes('whiteboard') || n.includes('กระดาน')) return 'fa-chalkboard';
  if (n.includes('clicker') || n.includes('presenter')) return 'fa-hand-pointer';
  if (n.includes('speaker') || n.includes('ลำโพง')) return 'fa-volume-high';
  if (n.includes('camera') || n.includes('visualizer') || n.includes('กล้อง')) return 'fa-camera';
  if (n.includes('conference')) return 'fa-headset';
  return 'fa-plug';
}

function changeEquipmentQty(eqId, delta) {
  const eq = state.equipments.find(e => e.id === eqId);
  if (!eq) return;

  let currentQty = state.selectedEquipments[eqId] || 0;
  let newQty = currentQty + delta;

  if (newQty < 0) newQty = 0;
  if (newQty > eq.available_quantity) newQty = eq.available_quantity;

  state.selectedEquipments[eqId] = newQty;
  renderEquipmentSelectList();
  calculateBookingPrice();
}

// --- Reset Booking Form Fields completely ---
function resetBookingForm() {
  document.getElementById('booking-form').reset();
  document.getElementById('guest-name').value = '';
  document.getElementById('guest-email').value = '';
  document.getElementById('guest-phone').value = '';
  document.getElementById('booking-subject').value = '';
  document.getElementById('booking-purpose').value = '';
  document.getElementById('booking-promo-code').value = '';
  
  const msgEl = document.getElementById('promo-msg');
  if (msgEl) msgEl.innerText = '';

  state.appliedPromo = null;
  state.selectedEquipments = {}; // Clear all equipment selections
  
  setDefaultDates();
  renderEquipmentSelectList();
}

// --- Booking Modal & Price Calculator ---
function openBookingModal(roomId) {
  state.selectedRoom = state.rooms.find(r => r.id === roomId);
  if (!state.selectedRoom) return;

  // 1. Reset all fields completely
  resetBookingForm();

  document.getElementById('booking-room-id').value = state.selectedRoom.id;
  document.getElementById('modal-room-title').innerText = `จองห้อง: ${state.selectedRoom.name}`;
  
  // Set default mode based on login state
  const modeSelect = document.getElementById('booking-mode-select');
  if (state.token && state.user) {
    modeSelect.value = 'MEMBER';
  } else {
    modeSelect.value = 'GUEST';
  }
  toggleBookingModeForm();
  calculateBookingPrice();
  openModal('booking-modal');
}

function toggleBookingModeForm() {
  const mode = document.getElementById('booking-mode-select').value;
  const guestFields = document.getElementById('guest-fields');
  if (mode === 'GUEST') {
    guestFields.style.display = 'block';
  } else {
    guestFields.style.display = 'none';
  }
  calculateBookingPrice();
}

function calculateBookingPrice() {
  if (!state.selectedRoom) return;

  const mode = document.getElementById('booking-mode-select').value;
  const isMember = (mode === 'MEMBER');

  const startTimeStr = document.getElementById('booking-start').value;
  const endTimeStr = document.getElementById('booking-end').value;

  let hours = 1;
  if (startTimeStr && endTimeStr) {
    const sDate = new Date(`1970-01-01T${startTimeStr}:00Z`);
    const eDate = new Date(`1970-01-01T${endTimeStr}:00Z`);
    const diffSecs = (eDate - sDate) / 1000;
    if (diffSecs > 0) hours = diffSecs / 3600;
  }

  // Room Price
  const roomRate = isMember ? parseFloat(state.selectedRoom.member_price) : parseFloat(state.selectedRoom.standard_price);
  const roomPriceTotal = roomRate * hours;

  // Equipment Price
  let equipPriceTotal = 0;
  Object.keys(state.selectedEquipments).forEach(eqIdStr => {
    const eqId = parseInt(eqIdStr);
    const qty = state.selectedEquipments[eqId];
    const eq = state.equipments.find(e => e.id === eqId);
    if (eq && qty > 0) {
      const eqRate = isMember ? parseFloat(eq.member_price) : parseFloat(eq.standard_price);
      equipPriceTotal += eqRate * qty;
    }
  });

  // Discount
  let discountAmount = 0;
  if (state.appliedPromo) {
    const subtotal = roomPriceTotal + equipPriceTotal;
    if (state.appliedPromo.discount_percent) {
      discountAmount = (subtotal * parseFloat(state.appliedPromo.discount_percent)) / 100.0;
    } else if (state.appliedPromo.discount_amount) {
      discountAmount = parseFloat(state.appliedPromo.discount_amount);
    }
  }

  const totalPrice = Math.max(0, (roomPriceTotal + equipPriceTotal) - discountAmount);

  document.getElementById('price-summary-room').innerText = `฿${roomPriceTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('price-summary-equip').innerText = `฿${equipPriceTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('price-summary-discount').innerText = `-฿${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('price-summary-total').innerText = `฿${totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

async function applyPromoCode() {
  const code = document.getElementById('booking-promo-code').value.trim();
  const msgEl = document.getElementById('promo-msg');
  if (!code) return;

  try {
    const res = await fetch(`${API_BASE_URL}/promotions/validate/${code}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'รหัสส่วนลดไม่ถูกต้อง');

    state.appliedPromo = data;
    msgEl.style.color = 'var(--success)';
    msgEl.innerText = `ใช้รหัสสำเร็จ! ส่วนลด ${data.discount_percent}%`;
    calculateBookingPrice();
  } catch (err) {
    state.appliedPromo = null;
    msgEl.style.color = 'var(--danger)';
    msgEl.innerText = err.message;
    calculateBookingPrice();
  }
}

// Handle Booking Form Submit
async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const mode = document.getElementById('booking-mode-select').value;
  const roomId = parseInt(document.getElementById('booking-room-id').value);
  const subject = document.getElementById('booking-subject').value.trim();
  const purpose = document.getElementById('booking-purpose').value.trim();
  const dateStr = document.getElementById('booking-date').value;
  const startStr = document.getElementById('booking-start').value;
  const endStr = document.getElementById('booking-end').value;

  if (!dateStr || !startStr || !endStr) {
    Swal.fire({
      icon: 'warning',
      title: 'กรอกข้อมูลไม่ครบถ้วน',
      text: 'กรุณาเลือกวันที่และเวลาเข้าใช้งานห้องประชุม',
      confirmButtonColor: '#6366F1'
    });
    return;
  }

  // Validate 15-day limit on submit
  const selDate = new Date(`${dateStr}T00:00:00`);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const maxAllowedDate = new Date(todayDate);
  maxAllowedDate.setDate(todayDate.getDate() + 15);

  if (selDate < todayDate || selDate > maxAllowedDate) {
    Swal.fire({
      icon: 'warning',
      title: 'วันที่ไม่อยู่ในเงื่อนไขการจอง',
      text: 'สามารถจองล่วงหน้าได้ตั้งแต่วันนี้ จนถึงไม่เกิน 15 วันเท่านั้น',
      confirmButtonColor: '#6366F1'
    });
    return;
  }

  const start_time = `${dateStr}T${startStr}:00`;
  const end_time = `${dateStr}T${endStr}:00`;

  // Gather equipment selections
  const equipments = [];
  Object.keys(state.selectedEquipments).forEach(eqIdStr => {
    const eqId = parseInt(eqIdStr);
    const qty = state.selectedEquipments[eqId];
    if (qty > 0) {
      equipments.push({
        equipment_id: eqId,
        quantity: qty
      });
    }
  });

  const payload = {
    booking_mode: mode,
    room_id: roomId,
    subject: subject,
    purpose: purpose,
    start_time: start_time,
    end_time: end_time,
    promo_code: state.appliedPromo ? state.appliedPromo.code : null,
    equipments: equipments
  };

  if (mode === 'GUEST') {
    const guest_name = document.getElementById('guest-name').value.trim();
    const guest_email = document.getElementById('guest-email').value.trim();
    const guest_phone = document.getElementById('guest-phone').value.trim();

    if (!guest_name || !guest_email || !guest_phone) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลผู้ติดต่อ',
        text: 'สำหรับบุคคลทั่วไป กรุณากรอก ชื่อ-นามสกุล, อีเมล และเบอร์โทรศัพท์ให้ครบถ้วน',
        confirmButtonColor: '#6366F1'
      });
      return;
    }

    payload.guest_name = guest_name;
    payload.guest_email = guest_email;
    payload.guest_phone = guest_phone;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Booking failed');

    closeModal('booking-modal');
    resetBookingForm();

    Swal.fire({
      icon: 'success',
      title: '🎉 จองห้องประชุมสำเร็จ!',
      html: `
        <div style="font-size: 1rem; margin-top: 0.5rem; text-align: center;">
          <p>รหัสการจองของคุณคือ: <strong style="color: #6366F1; font-size: 1.4rem;">${data.booking_code}</strong></p>
          <p style="font-size: 0.88rem; color: #6B7280; margin-top: 0.5rem;">กรุณาสแกน PromptPay QR Code เพื่อแนบ Slip ชำระเงินในขั้นตอนถัดไป</p>
        </div>
      `,
      confirmButtonText: 'แนบ Slip ชำระเงิน',
      confirmButtonColor: '#6366F1'
    }).then(() => {
      document.getElementById('success-booking-code').innerText = data.booking_code;
      document.getElementById('slip-booking-id').value = data.id;
      openModal('success-modal');
      fetchRooms();
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาดในการจอง',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

// Handle Slip File Upload Submit (Success Modal)
async function handleSlipSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('slip-booking-id').value;
  const fileInput = document.getElementById('slip-file-input');

  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณาเลือกไฟล์',
      text: 'กรุณาแนบไฟล์รูปภาพ Slip โอนเงิน หรือไฟล์เอกสาร (PNG, JPG, PDF)',
      confirmButtonColor: '#6366F1'
    });
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/upload-slip-file`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'อัปโหลดสลิปไม่สำเร็จ');

    closeModal('success-modal');
    Swal.fire({
      icon: 'success',
      title: 'ส่งไฟล์สลิปชำระเงินเรียบร้อยแล้ว! 📄',
      text: 'สถานะเปลี่ยนเป็น รอเจ้าหน้าที่ตรวจสอบสลิป (PENDING_VERIFICATION)',
      confirmButtonColor: '#6366F1'
    });
    switchNavTab('my-bookings');
    document.getElementById('lookup-code-input').value = data.booking_code;
    lookupBookingByCode();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'อัปโหลด Slip ไม่สำเร็จ',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

function openStandaloneSlipModal(bookingId, bookingCode, totalPrice) {
  document.getElementById('standalone-slip-booking-id').value = bookingId;
  document.getElementById('standalone-booking-code').innerText = bookingCode;
  document.getElementById('standalone-total-price').innerText = `฿${parseFloat(totalPrice).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('standalone-slip-file-input').value = '';
  openModal('upload-slip-modal');
}

async function handleStandaloneSlipSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('standalone-slip-booking-id').value;
  const fileInput = document.getElementById('standalone-slip-file-input');

  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณาเลือกไฟล์',
      text: 'กรุณาเลือกไฟล์สลิปโอนเงินก่อนทำการส่ง',
      confirmButtonColor: '#6366F1'
    });
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/upload-slip-file`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'อัปโหลดไฟล์ไม่สำเร็จ');

    closeModal('upload-slip-modal');
    Swal.fire({
      icon: 'success',
      title: 'ส่งไฟล์สลิปชำระเงินเรียบร้อยแล้ว! 📄',
      text: 'สถานะการชำระเงินเปลี่ยนเป็น รอเจ้าหน้าที่ตรวจสอบสลิป (PENDING_VERIFICATION)',
      confirmButtonColor: '#6366F1'
    });
    if (state.token) {
      fetchMyBookings();
    } else {
      lookupBookingByCode();
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'อัปโหลดสลิปไม่สำเร็จ',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

// --- My Bookings & Lookup ---
async function fetchMyBookings() {
  const container = document.getElementById('my-bookings-list');
  if (!state.token) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">กรุณาล็อกอินเพื่อดูประวัติการจองทั้งหมดของคุณ หรือใช้ช่องค้นหา Booking Code ด้านบน</div>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/my`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const bookings = await res.json();
    renderBookingsList(bookings, container);
  } catch (err) {
    console.error("My bookings fetch error:", err);
  }
}

async function lookupBookingByCode() {
  const code = document.getElementById('lookup-code-input').value.trim();
  const container = document.getElementById('my-bookings-list');
  if (!code) return;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/code/${code}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'ไม่พบรหัสการจองนี้');

    renderBookingsList([data], container);
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'ไม่พบรหัสการจอง',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

// --- Helper Functions for Badges & Statuses ---
function formatBookingStatusBadge(status) {
  const statusMap = {
    'PENDING_APPROVAL': { label: 'รออนุมัติ', color: '#D97706', bg: '#FEF3C7', icon: 'fa-clock' },
    'APPROVED': { label: 'อนุมัติแล้ว', color: '#059669', bg: '#D1FAE5', icon: 'fa-circle-check' },
    'REJECTED': { label: 'ไม่อนุมัติ', color: '#DC2626', bg: '#FEE2E2', icon: 'fa-circle-xmark' },
    'CANCELLED': { label: 'ยกเลิกแล้ว', color: '#4B5563', bg: '#F3F4F6', icon: 'fa-ban' },
    'CHECKED_IN': { label: 'Check-in แล้ว', color: '#2563EB', bg: '#DBEAFE', icon: 'fa-user-check' },
    'NO_SHOW': { label: 'ไม่เข้าใช้งาน', color: '#6B7280', bg: '#F3F4F6', icon: 'fa-user-slash' }
  };
  const info = statusMap[status] || { label: status, color: '#4B5563', bg: '#F3F4F6', icon: 'fa-tag' };
  return `<span class="badge-pill" style="background:${info.bg}; color:${info.color}; border: 1px solid ${info.color}40;"><i class="fa-solid ${info.icon}"></i> ${info.label}</span>`;
}

function formatPaymentStatusBadge(status) {
  const statusMap = {
    'UNPAID': { label: 'ยังไม่ชำระเงิน', color: '#DC2626', bg: '#FEE2E2', icon: 'fa-circle-dollar-to-slot' },
    'PENDING_VERIFICATION': { label: 'รอตรวจสลิป', color: '#D97706', bg: '#FEF3C7', icon: 'fa-receipt' },
    'PAID': { label: 'ชำระเงินแล้ว', color: '#059669', bg: '#D1FAE5', icon: 'fa-money-bill-wave' },
    'REFUNDED': { label: 'คืนเงินแล้ว', color: '#7C3AED', bg: '#EDE9FE', icon: 'fa-rotate-left' }
  };
  const info = statusMap[status] || { label: status, color: '#4B5563', bg: '#F3F4F6', icon: 'fa-credit-card' };
  return `<span class="badge-pill" style="background:${info.bg}; color:${info.color}; border: 1px solid ${info.color}40;"><i class="fa-solid ${info.icon}"></i> ${info.label}</span>`;
}

function renderBookingsList(bookings, container) {
  if (!bookings || bookings.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">ไม่พบรายการจอง</div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>ห้องประชุม</th>
            <th>ผู้จอง / สิทธิ์</th>
            <th>วันและเวลา</th>
            <th>ยอดรวมสุทธิ</th>
            <th>สถานะการจอง</th>
            <th>การชำระเงิน</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td><strong>${b.booking_code}</strong></td>
              <td>${b.room_name || b.room_id}</td>
              <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name + ' (Guest)'}</td>
              <td>${formatDateTime(b.start_time)} - ${formatTime(b.end_time)}</td>
              <td><strong>฿${parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
              <td>${formatBookingStatusBadge(b.status)}</td>
              <td>${formatPaymentStatusBadge(b.payment_status)}</td>
              <td>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="showBookingDetailsModal(${b.id})">
                    <i class="fa-solid fa-eye"></i> รายละเอียด
                  </button>
                  ${(b.payment_status === 'UNPAID' || b.payment_status === 'REJECTED') ? `
                    <button class="btn btn-primary btn-sm" onclick="openStandaloneSlipModal(${b.id}, '${b.booking_code}', ${b.total_price})">
                      <i class="fa-solid fa-credit-card"></i> แนบสลิป
                    </button>
                  ` : ''}
                  ${b.status === 'APPROVED' ? `
                    <button class="btn btn-success btn-sm" onclick="performCheckin(${b.id})">
                      <i class="fa-solid fa-qrcode"></i> Check-in
                    </button>
                  ` : ''}
                  ${(b.status !== 'CANCELLED' && b.status !== 'REJECTED' && b.status !== 'NO_SHOW') ? `
                    <button class="btn btn-danger btn-sm" onclick="performCancel(${b.id})">
                      <i class="fa-solid fa-ban"></i> ยกเลิก
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// --- Admin Table State & Column Sorting ---
let adminTableState = {
  tab: 'approvals',
  field: null,
  asc: true,
  data: []
};

function sortAdminData(field) {
  if (adminTableState.field === field) {
    adminTableState.asc = !adminTableState.asc;
  } else {
    adminTableState.field = field;
    adminTableState.asc = true;
  }

  const mult = adminTableState.asc ? 1 : -1;
  adminTableState.data.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';
    if (typeof valA === 'number' || !isNaN(valA)) {
      return (Number(valA) - Number(valB)) * mult;
    }
    return String(valA).localeCompare(String(valB), 'th') * mult;
  });

  renderAdminTabContent();
}

function getSortHeader(title, field) {
  let icon = '<i class="fa-solid fa-sort" style="opacity:0.3; margin-left:4px;"></i>';
  if (adminTableState.field === field) {
    icon = adminTableState.asc
      ? '<i class="fa-solid fa-sort-up" style="color:var(--accent-primary); margin-left:4px;"></i>'
      : '<i class="fa-solid fa-sort-down" style="color:var(--accent-primary); margin-left:4px;"></i>';
  }
  return `<th class="sortable" onclick="sortAdminData('${field}')" title="คลิกเพื่อจัดเรียง (0-9, 9-0)">${title} ${icon}</th>`;
}

// --- Admin Dashboard ---
async function loadAdminDashboard() {
  if (!state.token) return;

  try {
    // Load KPI Stats
    const statsRes = await fetch(`${API_BASE_URL}/reports/dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const stats = await statsRes.json();
    document.getElementById('kpi-today-bookings').innerText = stats.bookings_today;
    document.getElementById('kpi-monthly-revenue').innerText = `฿${stats.monthly_revenue.toLocaleString()}`;
    document.getElementById('kpi-pending-approvals').innerText = stats.pending_approvals;
    document.getElementById('kpi-occupancy-rate').innerText = `${stats.occupancy_rate_percent}%`;

    const savedSubTab = localStorage.getItem('roomie_admin_subtab') || 'approvals';
    await switchAdminTab(savedSubTab);
  } catch (err) {
    console.error("Admin dashboard load error:", err);
  }
}

async function switchAdminTab(adminTab) {
  const validTabs = ['approvals', 'payments', 'all-bookings', 'equipments'];
  if (!validTabs.includes(adminTab)) adminTab = 'approvals';

  localStorage.setItem('roomie_admin_subtab', adminTab);
  adminTableState.tab = adminTab;

  document.querySelectorAll('.tab-container .tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`admin-tab-${adminTab}`);
  if (activeBtn) activeBtn.classList.add('active');

  const content = document.getElementById('admin-tab-content');
  if (content) {
    content.innerHTML = `<div style="text-align:center; padding: 2.5rem; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><span style="margin-top:0.5rem; display:inline-block;">กำลังโหลดข้อมูล...</span></div>`;
  }

  const headers = { 'Authorization': `Bearer ${state.token}` };

  try {
    if (adminTab === 'approvals') {
      const res = await fetch(`${API_BASE_URL}/bookings?status_filter=PENDING_APPROVAL`, { headers });
      adminTableState.data = await res.json();
    } else if (adminTab === 'payments') {
      const res = await fetch(`${API_BASE_URL}/bookings`, { headers });
      const all = await res.json();
      adminTableState.data = all.filter(b => b.payment_status === 'PENDING_VERIFICATION');
    } else if (adminTab === 'all-bookings') {
      const res = await fetch(`${API_BASE_URL}/bookings`, { headers });
      adminTableState.data = await res.json();
    } else if (adminTab === 'equipments') {
      const res = await fetch(`${API_BASE_URL}/equipments`, { headers });
      adminTableState.data = await res.json();
    }
  } catch (err) {
    console.error("Error fetching admin tab data:", err);
    adminTableState.data = [];
  }

  renderAdminTabContent();
}

function renderAdminTabContent() {
  const content = document.getElementById('admin-tab-content');
  if (!content) return;
  const tab = adminTableState.tab;
  const items = adminTableState.data || [];

  if (tab === 'approvals') {
    content.innerHTML = `
      <h3 style="margin-bottom: 0.75rem;"><i class="fa-solid fa-clock"></i> คำขอรออนุมัติการจอง (${items.length})</h3>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              ${getSortHeader('Code', 'booking_code')}
              ${getSortHeader('ห้องประชุม', 'room_name')}
              ${getSortHeader('ผู้ขอจอง', 'guest_name')}
              ${getSortHeader('วันเวลา', 'start_time')}
              ${getSortHeader('ยอดรวม', 'total_price')}
              ${getSortHeader('สถานะจอง', 'status')}
              ${getSortHeader('การชำระเงิน', 'payment_status')}
              <th>รายละเอียด & ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 2rem;">ไม่มีคำขอรออนุมัติ</td></tr>' : items.map(b => `
              <tr>
                <td><strong>${b.booking_code}</strong></td>
                <td>${b.room_name || b.room_id}</td>
                <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name + ' (Guest)'}</td>
                <td>${formatDateTime(b.start_time)}</td>
                <td><strong>฿${parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
                <td>${formatBookingStatusBadge(b.status)}</td>
                <td>${formatPaymentStatusBadge(b.payment_status)}</td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button class="btn btn-secondary btn-sm" onclick="showBookingDetailsModal(${b.id})" title="ดูรายละเอียดผู้จองและรายการจอง">
                      <i class="fa-solid fa-eye"></i> ดูรายละเอียด
                    </button>
                    ${b.payment_status === 'PAID' ? `
                      <button class="btn btn-success btn-sm" onclick="adminApproveBooking(${b.id}, 'APPROVE')"><i class="fa-solid fa-check"></i> อนุมัติการจอง</button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" style="opacity: 0.75;" onclick="Swal.fire('ยังไม่อนุมัติ', 'ไม่สามารถอนุมัติการจองได้ เนื่องจากผู้ใช้งานยังไม่ได้ชำระเงิน หรือสลิปชำระเงินยังไม่ผ่านการอนุมัติ (ต้องอนุมัติสลิปโอนเงินในแท็บสลิปชำระเงินให้เป็น PAID ก่อนเท่านั้น)', 'warning')"><i class="fa-solid fa-lock"></i> รอชำระเงิน/รอตรวจสลิป</button>
                    `}
                    <button class="btn btn-danger btn-sm" onclick="adminApproveBooking(${b.id}, 'REJECT')"><i class="fa-solid fa-xmark"></i> ปฏิเสธ</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (tab === 'payments') {
    content.innerHTML = `
      <h3 style="margin-bottom: 0.75rem;"><i class="fa-solid fa-receipt"></i> รายการสลิปชำระเงินรอตรวจสอบ (${items.length})</h3>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              ${getSortHeader('Code', 'booking_code')}
              ${getSortHeader('ผู้จอง', 'guest_name')}
              ${getSortHeader('วันเวลา', 'start_time')}
              ${getSortHeader('ยอดสุทธิ', 'total_price')}
              <th>รูป Slip โอนเงิน</th>
              <th>รายละเอียด & การตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2rem;">ไม่มีสลิปรอตรวจสอบ</td></tr>' : items.map(b => `
              <tr>
                <td><strong>${b.booking_code}</strong></td>
                <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name}</td>
                <td>${formatDateTime(b.start_time)}</td>
                <td><strong>฿${parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
                <td>
                  ${b.slip_url ? `
                    <a href="${b.slip_url}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-image"></i> เปิดดู Slip</a>
                  ` : '<span style="color:var(--text-muted);">ไม่มีรูป</span>'}
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button class="btn btn-secondary btn-sm" onclick="showBookingDetailsModal(${b.id})" title="ดูรายละเอียดทั้งหมด">
                      <i class="fa-solid fa-eye"></i> ดูรายละเอียด
                    </button>
                    <button class="btn btn-success btn-sm" onclick="adminVerifyPayment(${b.id}, 'APPROVE')"><i class="fa-solid fa-check"></i> ยืนยันถูกต้อง</button>
                    <button class="btn btn-danger btn-sm" onclick="adminVerifyPayment(${b.id}, 'REJECT')"><i class="fa-solid fa-xmark"></i> สลิปไม่ถูกต้อง</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (tab === 'all-bookings') {
    content.innerHTML = `
      <h3 style="margin-bottom: 0.75rem;"><i class="fa-solid fa-list-check"></i> รายการจองทั้งหมดในระบบ (${items.length})</h3>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              ${getSortHeader('Code', 'booking_code')}
              ${getSortHeader('ห้องประชุม', 'room_name')}
              ${getSortHeader('ผู้จอง / สิทธิ์', 'guest_name')}
              ${getSortHeader('วันและเวลา', 'start_time')}
              ${getSortHeader('ยอดรวมสุทธิ', 'total_price')}
              ${getSortHeader('สถานะการจอง', 'status')}
              ${getSortHeader('การชำระเงิน', 'payment_status')}
              <th>รายละเอียด & การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 2rem;">ไม่มีรายการจอง</td></tr>' : items.map(b => `
              <tr>
                <td><strong>${b.booking_code}</strong></td>
                <td>${b.room_name || b.room_id}</td>
                <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name + ' (Guest)'}</td>
                <td>${formatDateTime(b.start_time)} - ${formatTime(b.end_time)}</td>
                <td><strong>฿${parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
                <td>${formatBookingStatusBadge(b.status)}</td>
                <td>${formatPaymentStatusBadge(b.payment_status)}</td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button class="btn btn-secondary btn-sm" onclick="showBookingDetailsModal(${b.id})">
                      <i class="fa-solid fa-eye"></i> ดูรายละเอียด
                    </button>
                    ${b.status === 'APPROVED' ? `
                      <button class="btn btn-success btn-sm" onclick="performCheckin(${b.id})">
                        <i class="fa-solid fa-qrcode"></i> Check-in
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (tab === 'equipments') {
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3><i class="fa-solid fa-boxes-packing"></i> จัดการอุปกรณ์เสริม (${items.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openEquipmentModal()">
          <i class="fa-solid fa-plus"></i> เพิ่มอุปกรณ์เสริมใหม่
        </button>
      </div>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              ${getSortHeader('ID', 'id')}
              ${getSortHeader('ชื่ออุปกรณ์เสริม', 'name')}
              ${getSortHeader('รายละเอียด', 'description')}
              ${getSortHeader('คงเหลือ / ทั้งหมด', 'available_quantity')}
              ${getSortHeader('ราคาบุคคลทั่วไป (฿/ชม.)', 'standard_price')}
              ${getSortHeader('ราคาสมาชิก (฿/ชม.)', 'member_price')}
              <th>เครื่องมือจัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 2rem;">ไม่มีรายการอุปกรณ์เสริม</td></tr>' : items.map(eq => `
              <tr>
                <td>#${eq.id}</td>
                <td><strong>${eq.name}</strong></td>
                <td>${eq.description || '-'}</td>
                <td><span class="badge badge-approved">${eq.available_quantity} / ${eq.total_quantity}</span></td>
                <td>฿${parseFloat(eq.standard_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td><strong style="color:var(--accent-primary);">฿${parseFloat(eq.member_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
                <td>
                  <div style="display: flex; gap: 0.35rem;">
                    <button class="btn btn-secondary btn-sm" onclick="openEquipmentModal(${eq.id})">
                      <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteEquipment(${eq.id}, '${eq.name.replace(/'/g, "\\'")}')">
                      <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

async function showBookingDetailsModal(bookingId) {
  let b = (adminTableState.data || []).find(item => item.id === bookingId);
  if (!b) {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) b = await res.json();
    } catch (err) {}
  }
  if (!b) {
    Swal.fire('ไม่พบข้อมูล', 'ไม่สามารถค้นหาข้อมูลรายการจองนี้ได้', 'error');
    return;
  }

  const roomName = b.room_name || `ห้อง #${b.room_id}`;
  const bookerName = b.booking_mode === 'MEMBER' ? 'สมาชิกที่เข้าสู่ระบบ' : (b.guest_name || 'Guest');
  const bookerEmail = b.guest_email || '-';
  const bookerPhone = b.guest_phone || '-';
  const startFormatted = formatDateTime(b.start_time);
  const endFormatted = formatTime(b.end_time);

  const roomPrice = parseFloat(b.room_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
  const equipPrice = parseFloat(b.equipment_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
  const discount = parseFloat(b.discount_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
  const totalPrice = parseFloat(b.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2});

  let equipHtml = '<em>ไม่มีอุปกรณ์เสริมเพิ่มเติม</em>';
  if (b.equipments && b.equipments.length > 0) {
    equipHtml = b.equipments.map(eq => `
      <li style="margin-bottom: 0.2rem;">
        ⚙️ ${eq.equipment_name || `อุปกรณ์ #${eq.equipment_id}`}: <strong>${eq.quantity} ชิ้น</strong> 
        (฿${parseFloat(eq.unit_price || 0).toLocaleString()} x ${eq.quantity} = ฿${parseFloat(eq.subtotal || 0).toLocaleString()})
      </li>
    `).join('');
    equipHtml = `<ul style="margin: 0; padding-left: 1.2rem; font-size: 0.88rem;">${equipHtml}</ul>`;
  }

  let slipPreviewHtml = `<span style="color:var(--text-muted);">ยังไม่ได้แนบสลิปโอนเงิน</span>`;
  if (b.slip_url) {
    slipPreviewHtml = `
      <div style="margin-top: 0.5rem;">
        <a href="${b.slip_url}" target="_blank" title="คลิกเพื่อดูรูปขนาดเต็ม">
          <img src="${b.slip_url}" style="max-width: 100%; max-height: 180px; border-radius: 8px; border: 1px solid var(--border-color); object-fit: contain;">
        </a>
        <br><a href="${b.slip_url}" target="_blank" style="font-size:0.8rem; color:var(--accent-primary);"><i class="fa-solid fa-up-right-from-square"></i> เปิดดูสลิปขนาดใหญ่</a>
      </div>
    `;
  }

  Swal.fire({
    title: `📌 รายละเอียดการจอง: ${b.booking_code}`,
    width: '650px',
    html: `
      <div style="text-align: left; font-size: 0.92rem; line-height: 1.6; background: var(--bg-tertiary); padding: 1.25rem; border-radius: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div>
            <p style="margin-bottom:0.3rem;">🏢 <strong>ห้องประชุม:</strong> ${roomName}</p>
            <p style="margin-bottom:0.3rem;">📍 <strong>สถานที่:</strong> ${b.room_location || '-'}</p>
            <p style="margin-bottom:0.3rem;">📌 <strong>หัวข้อ:</strong> ${b.subject || '-'}</p>
            <p style="margin-bottom:0.3rem;">📝 <strong>วัตถุประสงค์:</strong> ${b.purpose || '-'}</p>
          </div>
          <div>
            <p style="margin-bottom:0.3rem;">👤 <strong>ผู้จอง:</strong> ${bookerName}</p>
            <p style="margin-bottom:0.3rem;">📧 <strong>อีเมล:</strong> ${bookerEmail}</p>
            <p style="margin-bottom:0.3rem;">📞 <strong>เบอร์โทรศัพท์:</strong> ${bookerPhone}</p>
            <p style="margin-bottom:0.3rem;">🕒 <strong>วันเวลา:</strong> ${startFormatted} - ${endFormatted}</p>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-bottom: 0.75rem;">
          <strong>🛠️ รายการอุปกรณ์เสริม:</strong>
          <div style="margin-top: 0.3rem;">${equipHtml}</div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-bottom: 0.75rem;">
          <p style="margin-bottom:0.25rem;">💰 ค่าห้อง: ฿${roomPrice} | ค่าอุปกรณ์: ฿${equipPrice} | ส่วนลด: ฿${discount}</p>
          <p style="font-size: 1.05rem; color: var(--accent-primary); margin: 0;"><strong>ยอดรวมสุทธิ: ฿${totalPrice}</strong></p>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div>
            <p style="margin-bottom:0.4rem;">🏷️ <strong>สถานะการจอง:</strong> ${formatBookingStatusBadge(b.status)}</p>
            <p style="margin-bottom:0.4rem;">💳 <strong>สถานะชำระเงิน:</strong> ${formatPaymentStatusBadge(b.payment_status)}</p>
          </div>
          <div style="text-align: right;">
            <strong>💳 สลิปชำระเงิน:</strong>
            ${slipPreviewHtml}
          </div>
        </div>
      </div>
    `,
    confirmButtonText: 'ปิดหน้าต่าง',
    confirmButtonColor: '#6366F1'
  });
}

async function openEquipmentModal(eqId = null) {
  let eq = null;
  if (eqId) {
    eq = (adminTableState.data || []).find(item => item.id === eqId);
  }

  const { value: formValues } = await Swal.fire({
    title: eqId ? '✏️ แก้ไขอุปกรณ์เสริม' : '➕ เพิ่มอุปกรณ์เสริมใหม่',
    width: '550px',
    html: `
      <div style="text-align: left; font-size: 0.9rem;">
        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: 600;">ชื่ออุปกรณ์เสริม *</label>
          <input id="swal-eq-name" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq ? eq.name : ''}" placeholder="เช่น Wireless Presenter Clicker">
        </div>
        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: 600;">รายละเอียดคำอธิบาย</label>
          <input id="swal-eq-desc" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq && eq.description ? eq.description : ''}" placeholder="รายละเอียดอุปกรณ์...">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div>
            <label style="font-weight: 600;">จำนวนทั้งหมด *</label>
            <input type="number" id="swal-eq-total-qty" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq ? eq.total_quantity : 1}">
          </div>
          <div>
            <label style="font-weight: 600;">จำนวนคงเหลือ *</label>
            <input type="number" id="swal-eq-avail-qty" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq ? eq.available_quantity : 1}">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="font-weight: 600;">ราคาบุคคลทั่วไป (บาท/ชม.) *</label>
            <input type="number" step="0.01" id="swal-eq-std-price" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq ? eq.standard_price : 0}">
          </div>
          <div>
            <label style="font-weight: 600;">ราคาสมาชิก (บาท/ชม.) *</label>
            <input type="number" step="0.01" id="swal-eq-mem-price" class="swal2-input" style="width: 100%; margin-top: 0.25rem;" value="${eq ? eq.member_price : 0}">
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: eqId ? 'บันทึกการแก้ไข' : 'เพิ่มอุปกรณ์',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#10B981',
    preConfirm: () => {
      const name = document.getElementById('swal-eq-name').value.trim();
      if (!name) {
        Swal.showValidationMessage('กรุณากรอกชื่ออุปกรณ์เสริม');
        return false;
      }
      return {
        name: name,
        description: document.getElementById('swal-eq-desc').value.trim() || null,
        total_quantity: parseInt(document.getElementById('swal-eq-total-qty').value) || 1,
        available_quantity: parseInt(document.getElementById('swal-eq-avail-qty').value) || 0,
        standard_price: parseFloat(document.getElementById('swal-eq-std-price').value) || 0,
        member_price: parseFloat(document.getElementById('swal-eq-mem-price').value) || 0
      };
    }
  });

  if (!formValues) return;

  try {
    const url = eqId ? `${API_BASE_URL}/equipments/${eqId}` : `${API_BASE_URL}/equipments`;
    const method = eqId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(formValues)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Save failed');

    Swal.fire({
      icon: 'success',
      title: eqId ? 'แก้ไขข้อมูลสำเร็จ!' : 'เพิ่มอุปกรณ์เสริมสำเร็จ!',
      timer: 1800,
      showConfirmButton: false
    });
    loadAdminDashboard();
  } catch (err) {
    Swal.fire('ทำรายการไม่สำเร็จ', err.message, 'error');
  }
}

async function confirmDeleteEquipment(eqId, eqName) {
  const result = await Swal.fire({
    title: `ลบอุปกรณ์ "${eqName}"?`,
    text: 'การลบข้อมูลนี้ไม่สามารถยกเลิกได้ คุณแน่ใจหรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบอุปกรณ์',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#EF4444'
  });
  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/equipments/${eqId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Delete failed');

    Swal.fire({
      icon: 'success',
      title: 'ลบอุปกรณ์เสริมเรียบร้อยแล้ว',
      timer: 1500,
      showConfirmButton: false
    });
    loadAdminDashboard();
  } catch (err) {
    Swal.fire('ไม่สามารถลบได้', err.message, 'error');
  }
}

async function adminApproveBooking(bookingId, action) {
  let reason = null;
  if (action === 'REJECT') {
    const { value: inputReason } = await Swal.fire({
      title: 'ระบุเหตุผลที่ปฏิเสธ',
      input: 'textarea',
      inputPlaceholder: 'พิมพ์เหตุผลการไม่อนุมัติ...',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันปฏิเสธ',
      cancelButtonText: 'ย้อนกลับ',
      confirmButtonColor: '#EF4444'
    });
    if (!inputReason) return;
    reason = inputReason;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ action: action, rejection_reason: reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Action failed');

    Swal.fire({
      icon: 'success',
      title: action === 'APPROVE' ? 'อนุมัติการจองเรียบร้อยแล้ว!' : 'ปฏิเสธการจองเรียบร้อยแล้ว',
      timer: 1800,
      showConfirmButton: false
    });
    loadAdminDashboard();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

async function adminVerifyPayment(bookingId, action) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ action: action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Verification failed');

    Swal.fire({
      icon: 'success',
      title: action === 'APPROVE' ? 'อนุมัติสลิปชำระเงินเรียบร้อยแล้ว!' : 'ปฏิเสธสลิปชำระเงินเรียบร้อยแล้ว',
      timer: 1800,
      showConfirmButton: false
    });
    loadAdminDashboard();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      confirmButtonColor: '#EF4444'
    });
  }
}

function exportReport(format) {
  window.open(`${API_BASE_URL}/reports/export/${format}`);
}

// --- Utilities & Modal Helpers ---
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function formatDateTime(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
