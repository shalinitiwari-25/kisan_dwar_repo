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
  },
  confirmed: {
    type: Boolean,
    default: false   // farmer taps "I'm on my way" from queue screen
  },
  // Date + time slot the farmer picked (shown in History and to officers)
  confirmedAt: { type: Date, default: null },
  slotDate: { type: String, default: '' },    // YYYY-MM-DD
  slotLabel: { type: String, default: '' },   // e.g. "9 AM – 11 AM"
  cancelReason: { type: String, default: '' },
  // Snapshot of the farmer's profile at the moment of booking, so the
  // officer sees exactly what the farmer submitted (even if they edit later).
  farmerSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  // One entry per status change — powers the farmer's History page.
  statusHistory: {
    type: [{
      status: { type: String },
      at: { type: Date, default: Date.now },
      note: { type: String, default: '' },
      _id: false,
    }],
    default: [],
  },
}, { timestamps: true });

// Automatically record every status change (create, arrive, process,
// cancel, no-show — including the auto-cancel done in utils/notify.js).
bookingSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({ status: this.status, at: new Date(), note: this._historyNote || '' });
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);