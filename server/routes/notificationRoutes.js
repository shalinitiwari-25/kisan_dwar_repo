const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET the latest alerts for a farmer (by Aadhaar) — delay, shortage,
// and cancellation/auto-rebooking notices. Used by the farmer dashboard's
// "Mandi Alerts" card.
router.get('/farmer/:aadhaar', async (req, res) => {
  try {
    const notifications = await Notification.find({ aadhaar: req.params.aadhaar })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
