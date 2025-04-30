const mongoose = require('mongoose');

const KrankenkassenSchema = new mongoose.Schema({
  daten: { type: Object, required: true },
  erstelltAm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KrankenkassenDaten', KrankenkassenSchema);
