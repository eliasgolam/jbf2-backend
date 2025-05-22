const express = require('express');
const router = express.Router();

// Kunden-ID in Session setzen
router.post('/setKunde', (req, res) => {
  const { kundenId } = req.body;
  if (!kundenId) return res.status(400).json({ message: 'kundenId fehlt' });

  req.session.kundenId = kundenId;
  return res.status(200).json({ message: 'Aktiver Kunde gespeichert' });
});

// Aktiven Kunden auslesen
router.get('/getKunde', (req, res) => {
  if (!req.session.kundenId) return res.status(404).json({ message: 'Kein Kunde aktiv' });
  return res.status(200).json({ kundenId: req.session.kundenId });
});

// Session löschen (z. B. bei Logout)
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: 'Session gelöscht' });
  });
});

module.exports = router;
