const express = require('express');
const router = express.Router();
const Centre = require('../models/Centre');

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
router.put('/:id', async (req, res) => {
  try {
    const { status, yardCapacityUsed, gunnyBagsAvailable, trucksLiftingToday } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (yardCapacityUsed !== undefined) update.yardCapacityUsed = yardCapacityUsed;
    if (gunnyBagsAvailable !== undefined) update.gunnyBagsAvailable = gunnyBagsAvailable;
    if (trucksLiftingToday !== undefined) update.trucksLiftingToday = trucksLiftingToday;

    const centre = await Centre.findOneAndUpdate(
      { centreId: req.params.id },
      update,
      { new: true }
    );
    if (!centre) {
      return res.status(404).json({ message: 'Centre not found' });
    }
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;