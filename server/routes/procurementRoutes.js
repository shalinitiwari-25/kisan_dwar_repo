const express = require('express');
const router = express.Router();
const Procurement = require('../models/Procurement');

// GET all district procurement data
router.get('/', async (req, res) => {
  try {
    const data = await Procurement.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;