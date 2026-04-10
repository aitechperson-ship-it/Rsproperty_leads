const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String }, // optional if google auth is used
  role: { type: String, enum: ['Admin', 'Team Member'], default: 'Team Member' },
  auth_type: { type: String, enum: ['email', 'google'], default: 'email' },
  profile_picture: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
