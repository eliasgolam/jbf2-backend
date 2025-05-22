const mongoose = require('mongoose');

const KundeSchema = new mongoose.Schema({
  anrede: { type: String, required: true },                // z. B. Herr, Frau, Divers
  vorname: { type: String, required: true },
  nachname: { type: String, required: true },
  geburtsdatum: { type: String, required: true },          // z. B. "1990-01-01"
  adresse: { type: String, required: true },               // vollständige Adresse
  plz: { type: String, required: true },                   // separat eingegeben
  ort: { type: String, required: true },                   // separat eingegeben
  zivilstand: { type: String, required: true },            // z. B. "Verheiratet"
  raucher: { type: String, required: true },               // "Raucher" oder "Nicht-Raucher"
  kinder: { type: String, required: true },                // z. B. "2"
  beruf: { type: String, required: true },
  email: { type: String, required: true },
  telefonnummer: { type: String, required: true },
  besitzer: { type: String, required: true },              // Email oder Google-ID

  erstelltAm: { type: Date, default: Date.now },           // automatisch gesetzt

  vag45Antworten: {
    type: Object,
    default: null
  }
});

module.exports = mongoose.model('Kunde', KundeSchema);
