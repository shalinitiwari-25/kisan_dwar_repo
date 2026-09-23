const express = require('express');
const router = express.Router();
const Centre = require('../models/Centre');
const { notifyDegradation, notifyPausedAndRebook } = require('../utils/notify');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET all centres (officer centre-switcher, government dashboards)
router.get('/', async (req, res) => {
  try {
    const centres = await Centre.find({}).sort({ centreId: 1 });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a single centre by centreId
router.get('/:id', async (req, res) => {
  try {
    const centre = await Centre.findOne({ centreId: req.params.id });
    if (!centre) {
      return res.status(404).json({ message: 'Centre not found' });
    }
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update centre status / capacity
// After applying the update, compares before/after state and — if this
// change means farmers waiting on a booking here would be affected
// (delay, shortage, or the centre pausing intake for the day) — fires
// off SMS + website alerts to every farmer with an active booking here.
router.put('/:id', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    // An officer can only control the centre(s) a government admin has
    // assigned them to — enforced here, not just hidden in the UI.
    if (req.user.role === 'officer' && !req.user.assignedCentres.includes(req.params.id)) {
      return res.status(403).json({ message: 'You are not assigned to this centre.' });
    }

    const { status, yardCapacityUsed, gunnyBagsAvailable, trucksLiftingToday } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (yardCapacityUsed !== undefined) update.yardCapacityUsed = yardCapacityUsed;
    if (gunnyBagsAvailable !== undefined) update.gunnyBagsAvailable = gunnyBagsAvailable;
    if (trucksLiftingToday !== undefined) update.trucksLiftingToday = trucksLiftingToday;

    const before = await Centre.findOne({ centreId: req.params.id });
    if (!before) {
      return res.status(404).json({ message: 'Centre not found' });
    }

    const centre = await Centre.findOneAndUpdate(
      { centreId: req.params.id },
      update,
      { new: true }
    );

    res.json(centre);

    // ── Fire farmer notifications AFTER responding, so the officer's
    //    action never waits on SMS/translation calls. Failures here are
    //    logged only — they must never affect the centre update itself. ──
    setImmediate(async () => {
      try {
        const justPaused = before.status !== 'PAUSED' && centre.status === 'PAUSED';
        if (justPaused) {
          await notifyPausedAndRebook(centre);
          return; // booking-level cancellation already covers this event
        }

        const justRestricted = before.status === 'OPEN' && centre.status === 'RESTRICTED';
        const crossedCapacityThreshold = before.yardCapacityUsed < 85 && centre.yardCapacityUsed >= 85;
        if (justRestricted || crossedCapacityThreshold) {
          await notifyDegradation(centre, 'DELAY');
        }

        const bagsJustRanOut = before.gunnyBagsAvailable === true && centre.gunnyBagsAvailable === false;
        if (bagsJustRanOut) {
          await notifyDegradation(centre, 'SHORTAGE', { resource: 'gunny bags' });
        }

        const trucksJustHalted = before.trucksLiftingToday === true && centre.trucksLiftingToday === false;
        if (trucksJustHalted) {
          await notifyDegradation(centre, 'SHORTAGE', { resource: 'lifting trucks' });
        }
      } catch (err) {
        console.error('[centreRoutes] notification dispatch failed:', err.message);
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
