// ============ STATE ============
let token = localStorage.getItem('apt_token');
let currentUser = null;
let currentPage = 'dashboard';
let selectedFacility = null;
let selectedSlot = null;
let selectedBill = null;
let selectedParkingSlot = null;
let billsData = [];
let facilitiesData = [];

const API = '';

// ============ HELPERS ============
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showSuccess(text) {
  const overlay = document.getElementById('successOverlay');
  document.getElementById('successText').textContent = text;
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 2000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ============ AUTH ============
function togglePasswordVisibility() {
  const pw = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  if (pw.type === 'password') {
    icon.innerHTML = `
      <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; height:20px;">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  } else {
    icon.innerHTML = `
      <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; height:20px;">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;
  }
}

function prefillLogin(username, password) {
  const userField = document.getElementById('loginUsername');
  const pwField = document.getElementById('loginPassword');
  if (userField && pwField) {
    userField.value = username;
    pwField.value = password;
    
    // Add visual feedback to fields
    userField.style.transform = 'scale(1.02)';
    pwField.style.transform = 'scale(1.02)';
    setTimeout(() => {
      userField.style.transform = '';
      pwField.style.transform = '';
    }, 200);

    showToast(`Prefilled credentials for ${username}!`, 'info');
  }
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!username || !password) { errorEl.textContent = 'Please enter both fields'; return; }
  errorEl.textContent = '';
  btn.classList.add('loading');

  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('apt_token', token);
    btn.classList.remove('loading');
    showToast(`Welcome back, ${currentUser.name}!`);
    enterApp();
  } catch (err) {
    btn.classList.remove('loading');
    errorEl.textContent = err.message;
  }
}

function handleLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('apt_token');
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginPassword').value = '';
  closeAllDropdowns();
}

async function checkAuth() {
  if (!token) return;
  try {
    currentUser = await api('/api/auth/me');
    enterApp();
  } catch { handleLogout(); }
}

function enterApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  updateUserUI();
  navigateTo('dashboard');
}

function updateUserUI() {
  if (!currentUser) return;
  document.getElementById('navAvatar').textContent = currentUser.avatar;
  document.getElementById('navUserName').textContent = currentUser.name;
  document.getElementById('menuAvatar').textContent = currentUser.avatar;
  document.getElementById('menuUserName').textContent = currentUser.name;
  document.getElementById('menuUserFlat').textContent = `Flat ${currentUser.flat}`;
  document.getElementById('dashUserName').textContent = currentUser.name;
  
  const adminBtn = document.getElementById('navAdminBtn');
  if (adminBtn) {
    if (currentUser.role === 'admin') {
      adminBtn.classList.remove('hidden');
    } else {
      adminBtn.classList.add('hidden');
    }
  }
}

// ============ NAVIGATION ============
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  closeSidebar();
  closeAllDropdowns();

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'facilities': loadFacilities(); break;
    case 'billing': loadBilling(); break;
    case 'maintenance': loadMaintenance(); break;
    case 'emergency': loadEmergency(); break;
    case 'parking': loadParking(); break;
    case 'child-safety': loadChildSafety(); break;
    case 'community': loadCommunity(); break;
    case 'events': loadEvents(); break;
    case 'visitor': loadVisitor(); break;
    case 'ai-help': loadAiHelp(); break;
    case 'chat': loadChat(); break;
    case 'history': loadHistory(); break;
    case 'admin': loadAdminDash(); break;
  }
}

// ============ SIDEBAR ============
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('hidden');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ============ DROPDOWNS ============
function toggleNotifications() {
  const dd = document.getElementById('notificationsDropdown');
  document.getElementById('userMenuDropdown').classList.add('hidden');
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) loadNotifications();
}
function toggleUserMenu() {
  const dd = document.getElementById('userMenuDropdown');
  document.getElementById('notificationsDropdown').classList.add('hidden');
  dd.classList.toggle('hidden');
}
function closeAllDropdowns() {
  document.getElementById('notificationsDropdown').classList.add('hidden');
  document.getElementById('userMenuDropdown').classList.add('hidden');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar-notifications') && !e.target.closest('.notifications-dropdown'))
    document.getElementById('notificationsDropdown').classList.add('hidden');
  if (!e.target.closest('.navbar-user') && !e.target.closest('.user-menu-dropdown'))
    document.getElementById('userMenuDropdown').classList.add('hidden');
});

