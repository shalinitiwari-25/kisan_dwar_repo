const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  aadhaar: { type: String, required: true, index: true },
  phone: { type: String, default: '' },

  centreId: { type: String, required: true },
  centreName: { type: String, default: '' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },

  type: {
    type: String,
    enum: ['DELAY', 'SHORTAGE', 'REBOOKED'],
    required: true,
  },

  titleEn: { type: String, required: true },
  messageEn: { type: String, required: true },

  // The language + translated text actually sent as SMS (falls back to
  // English if the farmer's language is English, or if translation fails)
  lang: { type: String, default: 'en' },
  messageTranslated: { type: String, default: '' },

  // Extra structured data for the frontend — e.g. the new token/centre
  // details when type === 'REBOOKED', so the farmer's app can swap over
  // to the new booking automatically.
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  smsSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
