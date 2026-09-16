// ============ CONFIGURATION ============
const API_BASE = 'http://localhost:3000/api'; // Connect Apartment API

// ============ STATE ============
let state = {
  token: localStorage.getItem('adminToken') || null,
  user: null,
  bookings: [],
  tickets: [],
  adminDash: {},
  currentPage: 'overview',
  refreshInterval: null
};

// ============ INIT ============
window.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);

  if (state.token) {
    verifyAndLoad();
  }
});

function updateClock() {
  const el = document.getElementById('topbarTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============ AUTH ============
async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginErr');

  errEl.classList.add('hidden');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed');
    if (data.user.role !== 'admin') throw new Error('Access denied. Admin only.');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('adminToken', data.token);

    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

// Allow Enter key on login form
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
    doLogin();
  }
});

async function verifyAndLoad() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader() });
    if (!res.ok) throw new Error();
    const user = await res.json();
    if (user.role !== 'admin') throw new Error();
    state.user = user;
    showApp();
  } catch {
    state.token = null;
    localStorage.removeItem('adminToken');
  }
}

function doLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('adminToken');
  if (state.refreshInterval) clearInterval(state.refreshInterval);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  showToast('Signed out successfully', 'info');
}

function authHeader() {
  return { 'Authorization': `Bearer ${state.token}`, 'Content-Type': 'application/json' };
}

// ============ APP SHELL ============
function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Set admin info
  if (state.user) {
    document.getElementById('adminName').textContent = state.user.name;
    document.getElementById('adminAvatar').textContent = state.user.avatar || state.user.name[0];
  }

  refreshAll();

  // Auto-refresh every 10 seconds
  if (state.refreshInterval) clearInterval(state.refreshInterval);
  state.refreshInterval = setInterval(refreshAll, 10000);
}

