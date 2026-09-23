const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

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

    // Officer/Government accounts can't log in until a Government user
    // has approved them (and, for officers, assigned a centre).
    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Your account is awaiting government approval. Please check back later.',
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        message: `Your registration was rejected${user.rejectionReason ? `: ${user.rejectionReason}` : '.'} Contact your district Mandi office.`,
      });
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
        village: user.village || '',
        district: user.district || '',
        state: user.state || '',
        preferredLanguage: user.preferredLanguage || 'en',
        assignedCentres: user.assignedCentres || [],
        kppVerified: user.kppVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/register
// Body: { name, role, aadhaar, phone, password, village?, district?, state? }
// For demo: OTP verification is handled on the front-end before this is called.
router.post('/register', async (req, res) => {
  try {
    const { name, role, aadhaar, phone, password, village, district, state } = req.body;

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

    // Farmers are active immediately. Officer & Government registrations
    // need a Government user to approve them (and, for officers, assign
    // a centre) before the account can log in at all — see
    // adminRoutes.js `/approve/:userId`.
    const needsApproval = role === 'officer' || role === 'government';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email,
      password: passwordHash,
      role,
      phone,
      aadhaar,
      village: village || '',
      district: district || '',
      state: state || '',
      status: needsApproval ? 'pending' : 'active',
    });

    if (needsApproval) {
      return res.status(201).json({
        pending: true,
        message: role === 'officer'
          ? 'Your officer account has been submitted. A government admin must verify your details and assign you to a centre before you can log in.'
          : 'Your government account has been submitted for approval by an existing government admin before you can log in.',
      });
    }

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
        village: user.village,
        district: user.district,
        state: user.state,
        preferredLanguage: user.preferredLanguage || 'en',
        assignedCentres: user.assignedCentres || [],
        kppVerified: user.kppVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/auth/language/:aadhaar
// Persists the farmer's chosen website language so SMS alerts (Mandi
// delay/shortage/rebooking) can be sent in that same language.
router.patch('/language/:aadhaar', async (req, res) => {
  try {
    const { preferredLanguage } = req.body;
    if (!preferredLanguage || typeof preferredLanguage !== 'string') {
      return res.status(400).json({ message: 'preferredLanguage is required.' });
    }

    const user = await User.findOneAndUpdate(
      { aadhaar: req.params.aadhaar },
      { preferredLanguage },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ preferredLanguage: user.preferredLanguage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

