const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, requireAuth, requireRole } = require('../middleware/auth');
const { publicUser, fullProfile, DOC_TYPES } = require('../utils/profile');

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
      user: publicUser(user),
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
      user: publicUser(user),
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

// ───────────────────────── Farmer profile ─────────────────────────────
const TEXT_LIMITS = {
  fatherName: 80, dob: 10, gender: 12, address: 200, village: 60, tehsil: 60,
  district: 60, state: 60, pincode: 6, landAcres: 10, khasraNo: 40,
  kisanId: 30, bankName: 80, bankAccount: 30, ifsc: 11,
};
const EDITABLE = ['name', ...Object.keys(TEXT_LIMITS)];
const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const MAX_DOC_BYTES = 1.4 * 1024 * 1024; // ~1 MB file once base64-encoded
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];

// GET /api/auth/profile — the logged-in farmer's own profile
router.get('/profile', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(fullProfile(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/auth/profile — edit own details. Phone & Aadhaar are the farmer's
// login/booking identity so they are NOT editable here; role/status/password
// can never be changed from this route.
router.put('/profile', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    for (const key of EDITABLE) {
      if (body[key] !== undefined) update[key] = clean(body[key], key === 'name' ? 80 : TEXT_LIMITS[key]);
    }
    if (body.crops !== undefined) {
      update.crops = (Array.isArray(body.crops) ? body.crops : []).map(c => clean(c, 30)).filter(Boolean).slice(0, 10);
    }

    if (update.name !== undefined && !update.name) return res.status(400).json({ message: 'Name cannot be empty.' });
    if (update.kisanId) update.kisanId = update.kisanId.toUpperCase();
    if (update.ifsc) update.ifsc = update.ifsc.toUpperCase();
    if (update.pincode && !/^\d{6}$/.test(update.pincode)) return res.status(400).json({ message: 'PIN code must be 6 digits.' });
    if (update.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(update.ifsc)) return res.status(400).json({ message: 'IFSC code looks wrong (example: SBIN0001234).' });
    if (update.bankAccount && !/^[0-9Xx* ()A-Za-z-]{4,30}$/.test(update.bankAccount)) return res.status(400).json({ message: 'Bank account number looks wrong.' });
    if (update.landAcres && !/^\d{0,5}(\.\d{1,2})?$/.test(update.landAcres)) return res.status(400).json({ message: 'Land area must be a number, e.g. 2.5' });
    if (update.dob && !/^\d{4}-\d{2}-\d{2}$/.test(update.dob)) return res.status(400).json({ message: 'Date of birth is not valid.' });
    if (update.kisanId && !/^[A-Z0-9-]{5,30}$/.test(update.kisanId)) return res.status(400).json({ message: 'Kisan ID should be letters/numbers only (5-30 characters).' });

    update.profileUpdatedAt = new Date();
    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
    res.json(fullProfile(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/profile/documents — body { type, fileName, mimeType, data(dataURL) }
router.post('/profile/documents', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const { type, fileName, mimeType, data } = req.body || {};
    if (!DOC_TYPES.some(d => d.type === type)) return res.status(400).json({ message: 'Unknown document type.' });
    if (!ALLOWED_MIME.includes(mimeType)) return res.status(400).json({ message: 'Only JPG, PNG or PDF files are allowed.' });
    if (typeof data !== 'string' || !data.startsWith(`data:${mimeType};base64,`)) return res.status(400).json({ message: 'File could not be read. Please try again.' });
    if (data.length > MAX_DOC_BYTES) return res.status(413).json({ message: 'File is too big. Please keep it under 1 MB.' });

    const user = await User.findById(req.user.id);
    user.documents = (user.documents || []).filter(d => d.type !== type);
    user.documents.push({ type, fileName: clean(fileName, 80), mimeType, data, status: 'uploaded', uploadedAt: new Date() });
    user.profileUpdatedAt = new Date();
    await user.save();
    res.status(201).json(fullProfile(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/profile/documents/:type — the farmer previews their own file
router.get('/profile/documents/:type', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('documents');
    const doc = (user.documents || []).find(d => d.type === req.params.type);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });
    res.json({ type: doc.type, fileName: doc.fileName, mimeType: doc.mimeType, data: doc.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/auth/profile/documents/:type — remove (not allowed once verified)
router.delete('/profile/documents/:type', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const doc = (user.documents || []).find(d => d.type === req.params.type);
    if (doc && doc.status === 'verified') return res.status(400).json({ message: 'A verified document cannot be removed. Contact your Mandi officer.' });
    user.documents = (user.documents || []).filter(d => d.type !== req.params.type);
    await user.save();
    res.json(fullProfile(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