async function loadNotifications() {
  try {
    const data = await api('/api/announcements');
    const list = document.getElementById('notifList');
    list.innerHTML = data.map(a => `
      <div class="notif-item">
        <span class="notif-item-icon"><span class="priority-dot ${a.priority}"></span></span>
        <div class="notif-item-content">
          <h4>${a.title}</h4>
          <p>${a.message}</p>
        </div>
      </div>
    `).join('');
  } catch {}
}

// ============ MODAL ============
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ============ DASHBOARD ============
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good Night', emoji: '🌙' };
  if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (hour < 21) return { text: 'Good Evening', emoji: '🌅' };
  return { text: 'Good Night', emoji: '🌙' };
}

function animateCounter(el, target, prefix = '', duration = 1200) {
  const start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (target - start) * eased);
    el.textContent = prefix + current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function setRingProgress(ringId, value, max) {
  const ring = document.getElementById(ringId);
  if (!ring) return;
  const circumference = 213.6; // 2 * π * 34
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - (ratio * circumference);
  // Trigger animation by setting offset after a small delay
  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
  }, 300);
}

function showSmsBanner(messageText) {
  const phoneContainer = document.getElementById('phoneSimulation');
  const msgEl = document.getElementById('phoneSimMessage');
  const timeEl = document.getElementById('phoneSimTime');
  
  if (phoneContainer && msgEl) {
    // Set message
    msgEl.textContent = messageText || "Connect Apartment: Your request was successful!";
    
    // Set current time on phone screen
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Play notification sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch(e) {}
    
    // Show animation
    phoneContainer.classList.remove('hidden');
    
    // Hide after 8 seconds
    setTimeout(() => {
      phoneContainer.classList.add('hidden');
    }, 8000);
  }
}

async function loadDashboard() {
  // Set time-based greeting
  const greeting = getTimeGreeting();
  const greetingLabel = document.getElementById('greetingTimeLabel');
  const greetingEmoji = document.getElementById('greetingEmoji');
  if (greetingLabel) greetingLabel.textContent = greeting.text;
  if (greetingEmoji) greetingEmoji.textContent = greeting.emoji;

  // Set date display
  const dateEl = document.getElementById('dashDateDisplay');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-IN', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
  }

  try {
    const stats = await api('/api/dashboard/stats');
    
    // Animated counters
    animateCounter(document.getElementById('statBookings'), stats.totalBookings);
    animateCounter(document.getElementById('statTickets'), stats.activeTickets);
    animateCounter(document.getElementById('statPendingBills'), stats.pendingBills);
    animateCounter(document.getElementById('statPendingAmount'), stats.pendingAmount, '₹');

    // Progress rings
    setRingProgress('ringBookings', stats.totalBookings, Math.max(stats.totalBookings, 5));
    setRingProgress('ringTickets', stats.activeTickets, Math.max(stats.activeTickets, 5));
    setRingProgress('ringBills', stats.pendingBills, 6);
    setRingProgress('ringAmount', stats.pendingAmount, 25000);
    
    // Announcements v2
    const annList = document.getElementById('announcementsList');
    annList.innerHTML = stats.announcements.map((a, i) => `
      <div class="announcement-card-v2 priority-${a.priority}" style="animation-delay: ${i * 0.1}s">
        <div class="ann-header-v2">
          <h3>
            <span class="priority-dot ${a.priority}"></span>
            ${a.title}
          </h3>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="ann-priority-pill ${a.priority}">${a.priority}</span>
            <span class="ann-date-v2">${formatDate(a.date)}</span>
          </div>
        </div>
        <p>${a.message}</p>
      </div>
    `).join('');
  } catch (err) { showToast(err.message, 'error'); }

  // Load activity feed
  try {
    const history = await api('/api/history');
    const feed = document.getElementById('activityFeed');
    const activities = [];

    // Combine all activities with type info
    (history.bookings || []).forEach(b => {
      activities.push({ type: 'booking', title: `Booked ${b.facilityName}`, detail: `${b.slot} • ₹${b.amount}`, time: b.createdAt });
    });
    (history.payments || []).forEach(p => {
      activities.push({ type: 'payment', title: `Paid ${p.billName}`, detail: `₹${p.amount.toLocaleString()} via ${p.method}`, time: p.paidAt });
    });
    (history.complaints || []).forEach(c => {
      activities.push({ type: 'ticket', title: `${c.categoryName} Ticket`, detail: `${c.ticketNo} • ${c.status}`, time: c.createdAt });
    });

    // Sort by time, newest first, take top 6
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const topActivities = activities.slice(0, 6);

    if (topActivities.length === 0) {
      feed.innerHTML = `
        <div class="activity-empty">
          <div class="activity-empty-icon">📭</div>
          <p>No recent activity. Start by booking a facility!</p>
        </div>`;
    } else {
      feed.innerHTML = topActivities.map((a, i) => `
        <div class="activity-item" style="animation-delay: ${i * 0.08}s">
          <div class="activity-dot ${a.type}"></div>
          <div class="activity-info">
            <strong>${a.title}</strong>
            <p>${a.detail} • ${formatDateTime(a.time)}</p>
          </div>
        </div>
      `).join('');
    }
  } catch {}

  // Load upcoming events
  try {
    const events = await api('/api/events');
    const eventsEl = document.getElementById('dashUpcomingEvents');
    const upcoming = events.slice(0, 3);
    
    if (upcoming.length === 0) {
      eventsEl.innerHTML = `
        <div class="activity-empty">
          <div class="activity-empty-icon">🎉</div>
          <p>No upcoming events</p>
        </div>`;
    } else {
      eventsEl.innerHTML = upcoming.map(e => {
        const d = new Date(e.date);
        return `
          <div class="dash-event-card">
            <div class="dash-event-date">
              <div class="dash-event-day">${d.getDate()}</div>
              <div class="dash-event-month">${d.toLocaleString('default', { month: 'short' })}</div>
            </div>
            <div class="dash-event-info">
              <h4>${e.title}</h4>
              <p>${e.desc}</p>
            </div>
          </div>`;
      }).join('');
    }
  } catch {}
}

