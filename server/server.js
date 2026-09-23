require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');
const Centre = require('./models/Centre');
const User = require('./models/User');
const Procurement = require('./models/Procurement');
const centreRoutes = require('./routes/centreRoutes');
const app = express();
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const authRoutes = require('./routes/authRoutes');
const translateRoutes = require('./routes/translateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Connect to MongoDB, then make sure at least the default centres and demo
// login accounts exist. This prevents "Centre not found" / login failures
// caused by an empty/unseeded database (e.g. a fresh clone, a new MongoDB
// Atlas cluster, etc.).
connectDB().then(async () => {
  const centreCount = await Centre.countDocuments();
  if (centreCount === 0) {
    console.log('No centres found — auto-seeding default centres...');
    await Centre.insertMany([
      { centreId: 'C001', name: 'Karnal Mandi', yardCapacityUsed: 50, gunnyBagsAvailable: true, trucksLiftingToday: true, status: 'OPEN' },
      { centreId: 'C002', name: 'Panipat Mandi', yardCapacityUsed: 85, gunnyBagsAvailable: false, trucksLiftingToday: true, status: 'RESTRICTED' },
      { centreId: 'C003', name: 'Kurukshetra Mandi', yardCapacityUsed: 100, gunnyBagsAvailable: true, trucksLiftingToday: false, status: 'PAUSED' },
    ]);
    console.log('Default centres created.');
  }

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('No users found — auto-seeding demo login accounts...');
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.insertMany([
      { name: 'Ramesh Kumar', email: 'farmer@test.com', password: passwordHash, role: 'farmer', phone: '9876543210', aadhaar: '123456789012', address: 'Village Dhanora, Karnal, Haryana', bankAccount: '****4321 (Punjab National Bank)' },
      { name: 'Amit Sharma',  email: 'officer@test.com', password: passwordHash, role: 'officer', phone: '9876500001', aadhaar: '000000000001' },
      { name: 'Priya Gupta',  email: 'govt@test.com',   password: passwordHash, role: 'government', phone: '9876500002', aadhaar: '000000000002' },
    ]);
    console.log('Demo accounts created — farmer@test.com / officer@test.com / govt@test.com (password: password123)');
  }

  const procurementCount = await Procurement.countDocuments();
  if (procurementCount === 0) {
    console.log('No procurement data found — auto-seeding district demo data...');
    await Procurement.insertMany([
      { district: 'Karnal', target: 20000, achieved: 16800 },
      { district: 'Panipat', target: 15000, achieved: 10700 },
      { district: 'Kurukshetra', target: 18000, achieved: 12900 },
      { district: 'Ambala', target: 12000, achieved: 9400 },
      { district: 'Hisar', target: 16000, achieved: 7200 },
    ]);
    console.log('District procurement demo data created.');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.get('/api/test', (req, res) => res.send('test works'));
// Test route
app.get('/', (req, res) => {
  res.send('Kisan Dwar API is running');
});
app.use('/api/centre', centreRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/notifications', notificationRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

