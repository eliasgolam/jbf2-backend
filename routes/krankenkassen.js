const express = require('express');
const router = express.Router();
const KrankenkassenDaten = require('../models/Krankenkassendaten');

// GET: Alle Krankenkassen-Daten als Objekt
router.get('/', async (req, res) => {
  try {
    const daten = await KrankenkassenDaten.find({});
    const result = {};
    daten.forEach(entry => {
      result[entry.name] = entry.data;
    });
    res.json({ daten: result });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Krankenkassendaten.' });
  }
});

// POST: Eine einzelne Krankenkasse speichern
router.post('/', async (req, res) => {
  try {
    const [name] = Object.keys(req.body);
    const data = req.body[name];

    await KrankenkassenDaten.findOneAndUpdate(
      { name },
      { data },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: `Daten für ${name} gespeichert.` });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Speichern der Krankenkassendaten.' });
  }
});

module.exports = router;
