const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const { fullProfile } = require('../utils/profile');
const { requireAuth, requireRole } = require('../middleware/auth');

// Writes an audit entry. Never allowed to break the calling request —
// if logging fails, we log the failure to the console and move on.
async function logAction(actor, action, targetLabel, details) {
  try {
    await AuditLog.create({ actorName: actor.name, actorRole: actor.role, action, targetLabel, details });
  } catch (err) {
    console.error('[adminRoutes] audit log write failed:', err.message);
  }
}

// ── GET /api/admin/pending-officers — Government only ─────────────────
// Officer & Government registrations awaiting approval.
router.get('/pending-officers', requireAuth, requireRole('government'), async (req, res) => {
  try {
    const pending = await User.find({ status: 'pending', role: { $in: ['officer', 'government'] } })
      .select('name phone role village district createdAt')
      .sort({ createdAt: 1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/officers — Government only ──────────────────────────
// Every officer/government account + status + centre assignment, for the
// Centre & Staff Management screen.
router.get('/officers', requireAuth, requireRole('government'), async (req, res) => {
  try {
    const officers = await User.find({ role: { $in: ['officer', 'government'] } })
      .select('name phone role village district status assignedCentres approvedBy approvedAt createdAt')
      .sort({ createdAt: -1 });
    res.json(officers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/admin/approve/:userId — Government only ─────────────────
// Approves a pending officer/government registration. Officers must be
// assigned at least one centre at approval time — that assignment is what
// centreRoutes.js later checks before letting them touch a centre.
router.patch('/approve/:userId', requireAuth, requireRole('government'), async (req, res) => {
  try {
    const { assignedCentres } = req.body;
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (target.status !== 'pending') {
      return res.status(400).json({ message: 'This account is not pending approval.' });
    }

    if (target.role === 'officer') {
      if (!Array.isArray(assignedCentres) || assignedCentres.length === 0) {
        return res.status(400).json({ message: 'Assign at least one centre before approving an officer.' });
      }
      target.assignedCentres = assignedCentres;
    }

    target.status = 'active';
    target.approvedBy = req.user.name;
    target.approvedAt = new Date();
    await target.save();

    await logAction(
      req.user,
      'ACCOUNT_APPROVED',
      target.name,
      target.role === 'officer' ? `Assigned to ${target.assignedCentres.join(', ')}` : 'Government account approved'
    );

    res.json({ message: `${target.name} approved.`, user: target });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/admin/reject/:userId — Government only ───────────────────
router.patch('/reject/:userId', requireAuth, requireRole('government'), async (req, res) => {
  try {
    const { reason } = req.body;
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (target.status !== 'pending') {
      return res.status(400).json({ message: 'This account is not pending approval.' });
    }

    target.status = 'rejected';
    target.rejectionReason = reason || '';
    await target.save();

    await logAction(req.user, 'ACCOUNT_REJECTED', target.name, reason || '');

    res.json({ message: `${target.name} rejected.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/admin/officers/:userId/centres — Government only ────────
// Reassign an already-active officer's centre(s).
router.patch('/officers/:userId/centres', requireAuth, requireRole('government'), async (req, res) => {
  try {
    const { assignedCentres } = req.body;
    if (!Array.isArray(assignedCentres)) {
      return res.status(400).json({ message: 'assignedCentres must be an array.' });
    }

    const target = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'officer' },
      { assignedCentres },
      { new: true }
    );
    if (!target) return res.status(404).json({ message: 'Officer not found.' });

    await logAction(req.user, 'CENTRES_REASSIGNED', target.name, `Now assigned to ${assignedCentres.join(', ') || 'no centres'}`);

    res.json(target);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/farmers — Officer or Government ──────────────────────
// Farmer registry: search by name or Aadhaar, see KPP verification status.
router.get('/farmers', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    const q = (req.query.search || '').trim();
    const filter = { role: 'farmer' };
    if (q) {
      filter.$or = [
        { aadhaar: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }

    const farmers = await User.find(filter)
      .select('name phone aadhaar kisanId village district kppVerified kppVerifiedBy kppVerifiedAt createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(farmers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/admin/farmers/:userId/verify-kpp — Officer or Government ─
router.patch('/farmers/:userId/verify-kpp', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    const { verified } = req.body;
    const target = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'farmer' },
      { kppVerified: !!verified, kppVerifiedBy: req.user.name, kppVerifiedAt: new Date() },
      { new: true }
    );
    if (!target) return res.status(404).json({ message: 'Farmer not found.' });

    await logAction(req.user, verified ? 'KPP_VERIFIED' : 'KPP_UNVERIFIED', target.name, `Aadhaar ${target.aadhaar}`);

    res.json(target);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Officers may only see/verify farmers who have booked at one of their
// assigned centres. Government sees everyone.
async function officerCanAccess(reqUser, aadhaar) {
  if (reqUser.role === 'government') return true;
  const hit = await Booking.exists({ aadhaar, centreId: { $in: reqUser.assignedCentres || [] } });
  return !!hit;
}

// ── GET /api/admin/farmer-profile?aadhaar=... — full farmer record ────────
router.get('/farmer-profile', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    const aadhaar = String(req.query.aadhaar || '').trim();
    const farmer = await User.findOne({ aadhaar, role: 'farmer' });
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });
    if (!(await officerCanAccess(req.user, aadhaar))) {
      return res.status(403).json({ message: 'This farmer has not booked at your assigned centres.' });
    }
    const bookings = await Booking.find({ aadhaar }).sort({ createdAt: -1 }).limit(20)
      .select('tokenNo centreId crop quantity status slotDate slotLabel createdAt').lean();
    res.json({
      profile: fullProfile(farmer),
      bookings,
      // Files are included so the officer can preview/download them.
      files: (farmer.documents || []).map(d => ({ type: d.type, fileName: d.fileName, mimeType: d.mimeType, data: d.data })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/admin/farmer-profile/documents — verify / reject a document ─
router.patch('/farmer-profile/documents', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    const { aadhaar, type, status, reason } = req.body || {};
    if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be verified or rejected.' });
    if (status === 'rejected' && !String(reason || '').trim()) return res.status(400).json({ message: 'Please give a reason for rejecting.' });
    const farmer = await User.findOne({ aadhaar, role: 'farmer' });
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });
    if (!(await officerCanAccess(req.user, aadhaar))) {
      return res.status(403).json({ message: 'This farmer has not booked at your assigned centres.' });
    }
    const doc = (farmer.documents || []).find(d => d.type === type);
    if (!doc) return res.status(404).json({ message: 'Document not uploaded.' });
    doc.status = status;
    doc.rejectReason = status === 'rejected' ? String(reason).slice(0, 120) : '';
    doc.verifiedBy = req.user.name;
    doc.verifiedAt = new Date();
    await farmer.save();
    await logAction(req.user, status === 'verified' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED', farmer.name, `${type}${status === 'rejected' ? ' — ' + doc.rejectReason : ''}`);
    res.json({ profile: fullProfile(farmer) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/audit-log — Officer or Government ─────────────────────
router.get('/audit-log', requireAuth, requireRole('officer', 'government'), async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
