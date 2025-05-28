const mongoose = require('mongoose');

const KundeSchema = new mongoose.Schema({
  anrede: { type: String, required: true },
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
  besitzer: { type: String, required: true },

  erstelltAm: { type: Date, default: Date.now },

  vag45Antworten: {
    type: Object,
    default: null
  },

  toolDaten: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('Kunde', KundeSchema);
