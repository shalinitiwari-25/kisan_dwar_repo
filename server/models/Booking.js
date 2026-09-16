const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  farmerName: {
    type: String,
    required: true
  },
  aadhaar: {
    type: String,
    required: true
  },
  crop: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  centreId: {
    type: String,
    required: true
  },
  tokenNo: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'arrived', 'processed', 'no-show', 'cancelled'],
    default: 'booked'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);