const express = require('express');
const router = express.Router();
const User = require('../models/User');

// User erstellen oder aktualisieren
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

module.exports = router;
