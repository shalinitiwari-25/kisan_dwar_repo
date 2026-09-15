const mongoose = require('mongoose');

const centreSchema = new mongoose.Schema({
  centreId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  yardCapacityUsed: {
    type: Number,
    default: 0
  },
  gunnyBagsAvailable: {
    type: Boolean,
    default: true
  },
  trucksLiftingToday: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'RESTRICTED', 'PAUSED'],
    default: 'OPEN'
  }
}, { timestamps: true });

module.exports = mongoose.model('Centre', centreSchema);