const express = require('express');
const fs = require('fs');
const path = require('path');
const checkKundenSession = require('../middleware/sessionKunde');

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

// ✅ GET /api/antworten/:email (künftig wird kundenId verwendet)
router.get('/:email', checkKundenSession, (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const kundenId = req.session.kundenId;
  const alleAntworten = ladeAntworten();

  if (!alleAntworten[kundenId]) {
    return res.status(404).json({ message: 'Keine Daten gefunden.' });
  }

  res.status(200).json(alleAntworten[kundenId]);
});

// ✅ POST /api/antworten/:email (künftig wird kundenId verwendet)
router.post('/:email', checkKundenSession, (req, res) => {
  const kundenId = req.session.kundenId;
  const daten = req.body;

  const alleAntworten = ladeAntworten();
  alleAntworten[kundenId] = daten;

  speichereAntworten(alleAntworten);

  res.status(200).json({ message: 'Antworten gespeichert.' });
});

module.exports = router;
