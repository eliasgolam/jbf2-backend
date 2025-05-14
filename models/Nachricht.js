const mongoose = require('mongoose');

const NachrichtSchema = new mongoose.Schema({
  sender: { type: String, required: true },       // z. B. elias.golam@jbfinanz.ch
  empfaenger: { type: String, required: true },   // z. B. susanne.fritz@jbfinanz.ch
  inhalt: { type: String, required: true },
  gelesen: { type: Boolean, default: false },
  erstelltAm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Nachricht', NachrichtSchema);