// ============ DATA FETCHING ============
async function refreshAll() {
  const btn = document.querySelector('.refresh-btn');
  if (btn) btn.classList.add('spinning');

  try {
    await Promise.all([
      fetchAdminDash(),
      fetchAllBookings(),
      fetchAllTickets()
    ]);
    renderCurrentPage();
  } catch (err) {
    showToast('Failed to refresh data: ' + err.message, 'error');
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

async function fetchAdminDash() {
  const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load dashboard');
  state.adminDash = await res.json();
}

async function fetchAllBookings() {
  // Admin sees all bookings — we use the admin dashboard data
  // Also try to get all bookings from a general endpoint
  try {
    const res = await fetch(`${API_BASE}/admin/bookings`, { headers: authHeader() });
    if (res.ok) {
      state.bookings = await res.json();
      return;
    }
  } catch {}
  // Fallback: use recentComplaints from admin dashboard (we know the structure)
  // We store whatever we have
}

async function fetchAllTickets() {
  try {
    const res = await fetch(`${API_BASE}/admin/tickets`, { headers: authHeader() });
    if (res.ok) {
      state.tickets = await res.json();
      return;
    }
  } catch {}
  // Use data from admin dashboard fallback
  if (state.adminDash.recentComplaints) {
    state.tickets = state.adminDash.recentComplaints;
  }
}

// ============ PAGE NAVIGATION ============
function showPage(page) {
  state.currentPage = page;

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Update page title
  const titles = { overview: 'Overview', bookings: 'Bookings', tickets: 'Maintenance Tickets', residents: 'Residents' };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Show/hide sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  const section = document.getElementById(`page-${page}`);
  if (section) section.classList.remove('hidden');

  renderCurrentPage();
}

function renderCurrentPage() {
  switch (state.currentPage) {
    case 'overview':   renderOverview();   break;
    case 'bookings':   renderBookings();   break;
    case 'tickets':    renderTickets();    break;
    case 'residents':  renderResidents();  break;
  }
  updateBadges();
}

// ============ OVERVIEW ============
function renderOverview() {
  const dash = state.adminDash;

  // Stats
  animateNumber('totalBookings', dash.totalBookings || state.bookings.length || 0);
  animateNumber('totalTickets', dash.totalComplaints || state.tickets.length || 0);
  animateNumber('totalResidents', dash.totalUsers || 2);
  document.getElementById('totalRevenue').textContent = '₹' + (dash.totalPayments || 0).toLocaleString('en-IN');

  // Bookings table (recent 5)
  const bookingsTbody = document.getElementById('overviewBookingsTbody');
  const allBookings = state.bookings.length ? state.bookings : (dash.recentPayments || []);
  if (!allBookings.length) {
    bookingsTbody.innerHTML = `<tr class="empty-row"><td colspan="4">No bookings yet</td></tr>`;
  } else {
    bookingsTbody.innerHTML = allBookings.slice(0, 5).map(b => `
      <tr>
        <td><strong>${b.userName || b.name || '—'}</strong><br><span style="font-size:11px;color:var(--text-muted)">Flat ${b.flat || '—'}</span></td>
        <td>${b.facilityName || b.billName || '—'}</td>
        <td>${b.date ? formatDate(b.date) : (b.paidAt ? formatDate(b.paidAt) : '—')}</td>
        <td><span class="badge badge-${(b.status || 'confirmed').toLowerCase()}">${b.status || 'confirmed'}</span></td>
      </tr>
    `).join('');
  }

  // Tickets table (recent 5)
  const ticketsTbody = document.getElementById('overviewTicketsTbody');
  const tickets = state.tickets.length ? state.tickets : (dash.recentComplaints || []);
  if (!tickets.length) {
    ticketsTbody.innerHTML = `<tr class="empty-row"><td colspan="4">No tickets yet</td></tr>`;
  } else {
    ticketsTbody.innerHTML = tickets.slice(0, 5).map(t => `
      <tr>
        <td><strong>${t.userName || '—'}</strong></td>
        <td>${t.categoryName || '—'}</td>
        <td><span class="badge badge-${t.priority || 'medium'}">${t.priority || 'medium'}</span></td>
        <td><span class="badge badge-${(t.status || '').replace(' ', '-')}">${t.status || '—'}</span></td>
      </tr>
    `).join('');
  }
}

// ============ BOOKINGS PAGE ============
function renderBookings() {
  const dash = state.adminDash;
  const allBookings = state.bookings.length ? state.bookings : [];
  updateBookingsTable(allBookings);
  document.getElementById('bookingsBadge').textContent = allBookings.length;
}

function updateBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTbody');
  const empty = document.getElementById('bookingsEmpty');

  if (!bookings.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>${b.userName || '—'}</strong></td>
      <td>Flat ${b.flat || '—'}</td>
      <td>${b.facilityName || '—'}</td>
      <td>${b.date ? formatDate(b.date) : '—'}</td>
      <td><span style="font-size:12px;color:var(--text-muted)">${b.slot || '—'}</span></td>
      <td style="color:var(--emerald);font-weight:600">₹${(b.amount || 0).toLocaleString('en-IN')}</td>
      <td><span class="badge badge-${(b.status || 'confirmed').toLowerCase().replace(' ', '-')}">${b.status || 'confirmed'}</span></td>
      <td style="font-size:11px;color:var(--text-muted)">${b.createdAt ? formatDateTime(b.createdAt) : '—'}</td>
    </tr>
  `).join('');
}

function filterBookings() {
  const q = document.getElementById('bookingsSearch').value.toLowerCase();
  const filtered = state.bookings.filter(b =>
    (b.userName || '').toLowerCase().includes(q) ||
    (b.facilityName || '').toLowerCase().includes(q) ||
    (b.flat || '').toLowerCase().includes(q) ||
    (b.slot || '').toLowerCase().includes(q)
  );
  updateBookingsTable(filtered);
}

// ============ TICKETS PAGE ============
function renderTickets() {
  const tickets = state.tickets.length ? state.tickets : (state.adminDash.recentComplaints || []);
  updateTicketsTable(tickets);
  const openCount = tickets.filter(t => t.status !== 'resolved').length;
  document.getElementById('ticketsBadge').textContent = openCount;
}

function updateTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsTbody');
  const empty = document.getElementById('ticketsEmpty');

  if (!tickets.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = tickets.map(t => {
    let actionBtn = '';
    if (t.status === 'open') actionBtn = `<button class="action-btn btn-progress" onclick="updateTicket('${t.id}', 'in-progress')">▶ Progress</button>`;
    else if (t.status === 'in-progress') actionBtn = `<button class="action-btn btn-resolve" onclick="updateTicket('${t.id}', 'resolved')">✓ Resolve</button>`;
    else actionBtn = `<span class="action-btn btn-done">✓ Done</span>`;

    return `
      <tr>
        <td><code style="font-size:11px;color:var(--purple)">${t.ticketNo || '—'}</code></td>
        <td><strong>${t.userName || '—'}</strong></td>
        <td>Flat ${t.flat || '—'}</td>
        <td>${t.categoryName || '—'}</td>
        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${t.description || ''}">${t.description || '—'}</td>
        <td><span class="badge badge-${t.priority || 'medium'}">${t.priority || 'medium'}</span></td>
        <td><span class="badge badge-${(t.status || '').replace(' ', '-')}">${t.status || '—'}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function filterTickets() {
  const q = document.getElementById('ticketsSearch').value.toLowerCase();
  const statusFilter = document.getElementById('ticketStatusFilter').value;
  let tickets = state.tickets.length ? state.tickets : (state.adminDash.recentComplaints || []);
  if (statusFilter) tickets = tickets.filter(t => t.status === statusFilter);
  if (q) tickets = tickets.filter(t =>
    (t.userName || '').toLowerCase().includes(q) ||
    (t.categoryName || '').toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q) ||
    (t.ticketNo || '').toLowerCase().includes(q)
  );
  updateTicketsTable(tickets);
}

async function updateTicket(ticketId, action) {
  try {
    // We try the admin update endpoint; fallback to resident endpoint
    const res = await fetch(`${API_BASE}/maintenance/ticket/${ticketId}`, {
      method: 'PATCH',
      headers: authHeader()
    });
    if (res.ok) {
      const data = await res.json();
      // Update in state
      const idx = state.tickets.findIndex(t => t.id === ticketId);
      if (idx !== -1) state.tickets[idx] = data.ticket;
      renderTickets();
      showToast(`Ticket moved to ${data.ticket.status}`, 'success');
    } else {
      showToast('Could not update ticket', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ============ RESIDENTS PAGE ============
function renderResidents() {
  const residents = [
    { name: 'Meeran', flat: '105-I', avatar: 'M', role: 'Resident', bookings: state.bookings.filter(b => b.flat === '105-I').length, tickets: state.tickets.filter(t => t.flat === '105-I').length },
    { name: 'Jeeva', flat: '210-B', avatar: 'J', role: 'Resident', bookings: state.bookings.filter(b => b.flat === '210-B').length, tickets: state.tickets.filter(t => t.flat === '210-B').length }
  ];

  const grid = document.getElementById('residentsGrid');
  grid.innerHTML = residents.map((r, i) => `
    <div class="resident-card" style="animation-delay:${i * 0.1}s">
      <div class="resident-avatar">${r.avatar}</div>
      <div>
        <div class="resident-name">${r.name}</div>
        <div class="resident-flat">Flat ${r.flat} · ${r.role}</div>
        <div class="resident-stats">
          <span class="resident-stat">📅 ${r.bookings} Bookings</span>
          <span class="resident-stat">🔧 ${r.tickets} Tickets</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ============ BADGES ============
function updateBadges() {
  const allBookings = state.bookings.length ? state.bookings : [];
  const allTickets = state.tickets.length ? state.tickets : (state.adminDash.recentComplaints || []);
  document.getElementById('bookingsBadge').textContent = allBookings.length;
  document.getElementById('ticketsBadge').textContent = allTickets.filter(t => t.status !== 'resolved').length;
}

// ============ UTILITIES ============
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const diff = target - current;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(current + (diff * step / steps));
    if (step >= steps) { clearInterval(timer); el.textContent = target; }
  }, 20);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
