const mongoose = require('mongoose');

const NachrichtSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  empfaenger: { type: String, required: true },
  inhalt: { type: String, required: true },
  gelesen: { type: Boolean, default: false },
  archiviert: { type: Boolean, default: false }, // ✅ HINZUGEFÜGT
  erstelltAm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Nachricht', NachrichtSchema);
