const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'connect-apartment-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files only when running locally (Vercel handles this via rewrites)
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/admin-portal', express.static(path.join(__dirname, '..', 'admin-portal')));
}

// ============ IN-MEMORY DATABASE ============

const users = [
  { id: '1', username: 'meeran', password: '$2b$10$1YGn36S1znegC/V4siuM3ugO2DJC1n75Ow3E/a6reVYhEaP1jIQT.', name: 'Meeran', flat: '105-I', role: 'resident', avatar: 'M' },
  { id: '2', username: 'jeeva', password: '$2b$10$rwA.fVUA7f/yBWAX1HsDPu8/tEltTYRlGtNmnMdaT379sOdOW48be', name: 'Jeeva', flat: '210-B', role: 'resident', avatar: 'J' },
  { id: '3', username: 'admin', password: '$2b$10$tbWS2BfJj/BBOJVWNYHxeOWT5Mbbak3sHoXoWW39leKan7n3x03Jq', name: 'Admin', flat: 'Office', role: 'admin', avatar: 'A' }
];

const facilities = [
  { id: 'f1', name: 'Swimming Pool', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M2 18h20"/><path d="M12 2v8"/><path d="M8 6h8"/></svg>', description: 'Olympic-size heated pool', price: 200, slots: ['6:00 – 7:00 AM', '7:00 – 8:00 AM', '8:00 – 9:00 AM', '5:00 – 6:00 PM', '6:00 – 7:00 PM'] },
  { id: 'f2', name: 'Gymnasium', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14"/><path d="M18 5v14"/><path d="M2 16h4"/><path d="M2 8h4"/><path d="M18 16h4"/><path d="M18 8h4"/><path d="M6 12h12"/></svg>', description: 'Fully equipped modern gym', price: 150, slots: ['6:00 – 7:00 AM', '7:00 – 8:00 AM', '9:00 – 10:00 AM', '4:00 – 5:00 PM', '5:00 – 6:00 PM', '6:00 – 7:00 PM'] },
  { id: 'f3', name: 'Tennis Court', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>', description: 'Professional tennis court', price: 300, slots: ['6:00 – 7:00 AM', '7:00 – 8:00 AM', '4:00 – 5:00 PM', '5:00 – 6:00 PM'] },
  { id: 'f4', name: 'Party Hall', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>', description: 'Elegant banquet hall for events', price: 2000, slots: ['10:00 AM – 1:00 PM', '2:00 – 5:00 PM', '6:00 – 10:00 PM'] },
  { id: 'f5', name: 'Guest Room', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M2 8h20"/><path d="M6 4v4"/><path d="M10 4v4"/><path d="M14 4v4"/><path d="M18 4v4"/></svg>', description: 'Comfortable guest accommodation', price: 500, slots: ['Room 101', 'Room 102', 'Room 103', 'Suite 201'] }
];

let bookings = [];

const billTypes = [
  { id: 'b1', name: 'Rent Payment', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', amount: 15000, dueDate: '2026-04-05', status: 'pending' },
  { id: 'b2', name: 'Maintenance Charges', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', amount: 3500, dueDate: '2026-04-10', status: 'pending' },
  { id: 'b3', name: 'Electricity Bill', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', amount: 2200, dueDate: '2026-04-15', status: 'pending' },
  { id: 'b4', name: 'Water Bill', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>', amount: 800, dueDate: '2026-04-15', status: 'pending' },
  { id: 'b5', name: 'Gas Connection', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>', amount: 950, dueDate: '2026-04-20', status: 'pending' },
  { id: 'b6', name: 'Parking Fee', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><path d="M9 16V8h4a2 2 0 0 1 0 4H9"/></svg>', amount: 1500, dueDate: '2026-04-05', status: 'paid' }
];

let payments = [];

const maintenanceCategories = [
  { id: 'm1', name: 'Plumbing', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>', description: 'Water leaks, pipe issues, drainage' },
  { id: 'm2', name: 'Electrical', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', description: 'Wiring, switches, power issues' },
  { id: 'm3', name: 'Elevator', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="8 12 12 8 16 12"/><polyline points="8 16 12 20 16 16"/></svg>', description: 'Lift malfunction, door issues' },
  { id: 'm4', name: 'Cleaning', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10 3a10 10 0 0 1 10 10"/><path d="M3 10a10 10 0 0 1 10-10"/></svg>', description: 'Common area cleaning requests' },
  { id: 'm5', name: 'Pest Control', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M8.5 8.5L7 7"/><path d="M15.5 8.5L17 7"/><path d="M15.5 15.5L17 17"/><path d="M8.5 15.5L7 17"/><path d="M12 7V5"/><path d="M12 19v-2"/><path d="M7 12H5"/><path d="M19 12h-2"/></svg>', description: 'Pest and rodent treatment' },
  { id: 'm6', name: 'Civil Work', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9L12 2l9 7"/></svg>', description: 'Wall cracks, painting, flooring' }
];

let maintenanceTickets = [];

const emergencyContacts = [
  { id: 'e1', type: 'Fire', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>', number: '101', description: 'Fire Department', color: '#ff4444' },
  { id: 'e2', type: 'Medical', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', number: '108', description: 'Ambulance Service', color: '#44aaff' },
  { id: 'e3', type: 'Police', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>', number: '100', description: 'Police Department', color: '#4444ff' },
  { id: 'e4', type: 'Security', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', number: '9876543210', description: 'Apartment Security', color: '#44cc44' },
  { id: 'e5', type: 'Gas Leak', icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>', number: '1906', description: 'Gas Emergency', color: '#ffaa44' }
];

let emergencyAlerts = [];

let parkingSlots = [
  { id: 'p1', slot: 'A-01', type: 'Car', status: 'available', flat: null, vehicle: null },
  { id: 'p2', slot: 'A-02', type: 'Car', status: 'occupied', flat: '105-I', vehicle: 'TN 01 AB 1234' },
  { id: 'p3', slot: 'A-03', type: 'Car', status: 'available', flat: null, vehicle: null },
  { id: 'p4', slot: 'B-01', type: 'Bike', status: 'available', flat: null, vehicle: null },
  { id: 'p5', slot: 'B-02', type: 'Bike', status: 'occupied', flat: '210-B', vehicle: 'TN 02 CD 5678' },
  { id: 'p6', slot: 'B-03', type: 'Bike', status: 'available', flat: null, vehicle: null },
  { id: 'p7', slot: 'C-01', type: 'Car', status: 'reserved', flat: '312-A', vehicle: 'TN 03 EF 9012' },
  { id: 'p8', slot: 'C-02', type: 'Car', status: 'available', flat: null, vehicle: null },
  { id: 'p9', slot: 'V-01', type: 'Visitor', status: 'available', flat: null, vehicle: null },
  { id: 'p10', slot: 'V-02', type: 'Visitor', status: 'available', flat: null, vehicle: null }
];

let announcements = [
  { id: 'a1', title: 'Water Tank Cleaning', message: 'Water supply will be disrupted on April 2nd from 9 AM to 1 PM.', date: '2026-03-30', priority: 'high' },
  { id: 'a2', title: 'Annual General Meeting', message: 'AGM scheduled for April 5th at 6 PM in the Community Hall.', date: '2026-03-28', priority: 'medium' },
  { id: 'a3', title: 'New Gym Equipment', message: 'New treadmills and weight sets have been installed in the gym.', date: '2026-03-25', priority: 'low' }
];

let skills = [
  { id: 's1', user: 'Meeran', flat: '105-I', skill: 'Tutor 📚', desc: 'Math & Science for Grade 8-10' },
  { id: 's2', user: 'Jeeva', flat: '210-B', skill: 'Electrician ⚡', desc: 'Available for weekend repairs' }
];

let communityEvents = [
  { id: 'ev1', title: 'Diwali Celebration 🎉', date: '2026-10-24', desc: 'Join us in the central courtyard for fireworks and sweets!' },
  { id: 'ev2', title: 'Monthly Association Meeting 📢', date: '2026-05-10', desc: 'Discussing maintenance updates and security protocols.' },
  { id: 'ev3', title: 'Yoga Workshop 🧘', date: '2026-05-15', desc: 'Free morning yoga session by Mrs. Sharma in the party hall.' }
];

let visitors = [
  { id: 'v1', name: 'Ramesh (Electrician)', type: 'Service', flat: '105-I', date: '2026-05-04', entryTime: '10:30 AM', exitTime: null, status: 'Expected' },
  { id: 'v2', name: 'Priya (Guest)', type: 'Guest', flat: '210-B', date: '2026-05-04', entryTime: '2:00 PM', exitTime: '5:00 PM', status: 'Exited' }
];

// Workers (needed for ticket assignment in admin portal)
let workers = [
  { id: 'w1', name: 'Ravi', role: 'Electrician', phone: '9876500001', status: 'available', assignedTicket: null, joinedAt: '2025-01-10' },
  { id: 'w2', name: 'Kumar', role: 'Plumber', phone: '9876500002', status: 'available', assignedTicket: null, joinedAt: '2025-03-15' },
  { id: 'w3', name: 'Selvam', role: 'Cleaner', phone: '9876500003', status: 'busy', assignedTicket: null, joinedAt: '2024-11-20' },
  { id: 'w4', name: 'Murugan', role: 'Security Guard', phone: '9876500004', status: 'available', assignedTicket: null, joinedAt: '2025-02-01' },
  { id: 'w5', name: 'Senthil', role: 'Elevator Tech', phone: '9876500005', status: 'available', assignedTicket: null, joinedAt: '2025-04-05' }
];

// ============ MIDDLEWARE ============

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ============ SMS HELPER (Simulated) ============
const NOTIFY_PHONE = '9629331706';

async function sendSMS(phone, message) {
  console.log(`\n📱 [SIMULATED SMS to ${phone}]`);
  console.log(`💬 Message: ${message}\n`);
  return true;
}

// ============ AUTH ROUTES ============

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, flat: user.flat, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, flat: user.flat, role: user.role, avatar: user.avatar } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, username: user.username, flat: user.flat, role: user.role, avatar: user.avatar });
});

// ============ DASHBOARD ROUTES ============

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const userBookings = bookings.filter(b => b.userId === req.user.id);
  const userTickets = maintenanceTickets.filter(t => t.userId === req.user.id);
  const pendingBills = billTypes.filter(b => b.status === 'pending');

  res.json({
    totalBookings: userBookings.length,
    activeTickets: userTickets.filter(t => t.status !== 'resolved').length,
    pendingBills: pendingBills.length,
    pendingAmount: pendingBills.reduce((sum, b) => sum + b.amount, 0),
    announcements: announcements.slice(0, 3)
  });
});

// ============ FACILITY ROUTES ============

app.get('/api/facilities', authenticateToken, (req, res) => {
  res.json(facilities);
});

app.post('/api/facilities/book', authenticateToken, async (req, res) => {
  const { facilityId, slot, date } = req.body;
  const facility = facilities.find(f => f.id === facilityId);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });

  const existing = bookings.find(b => b.facilityId === facilityId && b.slot === slot && b.date === date && b.status !== 'cancelled');
  if (existing) return res.status(400).json({ error: 'Slot already booked' });

  const booking = {
    id: uuidv4(),
    facilityId,
    facilityName: facility.name,
    slot,
    date,
    amount: facility.price,
    userId: req.user.id,
    userName: req.user.name,
    flat: req.user.flat,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);

  const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const smsMessage = `Connect Apartment: ${facility.name} booked by ${req.user.name} (Flat ${req.user.flat}) on ${formattedDate}, Slot: ${slot}. Amount: ₹${facility.price}`;
  const smsSent = await sendSMS(NOTIFY_PHONE, smsMessage);

  res.json({ message: 'Booking confirmed!', booking, smsSent, smsMessage });
});

app.get('/api/facilities/bookings', authenticateToken, (req, res) => {
  const userBookings = bookings.filter(b => b.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userBookings);
});

// ============ BILLING ROUTES ============

app.get('/api/bills', authenticateToken, (req, res) => {
  res.json(billTypes);
});

app.post('/api/bills/pay', authenticateToken, (req, res) => {
  const { billId, method } = req.body;
  const bill = billTypes.find(b => b.id === billId);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  if (bill.status === 'paid') return res.status(400).json({ error: 'Bill already paid' });

  const payment = {
    id: uuidv4(),
    billId: bill.id,
    billName: bill.name,
    amount: bill.amount,
    method,
    userId: req.user.id,
    userName: req.user.name,
    flat: req.user.flat,
    paidAt: new Date().toISOString(),
    receiptNo: 'RCP-' + Date.now().toString(36).toUpperCase()
  };
  payments.push(payment);
  bill.status = 'paid';
  res.json({ message: 'Payment successful!', payment });
});

app.get('/api/bills/history', authenticateToken, (req, res) => {
  const userPayments = payments.filter(p => p.userId === req.user.id).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  res.json(userPayments);
});

// ============ MAINTENANCE ROUTES ============

app.get('/api/maintenance/categories', authenticateToken, (req, res) => {
  res.json(maintenanceCategories);
});

app.post('/api/maintenance/ticket', authenticateToken, async (req, res) => {
  const { categoryId, description, priority } = req.body;
  const category = maintenanceCategories.find(c => c.id === categoryId);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const ticket = {
    id: uuidv4(),
    ticketNo: 'TKT-' + Date.now().toString(36).toUpperCase(),
    categoryId,
    categoryName: category.name,
    categoryIcon: category.icon,
    description,
    priority: priority || 'medium',
    status: 'open',
    userId: req.user.id,
    userName: req.user.name,
    flat: req.user.flat,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedWorker: null,
    workerName: null,
    timeline: [{ status: 'open', message: 'Ticket created', timestamp: new Date().toISOString() }]
  };
  maintenanceTickets.push(ticket);

  const smsMessage = `Connect Apartment: Maintenance Ticket ${ticket.ticketNo} raised by ${req.user.name} (Flat ${req.user.flat}). Category: ${category.name}. Priority: ${priority || 'medium'}. Issue: ${description.substring(0, 80)}`;
  const smsSent = await sendSMS(NOTIFY_PHONE, smsMessage);

  res.json({ message: 'Ticket submitted successfully!', ticket, smsSent, smsMessage });
});

app.get('/api/maintenance/tickets', authenticateToken, (req, res) => {
  const userTickets = maintenanceTickets.filter(t => t.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userTickets);
});

app.patch('/api/maintenance/ticket/:id', authenticateToken, (req, res) => {
  const ticket = maintenanceTickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Admin can set any status and assign workers
  if (req.user.role === 'admin') {
    if (req.body.status && req.body.status !== ticket.status) {
      ticket.status = req.body.status;
      ticket.updatedAt = new Date().toISOString();
      const msg = req.body.message || `Status changed to ${req.body.status}`;
      ticket.timeline.push({ status: req.body.status, message: msg, timestamp: new Date().toISOString() });
    }
    if (req.body.assignedWorkerId) {
      const worker = workers.find(w => w.id === req.body.assignedWorkerId);
      if (worker) {
        if (ticket.assignedWorker) {
          const prev = workers.find(w => w.id === ticket.assignedWorker);
          if (prev) { prev.status = 'available'; prev.assignedTicket = null; }
        }
        ticket.assignedWorker = worker.id;
        ticket.workerName = worker.name;
        worker.status = 'busy';
        worker.assignedTicket = ticket.id;
        ticket.timeline.push({ status: ticket.status, message: `Worker ${worker.name} (${worker.role}) assigned`, timestamp: new Date().toISOString() });
      }
    }
    return res.json({ message: 'Ticket updated', ticket });
  }

  // Resident sequential flow
  const statusFlow = { 'open': 'in-progress', 'in-progress': 'resolved' };
  const nextStatus = statusFlow[ticket.status];
  if (!nextStatus) return res.status(400).json({ error: 'Ticket already resolved' });
  ticket.status = nextStatus;
  ticket.updatedAt = new Date().toISOString();
  ticket.timeline.push({ status: nextStatus, message: nextStatus === 'in-progress' ? 'Work in progress' : 'Issue resolved', timestamp: new Date().toISOString() });
  res.json({ message: `Ticket updated to ${nextStatus}`, ticket });
});

// ============ EMERGENCY ROUTES ============

app.get('/api/emergency/contacts', authenticateToken, (req, res) => {
  res.json(emergencyContacts);
});

app.post('/api/emergency/alert', authenticateToken, (req, res) => {
  const { type, message } = req.body;
  const alert = {
    id: uuidv4(),
    type,
    message: message || `Emergency: ${type} reported`,
    userId: req.user.id,
    userName: req.user.name,
    flat: req.user.flat,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  emergencyAlerts.push(alert);
  res.json({ message: 'Emergency alert sent to security and management!', alert });
});

// ============ PARKING ROUTES ============

app.get('/api/parking', authenticateToken, (req, res) => {
  res.json(parkingSlots);
});

app.post('/api/parking/book', authenticateToken, (req, res) => {
  const { slotId, vehicleNumber } = req.body;
  const slot = parkingSlots.find(s => s.id === slotId);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (slot.status !== 'available') return res.status(400).json({ error: 'Slot not available' });

  slot.status = 'occupied';
  slot.flat = req.user.flat;
  slot.vehicle = vehicleNumber;
  res.json({ message: 'Parking slot booked!', slot });
});

app.post('/api/parking/release/:id', authenticateToken, (req, res) => {
  const slot = parkingSlots.find(s => s.id === req.params.id);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  slot.status = 'available';
  slot.flat = null;
  slot.vehicle = null;
  res.json({ message: 'Parking slot released!', slot });
});

// ============ ANNOUNCEMENTS ============

app.get('/api/announcements', authenticateToken, (req, res) => {
  res.json(announcements);
});

// ============ COMMUNITY FEATURES ============

app.get('/api/skills', authenticateToken, (req, res) => {
  res.json(skills);
});

app.post('/api/skills', authenticateToken, (req, res) => {
  const { skill, desc } = req.body;
  const newSkill = { id: uuidv4(), user: req.user.name, flat: req.user.flat, skill, desc };
  skills.push(newSkill);
  res.json({ message: 'Skill added', skill: newSkill });
});

app.get('/api/events', authenticateToken, (req, res) => {
  res.json(communityEvents);
});

app.post('/api/child-safety/alert', authenticateToken, (req, res) => {
  const alert = {
    id: uuidv4(),
    type: 'Child Missing',
    message: `${req.user.name} (Flat ${req.user.flat}) has marked their child as MISSING! Please help search the premises.`,
    userId: req.user.id,
    userName: req.user.name,
    flat: req.user.flat,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  announcements.unshift({
    id: alert.id,
    title: '🚨 EMERGENCY: Child Missing!',
    message: alert.message,
    date: new Date().toISOString(),
    priority: 'high'
  });
  res.json({ message: 'Neighbors alerted!', alert });
});

// ============ ADMIN ROUTES ============

app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const totalUsers = users.filter(u => u.role === 'resident').length;
  const totalComplaints = maintenanceTickets.length;
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  res.json({
    totalUsers,
    totalComplaints,
    totalPayments,
    recentComplaints: maintenanceTickets.slice().reverse().slice(0, 5),
    recentPayments: payments.slice().reverse().slice(0, 5)
  });
});

app.get('/api/admin/bookings', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(bookings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/admin/tickets', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(maintenanceTickets.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// ============ VISITOR ROUTES ============

app.get('/api/visitors', authenticateToken, (req, res) => {
  res.json(visitors.filter(v => v.flat === req.user.flat));
});

app.post('/api/visitors', authenticateToken, (req, res) => {
  const { name, type } = req.body;
  const newVisitor = {
    id: uuidv4(),
    name,
    type,
    flat: req.user.flat,
    date: new Date().toISOString().split('T')[0],
    status: 'Expected'
  };
  visitors.push(newVisitor);
  res.json({ message: 'Visitor pre-approved!', visitor: newVisitor });
});

// ============ HISTORY ROUTE ============

app.get('/api/history', authenticateToken, (req, res) => {
  const userBookings = bookings.filter(b => b.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const userPayments = payments.filter(p => p.userId === req.user.id).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  const userTickets = maintenanceTickets.filter(t => t.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ bookings: userBookings, payments: userPayments, complaints: userTickets });
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Catch-all: serve resident portal (local only)
if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
}

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏢 Connect Apartment – Resident Portal running at http://localhost:${PORT}\n`);
    console.log('  Login credentials:');
    console.log('  ├─ meeran / mappi1037');
    console.log('  ├─ jeeva  / jeeva@123');
    console.log('  └─ admin  / admin@123\n');
    console.log(`  Admin Portal: http://localhost:${PORT}/admin-portal\n`);
  });
}

module.exports = app;
