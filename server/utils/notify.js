/**
 * notify.js — turns a Mandi centre status change into farmer-friendly
 * SMS + website alerts, in the farmer's own language.
 *
 * Flow for a "degraded but still open" event (delay / shortage):
 *   1. Find every farmer with an active booking (booked/arrived) at the
 *      centre.
 *   2. Compose a short, plain-language English message.
 *   3. Translate it into the farmer's saved preferredLanguage via
 *      Bhashini (falls back to English if unset/unconfigured/fails).
 *   4. Save a Notification (shown on the farmer's dashboard) and send
 *      an SMS (mock/console in this demo, real via Twilio if configured).
 *
 * Flow for a "centre paused / day's booking stopped" event:
 *   Same as above, but the farmer's existing booking is cancelled and,
 *   if another centre is open, a brand-new booking is created for them
 *   automatically there. The SMS + website alert explain both the
 *   cancellation and the new token.
 */

const Booking = require('../models/Booking');
const Centre = require('../models/Centre');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { translate } = require('./bhashini');
const { sendSms } = require('./sms');

function toIntlPhone(phone) {
  if (!phone) return null;
  return phone.startsWith('+') ? phone : `+91${phone}`;
}

// Very rough, demo-friendly delay estimate from how backed-up the yard is.
function estimateDelayHours(centre) {
  if (centre.yardCapacityUsed >= 95) return 3;
  if (centre.yardCapacityUsed >= 85) return 2;
  if (centre.status === 'RESTRICTED') return 1;
  return 1;
}

async function saveAndSend({ aadhaar, centreId, centreName, bookingId, type, titleEn, messageEn, meta }) {
  const farmer = await User.findOne({ aadhaar });
  const phone = farmer?.phone;
  const lang = farmer?.preferredLanguage || 'en';

  let titleOut = titleEn;
  let messageOut = messageEn;

  if (lang !== 'en') {
    try {
      const [tTitle, tMessage] = await translate([titleEn, messageEn], lang);
      titleOut = tTitle;
      messageOut = tMessage;
    } catch (err) {
      console.warn(`[notify] Translation to "${lang}" failed, sending English instead: ${err.message}`);
      titleOut = titleEn;
      messageOut = messageEn;
    }
  }

  const notification = await Notification.create({
    aadhaar,
    phone: phone || '',
    centreId,
    centreName,
    bookingId: bookingId || null,
    type,
    titleEn,
    messageEn,
    lang,
    messageTranslated: messageOut,
    meta: meta || {},
    smsSent: !!phone,
  });

  if (phone) {
    const smsText = `${titleOut}\n${messageOut}\n- Kisan Dwar`;
    sendSms(toIntlPhone(phone), smsText).catch(() => {});
  }

  return notification;
}

// ── Degraded-but-open events: delay / shortage ─────────────────────────
async function notifyDegradation(centre, type, extraContext) {
  const activeBookings = await Booking.find({
    centreId: centre.centreId,
    status: { $in: ['booked', 'arrived'] },
  });

  // One notification per farmer (Aadhaar), not per booking
  const seen = new Set();
  const results = [];

  for (const booking of activeBookings) {
    if (seen.has(booking.aadhaar)) continue;
    seen.add(booking.aadhaar);

    let titleEn;
    let messageEn;

    if (type === 'DELAY') {
      const hrs = estimateDelayHours(centre);
      titleEn = `Delay at ${centre.name}`;
      messageEn = `Your Mandi visit may be delayed. ${centre.name} is running about ${hrs} hour(s) behind schedule today. Please wait before leaving home — we will update you when it is clear.`;
    } else {
      // SHORTAGE
      const resource = extraContext?.resource || 'supplies';
      titleEn = `Shortage at ${centre.name}`;
      messageEn = `${centre.name} currently has a shortage of ${resource}. This may mean extra waiting time. Please check the app again before you leave, or carry extra patience.`;
    }

    const n = await saveAndSend({
      aadhaar: booking.aadhaar,
      centreId: centre.centreId,
      centreName: centre.name,
      bookingId: booking._id,
      type,
      titleEn,
      messageEn,
      meta: { yardCapacityUsed: centre.yardCapacityUsed },
    });
    results.push(n);
  }

  return results;
}

// ── Centre paused: cancel + auto-rebook every waiting (not-yet-arrived)
//    farmer at the nearest open centre ─────────────────────────────────
async function notifyPausedAndRebook(centre) {
  const stranded = await Booking.find({ centreId: centre.centreId, status: 'booked' });
  const results = [];

  // Pick one alternative centre up front (least busy open centre)
  const alternative = await Centre.findOne({
    centreId: { $ne: centre.centreId },
    status: { $ne: 'PAUSED' },
  }).sort({ yardCapacityUsed: 1 });

  for (const booking of stranded) {
    booking.status = 'cancelled';
    await booking.save();

    const oldTokenId = `KD-${String(booking.tokenNo).padStart(5, '0')}`;
    let titleEn;
    let messageEn;
    let meta = { oldBookingId: String(booking._id), oldTokenId };

    if (alternative) {
      const lastForAlt = await Booking.findOne({ centreId: alternative.centreId }).sort({ tokenNo: -1 });
      const newTokenNo = lastForAlt ? lastForAlt.tokenNo + 1 : 1;

      const newBooking = await Booking.create({
        farmerName: booking.farmerName,
        aadhaar: booking.aadhaar,
        crop: booking.crop,
        quantity: booking.quantity,
        centreId: alternative.centreId,
        tokenNo: newTokenNo,
        status: 'booked',
      });
      const newTokenId = `KD-${String(newTokenNo).padStart(5, '0')}`;

      titleEn = `Booking moved — ${centre.name} stopped today`;
      messageEn = `${centre.name} has stopped taking crops for today, so your token ${oldTokenId} has been cancelled. Don't worry — we have booked you a new slot at ${alternative.name}, Token ${newTokenId}. Please open the app to see your new time.`;

      meta = {
        ...meta,
        newBookingId: String(newBooking._id),
        newTokenId,
        newTokenNo,
        newCentreId: alternative.centreId,
        newCentreName: alternative.name,
      };
    } else {
      titleEn = `Booking cancelled — ${centre.name} stopped today`;
      messageEn = `${centre.name} has stopped taking crops for today, so your token ${oldTokenId} has been cancelled. All nearby centres are full right now — please open the app later to book a new slot.`;
    }

    const n = await saveAndSend({
      aadhaar: booking.aadhaar,
      centreId: centre.centreId,
      centreName: centre.name,
      bookingId: booking._id,
      type: 'REBOOKED',
      titleEn,
      messageEn,
      meta,
    });
    results.push(n);
  }

  return results;
}

module.exports = { notifyDegradation, notifyPausedAndRebook };
