const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Centre = require('../models/Centre');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { sendSms } = require('../utils/sms');
const { requireAuth, requireRole } = require('../middleware/auth');
const { missingItems } = require('../utils/profile');

// Profile details copied onto every booking so the officer sees exactly what
// the farmer submitted (documents are listed by status; files are fetched
// through the officer-only /api/admin/farmer-profile route).
function buildSnapshot(u) {
  return {
    farmerId: String(u._id),
    name: u.name, phone: u.phone, aadhaar: u.aadhaar, kisanId: u.kisanId,
    fatherName: u.fatherName, dob: u.dob, gender: u.gender,
    address: u.address, village: u.village, tehsil: u.tehsil, district: u.district,
    state: u.state, pincode: u.pincode,
    landAcres: u.landAcres, khasraNo: u.khasraNo, crops: u.crops || [],
    bankName: u.bankName, bankAccount: u.bankAccount, ifsc: u.ifsc,
    documents: (u.documents || []).map(d => ({ type: d.type, status: d.status, uploadedAt: d.uploadedAt })),
    capturedAt: new Date(),
  };
}

// POST a new booking
router.post('/', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const { crop, quantity, centreId, slotDate, slotLabel } = req.body;

    // The farmer's identity comes from their login, not from the request body.
    const farmerUser = await User.findById(req.user.id);
    if (!farmerUser) return res.status(401).json({ message: 'Please log in again.' });
    const farmerName = farmerUser.name;
    const aadhaar = farmerUser.aadhaar;

    if (!aadhaar || !crop || !quantity || !centreId) {
      return res.status(400).json({ message: 'Missing required booking fields.' });
    }

    // Booking needs a complete profile (details + required documents)
    const missing = missingItems(farmerUser);
    if (missing.length) {
      return res.status(403).json({
        code: 'PROFILE_INCOMPLETE',
        message: 'Please complete your profile before booking. Still needed: ' + missing.map(m => m.label).join(', ') + '.',
        missing,
      });
    }

    const centre = await Centre.findOne({ centreId });
    if (!centre) {
      return res.status(404).json({ message: 'Centre not found' });
    }

    if (centre.status === 'PAUSED') {
      // Suggest the nearest open centre instead of just rejecting the booking
      const alternatives = await Centre.find({ status: { $ne: 'PAUSED' } }).sort({ yardCapacityUsed: 1 });

      return res.status(400).json({
        message: 'Centre is currently full. Bookings are paused.',
        centreStatus: centre.status,
        suggestedCentre: alternatives[0] || null,
      });
    }

    // Fraud prevention: one active booking per farmer (Aadhaar) at a time
    const existingActive = await Booking.findOne({
      aadhaar,
      status: { $in: ['booked', 'arrived'] },
    });
    if (existingActive) {
      return res.status(409).json({
        message: `You already have an active booking (Token #${existingActive.tokenNo}) at ${existingActive.centreId}.`,
        existingBooking: existingActive,
      });
    }

    // Next token number is sequential per centre
    const lastForCentre = await Booking.findOne({ centreId }).sort({ tokenNo: -1 });
    const tokenNo = lastForCentre ? lastForCentre.tokenNo + 1 : 1;

    const booking = await Booking.create({
      farmerName,
      aadhaar,
      crop,
      quantity,
      centreId,
      tokenNo,
      status: 'booked',
      slotDate: String(slotDate || '').slice(0, 10),
      slotLabel: String(slotLabel || '').slice(0, 40),
      farmerSnapshot: buildSnapshot(farmerUser),
    });

    // Send SMS notification to farmer — fire-and-forget (don't block the response)
    try {
      const phone = farmerUser.phone;
      if (phone) {
        const tokenId = `KD-${String(tokenNo).padStart(5, '0')}`;
        const centreName = centre.name || centreId;
        const smsText =
          `Your Kisan Dwar slot is confirmed!\n` +
          `Token: ${tokenId} | Centre: ${centreName}\n` +
          `Crop: ${crop} (${quantity} Qtl)\n` +
          `Arrive on time & show QR at gate.\n` +
          `-Kisan Dwar`;
        // Format phone: prepend +91 if not already international
        const toPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        sendSms(toPhone, smsText).catch(() => {}); // non-blocking
      }
    } catch (_) {
      // SMS failure should never break the booking response
    }

    res.status(201).json(booking);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ── GET /api/booking/my/history — farmer's own bookings + event timeline ──
router.get('/my/history', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('aadhaar');
    const [bookings, centres] = await Promise.all([
      Booking.find({ aadhaar: me.aadhaar }).sort({ createdAt: -1 }).lean(),
      Centre.find({}).select('centreId name').lean(),
    ]);
    const centreName = Object.fromEntries(centres.map(c => [c.centreId, c.name]));
    const payments = await Payment.find({ bookingId: { $in: bookings.map(b => b._id) } }).lean();
    const payByBooking = Object.fromEntries(payments.map(p => [String(p.bookingId), p]));

    const out = bookings.map(b => {
      // Old bookings made before statusHistory existed: rebuild a basic trail.
      let trail = (b.statusHistory || []).map(h => ({ type: h.status, at: h.at, note: h.note }));
      if (!trail.length) {
        trail = [{ type: 'booked', at: b.createdAt, note: '' }];
        if (b.status !== 'booked') trail.push({ type: b.status, at: b.updatedAt, note: '' });
      }
      if (b.confirmed) trail.push({ type: 'confirmed', at: b.confirmedAt || b.updatedAt, note: '' });
      const pay = payByBooking[String(b._id)];
      if (pay && pay.status === 'credited') trail.push({ type: 'paid', at: pay.updatedAt, note: pay.amount ? `₹${pay.amount}` : '' });
      trail.sort((x, y) => new Date(x.at) - new Date(y.at));
      return {
        id: b._id,
        tokenId: `KD-${String(b.tokenNo).padStart(5, '0')}`,
        tokenNo: b.tokenNo,
        centreId: b.centreId,
        centre: centreName[b.centreId] || b.centreId,
        crop: b.crop, quantity: b.quantity, status: b.status,
        slotDate: b.slotDate, slotLabel: b.slotLabel,
        createdAt: b.createdAt, cancelReason: b.cancelReason || '',
        events: trail,
      };
    });
    res.json(out);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/booking/:id/cancel — farmer cancels their own waiting booking ──
router.patch('/:id/cancel', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('aadhaar');
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.aadhaar !== me.aadhaar) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.status !== 'booked') {
      return res.status(400).json({ message: 'Only a waiting booking can be cancelled.' });
    }
    booking.status = 'cancelled';
    booking.cancelReason = String(req.body?.reason || 'Cancelled by farmer').slice(0, 120);
    booking._historyNote = booking.cancelReason;
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all bookings for a specific farmer (by aadhaar, since you're not using farmerId)
router.get('/farmer/:aadhaar', async (req, res) => {
  try {
    const bookings = await Booking.find({ aadhaar: req.params.aadhaar });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// GET a single booking by its own ID
router.get('/single/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// GET all bookings for a centre
router.get('/:centreId', async (req, res) => {
  try {
    const bookings = await Booking.find({ centreId: req.params.centreId });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE a booking's status (arrived / processed / no-show)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['booked', 'arrived', 'processed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    booking.status = status;
    await booking.save(); // pre-save hook records the history entry

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// PATCH /:id/confirm — farmer confirms they are on their way
router.patch('/:id/confirm', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { confirmed: true, confirmedAt: new Date() },
      { new: true, strict: false }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;