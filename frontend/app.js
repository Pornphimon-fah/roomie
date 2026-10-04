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

  // Polling for Auto-Release Check & Data Sync every 30s
  setInterval(() => {
    fetchRooms();
  }, 30000);
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
    alert(`ยินดีต้อนรับคุณ ${state.user.full_name}!`);
    fetchRooms();
  } catch (err) {
    alert(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
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
    alert('สมัครสมาชิกสำเร็จเรียบร้อย! กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ');
    openModal('login-modal');
  } catch (err) {
    alert(`สมัครสมาชิกไม่สำเร็จ: ${err.message}`);
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('roomie_token');
  localStorage.removeItem('roomie_user');
  checkAuth();
  switchNavTab('rooms');
  alert('ออกจากระบบเรียบร้อยแล้ว');
}

// --- Navigation Tabs ---
function switchNavTab(tabName) {
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
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filter-date').value = today;
  document.getElementById('timeline-date-picker').value = today;
  document.getElementById('booking-date').value = today;
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

// --- Render Timeline Grid ---
async function renderTimelineGrid() {
  const dateStr = document.getElementById('timeline-date-picker').value;
  const container = document.getElementById('timeline-grid-container');

  // Time Slots 08:00 - 18:00
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  let gridHTML = `<div class="timeline-cell timeline-header">ห้องประชุม / เวลา</div>`;
  hours.forEach(h => {
    gridHTML += `<div class="timeline-cell timeline-header">${h}</div>`;
  });

  // Fetch bookings for this day
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`);
    const allBookings = await res.json();

    state.rooms.forEach(room => {
      gridHTML += `<div class="timeline-cell" style="font-weight: 600; text-align: left; background: var(--bg-tertiary);">${room.name}</div>`;
      
      hours.forEach((h, idx) => {
        const slotStart = new Date(`${dateStr}T${h}:00Z`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        // Find matching booking
        const booked = allBookings.find(b => {
          if (b.room_id !== room.id) return false;
          if (b.status === 'CANCELLED' || b.status === 'REJECTED' || b.status === 'NO_SHOW') return false;
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return bStart < slotEnd && bEnd > slotStart;
        });

        if (!booked) {
          gridHTML += `<div class="timeline-cell slot-available" onclick="quickBookTimeline(${room.id}, '${dateStr}', '${h}')">ว่าง</div>`;
        } else if (booked.status === 'PENDING_APPROVAL') {
          gridHTML += `<div class="timeline-cell slot-pending" title="${booked.booking_code}">รออนุมัติ</div>`;
        } else {
          gridHTML += `<div class="timeline-cell slot-booked" title="${booked.booking_code}">จองแล้ว</div>`;
        }
      });
    });

    container.innerHTML = gridHTML;
  } catch (err) {
    console.error("Timeline render error:", err);
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
  const subject = document.getElementById('booking-subject').value;
  const purpose = document.getElementById('booking-purpose').value;
  const dateStr = document.getElementById('booking-date').value;
  const startStr = document.getElementById('booking-start').value;
  const endStr = document.getElementById('booking-end').value;

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
    payload.guest_name = document.getElementById('guest-name').value;
    payload.guest_email = document.getElementById('guest-email').value;
    payload.guest_phone = document.getElementById('guest-phone').value;
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

    // Show Success Modal
    document.getElementById('success-booking-code').innerText = data.booking_code;
    document.getElementById('slip-booking-id').value = data.id;
    openModal('success-modal');

    // Reset form after successful submission
    resetBookingForm();

    fetchRooms();
  } catch (err) {
    alert(`เกิดข้อผิดพลาดในการจอง: ${err.message}`);
  }
}

// Handle Slip Upload Submit
async function handleSlipSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('slip-booking-id').value;
  const slipUrl = document.getElementById('slip-url-input').value;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/upload-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: 'PROMPTPAY', slip_url: slipUrl })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Slip upload failed');

    closeModal('success-modal');
    alert('อัปโหลด Slip โอนเงินเรียบร้อยแล้ว! ผู้ดูแลจะตรวจสอบสลิปของท่าน');
    switchNavTab('my-bookings');
  } catch (err) {
    alert(`อัปโหลด Slip ไม่สำเร็จ: ${err.message}`);
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
    alert(err.message);
  }
}

function renderBookingsList(bookings, container) {
  if (bookings.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">ไม่พบรายการจอง</div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Booking Code</th>
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
              <td><strong>฿${parseFloat(b.total_price).toLocaleString()}</strong></td>
              <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
              <td><span class="badge badge-${b.payment_status.toLowerCase()}">${b.payment_status}</span></td>
              <td>
                <div style="display: flex; gap: 0.4rem;">
                  <button class="btn btn-success btn-sm" onclick="performCheckin(${b.id})">
                    <i class="fa-solid fa-qrcode"></i> Check-in
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="performCancel(${b.id})">
                    <i class="fa-solid fa-ban"></i> ยกเลิก (ล่วงหน้า 3 วัน)
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

async function performCheckin(bookingId) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/checkin`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Check-in failed');

    alert('Check-in สำเร็จเรียบร้อย! ยินดีต้อนรับเข้าใช้งานห้องประชุม');
    fetchMyBookings();
  } catch (err) {
    alert(`Check-in ไม่สำเร็จ: ${err.message}`);
  }
}

async function performCancel(bookingId) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้? (สามารถยกเลิกได้ล่วงหน้าอย่างน้อย 3 วันก่อนวันประชุม)')) return;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Cancellation failed');

    alert('ยกเลิกการจองเรียบร้อยแล้ว!');
    fetchMyBookings();
  } catch (err) {
    alert(`ไม่สามารถยกเลิกการจองได้: ${err.message}`);
  }
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

    switchAdminTab('approvals');
  } catch (err) {
    console.error("Admin dashboard load error:", err);
  }
}

