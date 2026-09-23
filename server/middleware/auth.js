const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Falls back to a dev secret so the demo works even if JWT_SECRET isn't
// set in .env — set a real one in production. Shared with authRoutes.js
// so tokens signed there verify correctly here.
const JWT_SECRET = process.env.JWT_SECRET || 'kisan_dwar_dev_secret_change_in_production';

// Verifies the Bearer token, loads the current user (so approvals/audit
// logs can record a real name, and so a session for an account that was
// since rejected/paused stops working immediately), and attaches a small
// req.user object other middleware/routes can rely on.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('name role status assignedCentres');
    if (!user) {
      return res.status(401).json({ message: 'Invalid session. Please log in again.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is not active.' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      assignedCentres: user.assignedCentres || [],
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

// Usage: requireRole('government') or requireRole('officer', 'government')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
