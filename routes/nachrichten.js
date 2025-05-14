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

// Nachricht archivieren
router.put('/:id/archivieren', async (req, res) => {
  try {
    const updated = await Nachricht.findByIdAndUpdate(req.params.id, { archiviert: true }, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Archivieren.' });
  }
});

// Nachricht löschen
router.delete('/:id', async (req, res) => {
  try {
    await Nachricht.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Nachricht gelöscht.' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Löschen.' });
  }
});

// Archivierte Nachrichten eines Benutzers abrufen
router.get('/archiviert/:email', async (req, res) => {
  try {
    const daten = await Nachricht.find({
      archiviert: true,
      $or: [
        { sender: req.params.email },
        { empfaenger: req.params.email }
      ]
    }).sort({ erstelltAm: -1 });

    res.status(200).json(daten);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen archivierter Nachrichten.' });
  }
});


module.exports = router;
