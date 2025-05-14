const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ⬆️ Bestehende Route: User erstellen oder aktualisieren
router.post('/', async (req, res) => {
  const { email, username, role } = req.body;
  try {
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email, username, role });
    } else {
      user.username = username;
      user.role = role;
    }

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Speichern des Benutzers.' });
  }
});


// 🆕 Alle Benutzer abrufen
router.get('/', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Benutzer.' });
  }
});

// 🆕 Benutzer auf Innendienst umstellen
router.put('/innendienst/:email', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { innendienst: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Innendienst-Status.' });
  }
});

// 🆕 Benutzer löschen
router.delete('/:email', async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({ email: req.params.email });
    if (!deleted) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }
    res.status(200).json({ message: 'Benutzer gelöscht.' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Löschen des Benutzers.' });
  }
});

module.exports = router;
