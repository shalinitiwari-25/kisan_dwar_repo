require('dotenv').config();
const mongoose = require('mongoose');
const Centre = require('./models/Centre');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Procurement = require('./models/Procurement');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected for seeding...');

    // Clear existing data
    await Centre.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Procurement.deleteMany({});

    // Create centres
    const centres = await Centre.insertMany([
      { centreId: 'C001', name: 'Karnal Mandi', yardCapacityUsed: 50, gunnyBagsAvailable: true, trucksLiftingToday: true, status: 'OPEN' },
      { centreId: 'C002', name: 'Panipat Mandi', yardCapacityUsed: 85, gunnyBagsAvailable: false, trucksLiftingToday: true, status: 'RESTRICTED' },
      { centreId: 'C003', name: 'Kurukshetra Mandi', yardCapacityUsed: 100, gunnyBagsAvailable: true, trucksLiftingToday: false, status: 'PAUSED' }
    ]);
    console.log('Centres seeded');

    // Create bookings
    const bookings = await Booking.insertMany([
      { farmerName: 'Ramesh', aadhaar: '1111', crop: 'Wheat', quantity: 50, centreId: 'C001', tokenNo: 1, status: 'booked' },
      { farmerName: 'Suresh', aadhaar: '2222', crop: 'Tomato', quantity: 20, centreId: 'C001', tokenNo: 2, status: 'arrived' },
      { farmerName: 'Mahesh', aadhaar: '3333', crop: 'Rice', quantity: 40, centreId: 'C001', tokenNo: 3, status: 'processed' },
      { farmerName: 'Dinesh', aadhaar: '4444', crop: 'Onion', quantity: 15, centreId: 'C002', tokenNo: 1, status: 'booked' }
    ]);
    console.log('Bookings seeded');
    await Procurement.insertMany([
  { district: 'Karnal', target: 20000, achieved: 16800 },
  { district: 'Panipat', target: 15000, achieved: 10700 },
  { district: 'Kurukshetra', target: 18000, achieved: 12900 }
]);
console.log('Procurement data seeded');
    // Create payments for processed bookings
    await Payment.insertMany([
      { bookingId: bookings[2]._id, weighment: true, qualityCheck: true, amount: 32000, status: 'credited' },
      { bookingId: bookings[1]._id, weighment: true, qualityCheck: false, amount: 0, status: 'processing' }
    ]);
    console.log('Payments seeded');

    console.log('Seeding complete!');
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();