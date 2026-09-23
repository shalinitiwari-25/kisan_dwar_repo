const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Centre = require('../models/Centre');
const User = require('../models/User');
const { sendSms } = require('../utils/sms');

// POST a new booking
router.post('/', async (req, res) => {
  try {
    const { farmerName, aadhaar, crop, quantity, centreId } = req.body;

    if (!farmerName || !aadhaar || !crop || !quantity || !centreId) {
      return res.status(400).json({ message: 'Missing required booking fields.' });
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
    });

    // Send SMS notification to farmer — fire-and-forget (don't block the response)
    try {
      const farmer = await User.findOne({ aadhaar });
      const phone = farmer?.phone;
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

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

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
      { confirmed: true },
      { new: true }
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