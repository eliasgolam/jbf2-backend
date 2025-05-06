const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Pfad zur JSON-Datei für alle Antworten
const datenPfad = path.join(__dirname, '..', 'data', 'antworten.json');

// Funktion: Antworten laden
const ladeAntworten = () => {
  try {
    if (!fs.existsSync(datenPfad)) return {};
    const daten = fs.readFileSync(datenPfad, 'utf-8');
    return JSON.parse(daten);
  } catch (err) {
    console.error('❌ Fehler beim Laden der Antworten:', err);
    return {};
  }
};

// Funktion: Antworten speichern
const speichereAntworten = (alleAntworten) => {
  try {
    fs.writeFileSync(datenPfad, JSON.stringify(alleAntworten, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Antworten:', err);
  }
};

// ✅ GET /api/antworten/:email
router.get('/:email', (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const email = decodeURIComponent(req.params.email);
  const alleAntworten = ladeAntworten();

  if (!alleAntworten[email]) {
    return res.status(404).json({ message: 'Keine Daten gefunden.' });
  }

  res.status(200).json(alleAntworten[email]);
});

// ✅ POST /api/antworten/:email
router.post('/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const daten = req.body;

  const alleAntworten = ladeAntworten();
  alleAntworten[email] = daten;
  speichereAntworten(alleAntworten);

  res.status(200).json({ message: 'Antworten gespeichert.' });
});

module.exports = router;