// ============ FACILITIES ============
async function loadFacilities() {
  try {
    const facilities = await api('/api/facilities');
    document.getElementById('facilitiesGrid').innerHTML = facilities.map(f => `
      <div class="facility-card" onclick="openFacilityModal('${f.id}')">
        <div class="fc-icon">${f.icon}</div>
        <h3>${f.name}</h3>
        <p>${f.description}</p>
        <div class="fc-price">₹${f.price}</div>
      </div>
    `).join('');
    loadBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openFacilityModal(id) {
  if (!facilitiesData.length) facilitiesData = await api('/api/facilities');
  selectedFacility = facilitiesData.find(f => f.id === id);
  selectedSlot = null;
  if (!selectedFacility) return;

  document.getElementById('facilityModalTitle').textContent = `Book ${selectedFacility.name}`;
  document.getElementById('facilityModalDesc').textContent = selectedFacility.description;
  document.getElementById('facilityPrice').textContent = `₹${selectedFacility.price}`;
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('facilityDate').value = today;
  document.getElementById('facilityDate').min = today;

  renderSlots();
  openModal('facilityModal');
}

function renderSlots() {
  if (!selectedFacility) return;
  const container = document.getElementById('slotsContainer');
  container.innerHTML = selectedFacility.slots.map(s => `
    <button class="slot-btn" onclick="selectSlotBtn(this, '${s}')">${s}</button>
  `).join('');
}

function selectSlotBtn(btn, slot) {
  document.querySelectorAll('#slotsContainer .slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSlot = slot;
}

// ---- UPI PAYMENT FLOW ----
let upiPaymentContext = null; // stores what to do after payment
let qrTimerInterval = null;
let qrSecondsLeft = 300;

const upiAppNames = {
  gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', bhim: 'BHIM UPI'
};
const upiAppLogos = {
  gpay: 'G', phonepe: 'Ph', paytm: 'P', bhim: 'B'
};

function generateTxnId() {
  return 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}

function openUpiModal(amount, title, onSuccess) {
  upiPaymentContext = { amount, title, onSuccess, txnId: generateTxnId(), method: null };

  document.getElementById('upiModalTitle').textContent = title;
  document.getElementById('upiOrderId').textContent = upiPaymentContext.txnId.slice(-8);
  document.getElementById('upiAmountDisplay').textContent = `₹${amount.toLocaleString()}`;
  document.getElementById('processingAmount').textContent = `₹${amount.toLocaleString()}`;
  document.getElementById('upiSuccessAmount').textContent = `₹${amount.toLocaleString()}`;
  document.getElementById('upiIdInput').value = '';

  // Reset steps
  document.getElementById('upiStep1').classList.remove('hidden');
  document.getElementById('upiStep2').classList.add('hidden');
  document.getElementById('upiStep3').classList.add('hidden');

  // QR Timer
  qrSecondsLeft = 300;
  clearInterval(qrTimerInterval);
  qrTimerInterval = setInterval(() => {
    qrSecondsLeft--;
    const m = String(Math.floor(qrSecondsLeft / 60)).padStart(2, '0');
    const s = String(qrSecondsLeft % 60).padStart(2, '0');
    const el = document.getElementById('qrTimer');
    if (el) el.textContent = `${m}:${s}`;
    if (qrSecondsLeft <= 0) clearInterval(qrTimerInterval);
  }, 1000);

  openModal('upiPaymentModal');
}

function closeUpiModal() {
  clearInterval(qrTimerInterval);
  closeModal('upiPaymentModal');
  upiPaymentContext = null;
}

function selectUpiApp(app) {
  if (!upiPaymentContext) return;
  upiPaymentContext.method = upiAppNames[app];
  startUpiProcessing(app);
}

function verifyAndPay() {
  const upiId = document.getElementById('upiIdInput').value.trim();
  if (!upiId || !upiId.includes('@')) {
    showToast('Please enter a valid UPI ID (e.g., name@upi)', 'error'); return;
  }
  upiPaymentContext.method = `UPI (${upiId})`;
  startUpiProcessing('custom');
}

function startUpiProcessing(app) {
  const appName = upiAppNames[app] || 'UPI';
  const logo = upiAppLogos[app] || '@';

  document.getElementById('processingAppLogo').textContent = logo;
  document.getElementById('processingSubtitle').textContent = `Connecting to ${appName}...`;
  document.getElementById('processingAppLogo').className = 'processing-app-logo ' + (app !== 'custom' ? app + '-logo-proc' : '');

  document.getElementById('upiStep1').classList.add('hidden');
  document.getElementById('upiStep2').classList.remove('hidden');

  ['procStep1','procStep2','procStep3'].forEach(id => {
    document.getElementById(id).className = 'proc-step pending';
  });
  document.getElementById('procStep1').className = 'proc-step active';

  setTimeout(() => {
    document.getElementById('procStep1').className = 'proc-step done';
    document.getElementById('procStep2').className = 'proc-step active';
    document.getElementById('processingSubtitle').textContent = 'Authenticating with your bank...';
  }, 1500);

  setTimeout(() => {
    document.getElementById('procStep2').className = 'proc-step done';
    document.getElementById('procStep3').className = 'proc-step active';
    document.getElementById('processingSubtitle').textContent = 'Confirming transaction...';
  }, 3000);

  setTimeout(() => {
    document.getElementById('procStep3').className = 'proc-step done';
    showUpiSuccess();
  }, 4500);
}

function showUpiSuccess() {
  clearInterval(qrTimerInterval);
  const ctx = upiPaymentContext;
  const now = new Date();

  document.getElementById('receiptTxnId').textContent = ctx.txnId;
  document.getElementById('receiptMethod').textContent = ctx.method;
  document.getElementById('receiptDateTime').textContent = now.toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  document.getElementById('upiStep2').classList.add('hidden');
  document.getElementById('upiStep3').classList.remove('hidden');
}

async function finalizeAfterPayment() {
  closeModal('upiPaymentModal');
  if (upiPaymentContext && upiPaymentContext.onSuccess) {
    await upiPaymentContext.onSuccess(upiPaymentContext.method, upiPaymentContext.txnId);
  }
  upiPaymentContext = null;
}

// Facility booking – payment first
function initiateBookingPayment() {
  if (!selectedSlot) { showToast('Please select a time slot', 'error'); return; }
  const date = document.getElementById('facilityDate').value;
  if (!date) { showToast('Please select a date', 'error'); return; }

  closeModal('facilityModal');
  openUpiModal(selectedFacility.price, `Book ${selectedFacility.name}`, async (method, txnId) => {
    try {
      const result = await api('/api/facilities/book', { method: 'POST', body: JSON.stringify({ facilityId: selectedFacility.id, slot: selectedSlot, date }) });
      showSuccess('Booking Confirmed!');
      showToast(`${selectedFacility.name} booked! Payment via ${method}`);
      
      // Show SMS notification on dashboard
      if (result.smsSent) {
        showToast('📱 SMS notification sent to your registered number!', 'info');
        showSmsBanner(result.smsMessage);
      }
      
      loadBookings();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function confirmBooking() {
  initiateBookingPayment();
}


async function loadBookings() {
  try {
    const bookings = await api('/api/facilities/bookings');
    const list = document.getElementById('bookingsList');
    if (!bookings.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No bookings yet. Book a facility to get started!</p></div>';
      return;
    }
    list.innerHTML = bookings.map(b => `
      <div class="booking-card">
        <div class="booking-card-info">
          <h4>${b.facilityName} – ${b.slot}</h4>
          <p>${formatDate(b.date)} • ₹${b.amount}</p>
        </div>
        <span class="booking-badge">${b.status}</span>
      </div>
    `).join('');
  } catch {}
}

// ============ BILLING ============
async function loadBilling() {
  try {
    const bills = await api('/api/bills');
    document.getElementById('billingGrid').innerHTML = bills.map(b => `
      <div class="bill-card ${b.status === 'paid' ? 'paid' : ''}" onclick="${b.status !== 'paid' ? `openPaymentModal('${b.id}')` : ''}">
        <div class="bill-icon">${b.icon}</div>
        <div class="bill-info">
          <h3>${b.name}</h3>
          <div class="bill-due">Due: ${formatDate(b.dueDate)}</div>
        </div>
        <div style="text-align:right">
          <div class="bill-amount">₹${b.amount.toLocaleString()}</div>
          <span class="bill-status ${b.status === 'paid' ? 'paid-status' : 'pending'}">${b.status === 'paid' ? '✓ Paid' : 'Pending'}</span>
        </div>
      </div>
    `).join('');
    loadPaymentHistory();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openPaymentModal(id) {
  if (!billsData.length) billsData = await api('/api/bills');
  selectedBill = billsData.find(b => b.id === id);
  if (!selectedBill || selectedBill.status === 'paid') return;

  openUpiModal(selectedBill.amount, `Pay: ${selectedBill.name}`, async (method, txnId) => {
    try {
      await api('/api/bills/pay', { method: 'POST', body: JSON.stringify({ billId: selectedBill.id, method }) });
      showSuccess('Payment Successful!');
      showToast(`₹${selectedBill.amount.toLocaleString()} paid via ${method}`);
      billsData = [];
      loadBilling();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function confirmPayment() {
  if (!selectedBill) return;
  const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'UPI';
  try {
    await api('/api/bills/pay', { method: 'POST', body: JSON.stringify({ billId: selectedBill.id, method }) });
    closeModal('paymentModal');
    showSuccess('Payment Successful!');
    showToast(`₹${selectedBill.amount.toLocaleString()} paid via ${method}`);
    billsData = [];
    loadBilling();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadPaymentHistory() {
  try {
    const payments = await api('/api/bills/history');
    const list = document.getElementById('paymentHistory');
    if (!payments.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>No payment history yet</p></div>';
      return;
    }
    list.innerHTML = payments.map(p => `
      <div class="payment-item">
        <div class="payment-item-info">
          <h4>${p.billName}</h4>
          <p>${formatDateTime(p.paidAt)} • ${p.method} • ${p.receiptNo}</p>
        </div>
        <div class="payment-item-amount">₹${p.amount.toLocaleString()}</div>
      </div>
    `).join('');
  } catch {}
}

// ============ MAINTENANCE ============
async function loadMaintenance() {
  try {
    const categories = await api('/api/maintenance/categories');
    document.getElementById('maintenanceCategories').innerHTML = categories.map(c => `
      <div class="maint-cat-card" onclick="openTicketWithCategory('${c.id}')">
        <div class="mc-icon">${c.icon}</div>
        <h3>${c.name}</h3>
        <p>${c.description}</p>
      </div>
    `).join('');

    const select = document.getElementById('ticketCategory');
    select.innerHTML = '<option value="">Select category</option>' + categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    loadTickets();
  } catch (err) { showToast(err.message, 'error'); }
}

function openNewTicketModal() {
  document.getElementById('ticketCategory').value = '';
  document.getElementById('ticketDescription').value = '';
  openModal('ticketModal');
}

function openTicketWithCategory(catId) {
  document.getElementById('ticketCategory').value = catId;
  document.getElementById('ticketDescription').value = '';
  openModal('ticketModal');
}

async function submitMaintenanceTicket() {
  const categoryId = document.getElementById('ticketCategory').value;
  const description = document.getElementById('ticketDescription').value.trim();
  const priority = document.querySelector('input[name="ticketPriority"]:checked')?.value || 'medium';

  if (!categoryId) { showToast('Please select a category', 'error'); return; }
  if (!description) { showToast('Please describe the issue', 'error'); return; }

  try {
    const result = await api('/api/maintenance/ticket', { method: 'POST', body: JSON.stringify({ categoryId, description, priority }) });
    closeModal('ticketModal');
    showSuccess('Ticket Submitted!');
    showToast('Maintenance ticket raised successfully!');
    
    // Show SMS notification
    if (result.smsSent) {
      showToast('📱 SMS notification sent to management!', 'info');
      showSmsBanner(result.smsMessage);
    }
    
    loadTickets();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadTickets() {
  try {
    const tickets = await api('/api/maintenance/tickets');
    const list = document.getElementById('ticketsList');
    if (!tickets.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔧</div><p>No maintenance tickets yet</p></div>';
      return;
    }
    list.innerHTML = tickets.map(t => `
      <div class="ticket-card">
        <div class="ticket-header">
          <h4>${t.categoryIcon} ${t.categoryName} – ${t.ticketNo}</h4>
          <span class="ticket-status ${t.status}">${t.status.replace('-', ' ')}</span>
        </div>
        <div class="ticket-desc">${t.description}</div>
        <div class="ticket-footer">
          <span class="ticket-meta">Flat ${t.flat} • ${formatDateTime(t.createdAt)}</span>
          ${t.status !== 'resolved' ? `<button class="btn btn-primary ticket-action" onclick="updateTicketStatus('${t.id}')">Update Status</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch {}
}

async function updateTicketStatus(id) {
  try {
    const result = await api(`/api/maintenance/ticket/${id}`, { method: 'PATCH' });
    showToast(result.message);
    loadTickets();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============ EMERGENCY ============
async function loadEmergency() {
  try {
    const contacts = await api('/api/emergency/contacts');
    document.getElementById('emergencyGrid').innerHTML = contacts.map(c => `
      <div class="emergency-card" style="border-bottom: 3px solid ${c.color}" onclick="callEmergency('${c.type}', '${c.number}')">
        <div class="ec-icon">${c.icon}</div>
        <h3>${c.type}</h3>
        <p>${c.description}</p>
        <div class="ec-number" style="color:${c.color}">${c.number}</div>
      </div>
    `).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

function callEmergency(type, number) {
  showToast(`Calling ${type} at ${number}...`, 'info');
}

async function triggerPanic() {
  try {
    await api('/api/emergency/alert', { method: 'POST', body: JSON.stringify({ type: 'Panic', message: 'Emergency panic button pressed!' }) });
    showSuccess('Alert Sent!');
    showToast('Emergency alert sent to security and management!', 'info');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============ PARKING ============
async function loadParking() {
  try {
    const slots = await api('/api/parking');
    document.getElementById('parkingGrid').innerHTML = slots.map(s => `
      <div class="parking-card ${s.status}" onclick="${s.status === 'available' ? `openParkingModal('${s.id}', '${s.slot}', '${s.type}')` : ''}">
        <div class="pc-slot">${s.slot}</div>
        <div class="pc-type">${s.type}</div>
        <span class="pc-status ${s.status}">${s.status}</span>
        ${s.vehicle ? `<div class="pc-vehicle">${s.vehicle}</div>` : ''}
      </div>
    `).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

function openParkingModal(id, slot, type) {
  selectedParkingSlot = id;
  document.getElementById('parkingSlotName').textContent = slot;
  document.getElementById('parkingSlotType').textContent = type;
  document.getElementById('vehicleNumber').value = '';
  openModal('parkingModal');
}

async function confirmParkingBooking() {
  const vehicleNumber = document.getElementById('vehicleNumber').value.trim();
  if (!vehicleNumber) { showToast('Please enter vehicle number', 'error'); return; }

  try {
    await api('/api/parking/book', { method: 'POST', body: JSON.stringify({ slotId: selectedParkingSlot, vehicleNumber }) });
    closeModal('parkingModal');
    showSuccess('Slot Booked!');
    showToast('Parking slot booked successfully!');
    loadParking();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============ NEW FEATURES ============
async function loadChildSafety() {
  const card = document.getElementById('childStatusCard');
  if (card) {
    card.className = 'status-card safe';
    document.getElementById('childStatusIcon').textContent = '🛡️';
    document.getElementById('childStatusText').textContent = 'Status: SAFE';
  }
}

async function markChildMissing() {
  try {
    await api('/api/child-safety/alert', { method: 'POST' });
    const card = document.getElementById('childStatusCard');
    card.className = 'status-card missing';
    document.getElementById('childStatusIcon').textContent = '🚨';
    document.getElementById('childStatusText').textContent = 'Status: MISSING';
    showToast('Emergency alert sent to all neighbors!', 'error');
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadCommunity() {
  try {
    const data = await api('/api/skills');
    document.getElementById('skillsGrid').innerHTML = data.map(s => `
      <div class="skill-card">
        <div class="skill-header">
          <span class="skill-title">${s.skill}</span>
          <span class="ticket-meta">Flat ${s.flat}</span>
        </div>
        <p style="font-size: 13px;">${s.desc}</p>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">By: ${s.user}</div>
      </div>
    `).join('');
  } catch(e) { showToast(e.message, 'error'); }
}

async function submitSkill() {
  const skill = document.getElementById('skillType').value;
  const desc = document.getElementById('skillDesc').value.trim();
  if(!desc) { showToast('Please enter a description', 'error'); return; }
  try {
    await api('/api/skills', { method: 'POST', body: JSON.stringify({skill, desc}) });
    closeModal('addSkillModal');
    showSuccess('Skill Added!');
    document.getElementById('skillDesc').value = '';
    loadCommunity();
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadEvents() {
  try {
    const data = await api('/api/events');
    document.getElementById('eventsList').innerHTML = data.map(e => {
      const d = new Date(e.date);
      return `
      <div class="event-card">
        <div class="event-date-box">
          <div class="event-day">${d.getDate()}</div>
          <div class="event-month">${d.toLocaleString('default', { month: 'short' })}</div>
        </div>
        <div class="event-info">
          <h3>${e.title}</h3>
          <p style="font-size: 13px; color: var(--text-secondary);">${e.desc}</p>
        </div>
      </div>
    `}).join('');
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadAdminDash() {
  try {
    const data = await api('/api/admin/dashboard');
    document.getElementById('adminTotalUsers').textContent = data.totalUsers;
    document.getElementById('adminTotalComplaints').textContent = data.totalComplaints;
    document.getElementById('adminTotalPayments').textContent = '₹' + data.totalPayments.toLocaleString();
    
    document.getElementById('adminComplaintsList').innerHTML = data.recentComplaints.map(c => `
      <div class="admin-list-item">
        <span><strong>${c.categoryName}</strong> (${c.flat})</span>
        <span class="ticket-status ${c.status}">${c.status.replace('-', ' ')}</span>
      </div>
    `).join('') || '<p style="padding:16px;">No complaints</p>';

    document.getElementById('adminPaymentsList').innerHTML = data.recentPayments.map(p => `
      <div class="admin-list-item">
        <span><strong>₹${p.amount.toLocaleString()}</strong> from Flat ${p.flat}</span>
        <span style="font-size: 11px; font-weight: 600; color: var(--success);">${p.method}</span>
      </div>
    `).join('') || '<p style="padding:16px;">No payments</p>';
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadVisitor() {
  try {
    const data = await api('/api/visitors');
    document.getElementById('visitorList').innerHTML = data.map(v => `
      <div class="booking-card" style="margin-bottom: 12px;">
        <div class="booking-card-info">
          <h4>${v.name}</h4>
          <p>${v.type} • Expected Date: ${v.date}</p>
        </div>
        <span class="booking-badge">${v.status}</span>
      </div>
    `).join('') || '<p>No expected visitors.</p>';
  } catch(e) { showToast(e.message, 'error'); }
}

async function submitVisitor() {
  const name = document.getElementById('visitorName').value.trim();
  const type = document.getElementById('visitorType').value;
  if(!name) return showToast('Enter visitor name', 'error');
  try {
    await api('/api/visitors', { method: 'POST', body: JSON.stringify({name, type}) });
    closeModal('visitorModal');
    showSuccess('Visitor Approved!');
    document.getElementById('visitorName').value = '';
    loadVisitor();
  } catch(e) { showToast(e.message, 'error'); }
}

function loadAiHelp() {
  document.getElementById('aiInput').value = '';
  document.getElementById('navInput').value = '';
  document.getElementById('aiResult').classList.add('hidden');
  document.getElementById('navResult').classList.add('hidden');
}

function getAiSuggestion() {
  const query = document.getElementById('aiInput').value.toLowerCase();
  if(!query) return;
  const resBox = document.getElementById('aiResult');
  let response = "I'm not sure. Please contact the Admin Office.";
  
  if(query.includes('water') || query.includes('leak') || query.includes('plumb')) response = "Water issue detected -> Contact plumber via Maintenance tab or call Helpdesk.";
  if(query.includes('fire') || query.includes('smoke')) response = "Emergency detected -> Call Fire Department (101) or trigger Panic Button in Emergency tab!";
  if(query.includes('electric') || query.includes('light') || query.includes('power')) response = "Electrical issue detected -> Raise a ticket in Maintenance tab.";
  if(query.includes('visitor') || query.includes('guest')) response = "Use the Visitor & Delivery tab to pre-approve your guests.";

  resBox.innerHTML = `<strong>Suggestion:</strong> ${response}`;
  resBox.classList.remove('hidden');
}

function getNavigation() {
  const query = document.getElementById('navInput').value.toLowerCase();
  if(!query) return;
  const resBox = document.getElementById('navResult');
  let response = "Location not found in the directory.";
  
  if(query.includes('swim') || query.includes('pool')) response = "Swimming Pool → Block B → Ground Floor";
  if(query.includes('gym') || query.includes('fitness')) response = "Gymnasium → Block A → 1st Floor";
  if(query.includes('party') || query.includes('hall')) response = "Party Hall → Clubhouse → 2nd Floor";
  if(query.includes('tennis')) response = "Tennis Court → Outdoor Sports Area";

  resBox.innerHTML = `<strong>Location:</strong> ${response}`;
  resBox.classList.remove('hidden');
}

function loadChat() {
  const chatMsg = document.getElementById('chatMessages');
  chatMsg.innerHTML = '<div class="chat-msg received">Hello! How can we help you today?</div>';
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(!msg) return;
  
  const chatMsg = document.getElementById('chatMessages');
  chatMsg.innerHTML += `<div class="chat-msg sent">${msg}</div>`;
  input.value = '';
  
  chatMsg.scrollTop = chatMsg.scrollHeight;
  
  setTimeout(() => {
    chatMsg.innerHTML += `<div class="chat-msg received">We have received your message and will get back to you shortly.</div>`;
    chatMsg.scrollTop = chatMsg.scrollHeight;
  }, 1000);
}

let historyData = null;
async function loadHistory() {
  try {
    historyData = await api('/api/history');
    switchHistoryTab('bookings');
  } catch(e) { showToast(e.message, 'error'); }
}

function switchHistoryTab(tab) {
  document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const area = document.getElementById('historyContentArea');
  
  if(!historyData) return;
  
  if(tab === 'bookings') {
    area.innerHTML = historyData.bookings.map(b => `
      <div class="history-item">
        <div><strong>${b.facilityName}</strong> (${b.slot})</div>
        <div style="font-size:12px; color:var(--text-secondary)">${formatDate(b.date)} • ₹${b.amount} • <span style="color:var(--success)">${b.status}</span></div>
      </div>
    `).join('') || '<p>No booking history</p>';
  } else if (tab === 'payments') {
    area.innerHTML = historyData.payments.map(p => `
      <div class="history-item">
        <div><strong>${p.billName}</strong> • ₹${p.amount}</div>
        <div style="font-size:12px; color:var(--text-secondary)">${formatDateTime(p.paidAt)} • ${p.method} • ${p.receiptNo}</div>
      </div>
    `).join('') || '<p>No payment history</p>';
  } else {
    area.innerHTML = historyData.complaints.map(c => `
      <div class="history-item">
        <div><strong>${c.categoryName}</strong> (${c.ticketNo})</div>
        <div style="font-size:12px; color:var(--text-secondary)">${formatDateTime(c.createdAt)} • Status: <span class="ticket-status ${c.status}">${c.status}</span></div>
      </div>
    `).join('') || '<p>No complaint history</p>';
  }
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', () => {
  // Preloader
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    preloader.classList.add('fade-out');
    setTimeout(() => preloader.style.display = 'none', 500);
  }, 1800);

  // Check auth
  checkAuth();

  // Enter key on login
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUsername').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPassword').focus();
  });
});
