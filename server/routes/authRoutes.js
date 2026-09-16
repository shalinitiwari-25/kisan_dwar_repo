const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Falls back to a dev secret so the demo works even if JWT_SECRET isn't
// set in .env — set a real one in production.
const JWT_SECRET = process.env.JWT_SECRET || 'kisan_dwar_dev_secret_change_in_production';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and password are required.' });
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        aadhaar: user.aadhaar || '',
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/register
// Body: { name, role, aadhaar, phone, password }
// For demo: OTP verification is handled on the front-end before this is called.
router.post('/register', async (req, res) => {
  try {
    const { name, role, aadhaar, phone, password } = req.body;

    if (!name || !role || !aadhaar || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const validRoles = ['farmer', 'officer', 'government'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    // Use phone as the unique email-equivalent: phone@kisan.in
    const email = `${phone}@kisan.in`;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this phone number already exists. Please login.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email,
      password: passwordHash,
      role,
      phone,
      aadhaar,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        aadhaar: user.aadhaar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

