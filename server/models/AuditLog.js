const mongoose = require('mongoose');

// Every sensitive action (officer approval/rejection, centre reassignment,
// KPP verification) writes one of these, so the system is defensible in
// front of an audience: "who changed what, and when."
const auditLogSchema = new mongoose.Schema({
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },      // e.g. 'ACCOUNT_APPROVED'
  targetLabel: { type: String, default: '' },     // human-readable target, e.g. a name
  details: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
