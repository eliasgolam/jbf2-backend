const mongoose = require('mongoose');

const KrankenkassenSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Name z. B. "Innova"
  data: { type: Object, required: true },
  erstelltAm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KrankenkassenDaten', KrankenkassenSchema);
