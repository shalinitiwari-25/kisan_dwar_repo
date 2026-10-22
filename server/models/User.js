const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true, // stored as a bcrypt hash, never plaintext
  },
  role: {
    type: String,
    enum: ['farmer', 'officer', 'government'],
    required: true,
  },
  // Optional fields added for registration flow
  phone: { type: String, default: '' },
  aadhaar: { type: String, default: '' },
  address: { type: String, default: '' },
  bankAccount: { type: String, default: '' },
  // Role-specific location fields
  village: { type: String, default: '' },   // farmer & officer
  district: { type: String, default: '' },  // farmer & officer
  state: { type: String, default: '' },     // government (and optionally pre-filled for others)
  // Language the farmer has chosen on the website — used to send SMS
  // alerts (Mandi delay/shortage/rebooking) in their own language.
  preferredLanguage: { type: String, default: 'en' },

  // ── Officer/Government approval workflow ──────────────────────────
  // Farmers are always 'active' on registration. Officer & Government
  // accounts start 'pending' and can't log in until a Government user
  // approves them (and, for officers, assigns them to centre(s)).
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected'],
    default: 'active',
  },
  // Centre(s) this officer is authorized to manage. Enforced server-side
  // on every centre-control action, not just hidden in the UI.
  assignedCentres: { type: [String], default: [] },
  approvedBy: { type: String, default: '' },   // name of the Government user who approved this account
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  // ── Farmer profile (filled in by the farmer on the Profile page) ────
  kisanId: { type: String, default: '' },          // Kisan Pehchan Patra number
  fatherName: { type: String, default: '' },
  dob: { type: String, default: '' },              // YYYY-MM-DD
  gender: { type: String, default: '' },
  tehsil: { type: String, default: '' },
  pincode: { type: String, default: '' },
  landAcres: { type: String, default: '' },
  khasraNo: { type: String, default: '' },
  crops: { type: [String], default: [] },
  bankName: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  profileUpdatedAt: { type: Date, default: null },
  // Documents needed to book at a Mandi. `data` holds a small data-URL
  // (images are compressed in the browser; size is capped server-side).
  documents: {
    type: [{
      type: { type: String, required: true },       // aadhaar | kisanId | landRecord | bankPassbook | photo
      fileName: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      data: { type: String, default: '' },
      status: { type: String, enum: ['uploaded', 'verified', 'rejected'], default: 'uploaded' },
      rejectReason: { type: String, default: '' },
      uploadedAt: { type: Date, default: Date.now },
      verifiedBy: { type: String, default: '' },
      verifiedAt: { type: Date, default: null },
      _id: false,
    }],
    default: [],
  },

  // ── Kisan Pehchan Patra (Farmer ID) verification ──────────────────
  // Whether an officer/government user has checked and confirmed this
  // farmer's KPP, via the Farmer Registry.
  kppVerified: { type: Boolean, default: false },
  kppVerifiedBy: { type: String, default: '' },
  kppVerifiedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
