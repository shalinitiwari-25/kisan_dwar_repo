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
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
