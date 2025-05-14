const express = require('express');
const router = express.Router();
const Nachricht = require('../models/Nachricht');

// Neue Nachricht senden
router.post('/', async (req, res) => {
  try {
    const nachricht = new Nachricht(req.body);
    await nachricht.save();
    res.status(201).json(nachricht);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Senden.' });
  }
});

// Alle empfangenen Nachrichten für einen Benutzer
router.get('/empfangen/:email', async (req, res) => {
  try {
    const daten = await Nachricht.find({ empfaenger: req.params.email }).sort({ erstelltAm: -1 });
    res.status(200).json(daten);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen.' });
  }
});

// Alle gesendeten Nachrichten eines Benutzers
router.get('/gesendet/:email', async (req, res) => {
  try {
    const daten = await Nachricht.find({ sender: req.params.email }).sort({ erstelltAm: -1 });
    res.status(200).json(daten);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen.' });
  }
});

// Einzelne Nachricht als gelesen markieren
router.put('/:id/gelesen', async (req, res) => {
  try {
    const updated = await Nachricht.findByIdAndUpdate(req.params.id, { gelesen: true }, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren.' });
  }
});

module.exports = router;
