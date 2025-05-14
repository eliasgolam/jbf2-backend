const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { calculatePoints, generateDescription } = require('../utils/kassenDatenBuilder');

const DATA_PATH = path.join(__dirname, '../data/kassenDaten.json');

// GET: Krankenkassendaten mit Punkten & Beschreibung
router.get('/', (req, res) => {
  fs.readFile(DATA_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Lesen der Daten' });

    const rawData = JSON.parse(data);
    const enrichedData = {};

    for (const kasse in rawData) {
      enrichedData[kasse] = {};
      for (const key in rawData[kasse]) {
        const eintrag = rawData[kasse][key];
        enrichedData[kasse][key] = {
          ...eintrag,
          points: calculatePoints(key, eintrag.value),
          description: generateDescription(key, eintrag.value)
        };
      }
    }

    res.json({ daten: enrichedData });
  });
});

router.post('/', (req, res) => {
  const updated = req.body; // z. B. { Swica: { ... } }
  const kasseName = Object.keys(updated)[0];
  const kassenWerte = updated[kasseName];

  // Berechne Punkte & Beschreibung neu
  const enriched = {};
  for (const key in kassenWerte) {
    enriched[key] = {
      ...kassenWerte[key],
      points: calculatePoints(key, kassenWerte[key].value),
      description: generateDescription(key, kassenWerte[key].value)
    };
  }

  fs.readFile(DATA_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Lesen' });

    const allData = JSON.parse(data);
    allData[kasseName] = enriched;

    fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2), 'utf8', (err) => {
      if (err) return res.status(500).json({ error: 'Fehler beim Speichern' });
      res.json({ success: true });
    });
  });
});


module.exports = router;