async function switchAdminTab(adminTab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const content = document.getElementById('admin-tab-content');
  const headers = { 'Authorization': `Bearer ${state.token}` };

  if (adminTab === 'approvals') {
    const res = await fetch(`${API_BASE_URL}/bookings?status_filter=PENDING_APPROVAL`, { headers });
    const bookings = await res.json();

    content.innerHTML = `
      <h3>คำขอรออนุมัติการจอง (${bookings.length})</h3>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>ห้องประชุม</th>
              <th>ผู้ขอจอง</th>
              <th>วันเวลา</th>
              <th>ยอดรวม</th>
              <th>สิทธิ์</th>
              <th>อนุมัติ / ปฏิเสธ</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.length === 0 ? '<tr><td colspan="7" style="text-align:center;">ไม่มีคำขอรออนุมัติ</td></tr>' : bookings.map(b => `
              <tr>
                <td><strong>${b.booking_code}</strong></td>
                <td>${b.room_name}</td>
                <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name + ' (Guest)'}</td>
                <td>${formatDateTime(b.start_time)}</td>
                <td>฿${parseFloat(b.total_price).toLocaleString()}</td>
                <td><span class="badge badge-pending">PENDING</span></td>
                <td>
                  <button class="btn btn-success btn-sm" onclick="adminApproveBooking(${b.id}, 'APPROVE')">อนุมัติ</button>
                  <button class="btn btn-danger btn-sm" onclick="adminApproveBooking(${b.id}, 'REJECT')">ปฏิเสธ</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (adminTab === 'payments') {
    const res = await fetch(`${API_BASE_URL}/bookings`, { headers });
    const all = await res.json();
    const payments = all.filter(b => b.payment_status === 'PENDING_VERIFICATION');

    content.innerHTML = `
      <h3>รายการสลิปชำระเงินรอตรวจสอบ (${payments.length})</h3>
      <div class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>ผู้จอง</th>
              <th>ยอดสุทธิ</th>
              <th>รูป Slip โอนเงิน</th>
              <th>การตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            ${payments.length === 0 ? '<tr><td colspan="5" style="text-align:center;">ไม่มีสลิปรอตรวจสอบ</td></tr>' : payments.map(b => `
              <tr>
                <td><strong>${b.booking_code}</strong></td>
                <td>${b.booking_mode === 'MEMBER' ? 'สมาชิก' : b.guest_name}</td>
                <td>฿${parseFloat(b.total_price).toLocaleString()}</td>
                <td><a href="${b.slip_url}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-image"></i> เปิดดู Slip</a></td>
                <td>
                  <button class="btn btn-success btn-sm" onclick="adminVerifyPayment(${b.id}, 'APPROVE')">ยืนยันถูกต้อง</button>
                  <button class="btn btn-danger btn-sm" onclick="adminVerifyPayment(${b.id}, 'REJECT')">สลิปไม่ถูกต้อง</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (adminTab === 'all-bookings') {
    const res = await fetch(`${API_BASE_URL}/bookings`, { headers });
    const bookings = await res.json();
    renderBookingsList(bookings, content);
  }
}

async function adminApproveBooking(bookingId, action) {
  let reason = null;
  if (action === 'REJECT') {
    reason = prompt('กรุณาระบุเหตุผลที่ไม่ไม่อนุมัติ:');
    if (!reason) return;
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
    if (!res.ok) throw new Error('Action failed');

    alert(`ทำรายการ ${action} สำเร็จ!`);
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
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
    if (!res.ok) throw new Error('Verification failed');

    alert('ตรวจสอบสลิปชำระเงินเรียบร้อยแล้ว!');
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
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
