const mongoose = require('mongoose');

const KundeSchema = new mongoose.Schema({
  vorname: { type: String, required: true },
  nachname: { type: String, required: true },
  geburtsdatum: { type: String, required: true },
  adresse: { type: String, required: true },
  plz: { type: String, required: true },
  ort: { type: String, required: true },
  zivilstand: { type: String, required: true },
  raucher: { type: String, required: true },
  kinder: { type: String, required: true },
  beruf: { type: String, required: true },
  email: { type: String, required: true },
  telefonnummer: { type: String, required: true },
  besitzer: { type: String, required: true }, // Besitzer-ID (z.B. Email oder Google-ID)
  erstelltAm: { type: Date, default: Date.now },

  // ✅ NEU: Speicherung des PDF-Zustands (Antworten + Signaturen etc.)
  vag45Antworten: {
    type: Object,
    default: null
  }
});

module.exports = mongoose.model('Kunde', KundeSchema);
