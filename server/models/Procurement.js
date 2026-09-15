const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true
  },
  target: {
    type: Number,
    required: true
  },
  achieved: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Procurement', procurementSchema);