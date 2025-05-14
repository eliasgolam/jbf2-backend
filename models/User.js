const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  role: { type: String, enum: ['admin', 'mitarbeiter'], required: true },
  erstelltAm: { type: Date, default: Date.now },
  innendienst: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
