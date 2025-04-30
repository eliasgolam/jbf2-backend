const express = require('express');
const router = express.Router();
const KrankenkassenDaten = require('../models/KrankenkassenDaten');

// Krankenkassendaten abrufen
router.get('/', async (req, res) => {
  try {
    const daten = await KrankenkassenDaten.findOne().sort({ erstelltAm: -1 });
    res.json(daten || {});
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Krankenkassendaten.' });
  }
});

// Krankenkassendaten speichern
router.post('/', async (req, res) => {
  try {
    const neueDaten = new KrankenkassenDaten({ daten: req.body });
    await neueDaten.save();
    res.status(200).json({ message: 'Daten gespeichert.' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Speichern der Krankenkassendaten.' });
  }
});

module.exports = router;
