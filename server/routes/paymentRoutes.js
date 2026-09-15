const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

// CREATE a payment record for a booking
router.post('/', async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const payment = await Payment.create({ bookingId, amount });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET payment status by bookingId
router.get('/:bookingId', async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE payment stage (weighment, qualityCheck, status)
router.patch('/:bookingId', async (req, res) => {
  try {
    const { weighment, qualityCheck, status } = req.body;
    const payment = await Payment.findOneAndUpdate(
      { bookingId: req.params.bookingId },
      { weighment, qualityCheck, status },
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;