const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const checkKundenSession = require('../middleware/sessionKunde');

// 🟢 Neuen Kunden anlegen (öffentlich aufrufbar)
router.post('/', async (req, res) => {
  console.log("📥 Eingehende Kundendaten:", req.body);

  try {
    const neuerKunde = new Kunde({
      anrede:        req.body.anrede,
      vorname:       req.body.vorname,
      nachname:      req.body.nachname,
      geburtsdatum:  req.body.geburtsdatum,
      adresse:       req.body.adresse,
      plz:           req.body.plz,
      ort:           req.body.ort,
      zivilstand:    req.body.zivilstand,
      raucher:       req.body.raucher,
      kinder:        req.body.kinder,
      beruf:         req.body.beruf,
      email:         req.body.email,
      telefonnummer: req.body.telefonnummer,
      besitzer:      req.body.besitzer
    });

    const gespeicherterKunde = await neuerKunde.save();
    // ⬇️ hier wird der Kunde direkt als „aktiver Kunde“ in die Session geschrieben
    req.session.kundenId = gespeicherterKunde._id;

    res.status(201).json(gespeicherterKunde);
  } catch (err) {
    console.error("❌ Fehler beim Speichern:", err.message, err.errors || err);
    res.status(500).json({ message: 'Fehler beim Speichern des Kunden.' });
  }
});

// 🟢 Eigene Kunden abrufen
router.get('/besitzer/:besitzerId', async (req, res) => {
  try {
    const kunden = await Kunde.find({ besitzer: req.params.besitzerId });
    res.json(kunden);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Fehler beim Abrufen der Kunden.' });
  }
});

// 🔒 Kunden aktualisieren – NUR wenn aktiv in Session
router.put('/:id', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const updated = await Kunde.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update fehlgeschlagen.' });
  }
});

// 🔒 Kunde löschen – NUR wenn aktiv in Session
router.delete('/:id', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    await Kunde.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Löschen fehlgeschlagen.' });
  }
});

// 🔒 VAG45 ANTWORTEN SPEICHERN – nur bei aktivem Kunden
router.post('/:id/vag45', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const updated = await Kunde.findByIdAndUpdate(
      req.params.id,
      { vag45Antworten: req.body },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error('❌ Fehler beim Speichern der VAG45-Antworten:', err);
    res.status(500).json({ message: 'Fehler beim Speichern.' });
  }
});

// 🔒 VAG45 ANTWORTEN LADEN – nur bei aktivem Kunden
router.get('/:id/vag45', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const kunde = await Kunde.findById(req.params.id);
    if (!kunde?.vag45Antworten) {
      return res.status(404).json({ message: 'Keine VAG-Daten vorhanden.' });
    }
    res.status(200).json(kunde.vag45Antworten);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen der VAG45-Antworten:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen.' });
  }
});

// 🟢 Einzelnen Kunden abrufen – öffentlich
router.get('/:id', async (req, res) => {
  try {
    const kunde = await Kunde.findById(req.params.id);
    if (!kunde) {
      return res.status(404).json({ message: 'Kunde nicht gefunden' });
    }
    res.json(kunde);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen des Kunden:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen des Kunden.' });
  }
});

module.exports = router;
