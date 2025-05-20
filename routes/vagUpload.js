const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 📁 Sicherstellen, dass Upload-Verzeichnis existiert
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// 📄 Multer-Speicherkonfiguration: speichert PDF mit token-basiertem Namen
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const token = req.body.token || 'unknown';
    cb(null, `vag45_${token}.pdf`);
  }
});

const upload = multer({ storage });


// ======================================
// 📥 POST /api/vag-upload – PDF + JSON speichern
// ======================================
router.post('/vag-upload', upload.single('pdf'), (req, res) => {
  const token = req.body.token;
  const antworten = req.body.antworten;

  if (!token || !antworten) {
    return res.status(400).json({ error: 'Token oder Antwortdaten fehlen' });
  }

  // 📄 JSON-Datei speichern
  const jsonPath = path.join(uploadPath, `vag45_${token}.json`);
  try {
    fs.writeFileSync(jsonPath, antworten); // `antworten` ist bereits JSON.stringify im Frontend
  } catch (err) {
    console.error('❌ Fehler beim Speichern der JSON-Datei:', err);
    return res.status(500).json({ error: 'Fehler beim Speichern der Antwortdaten' });
  }

  console.log('✅ PDF + JSON empfangen und gespeichert für Token:', token);
  res.status(200).json({ message: 'PDF und Antwortdaten erfolgreich gespeichert' });
});


// ======================================
// 📤 GET /api/vag-daten/:token – Antwortdaten laden
// ======================================
router.get('/vag-daten/:token', (req, res) => {
  const token = req.params.token;
  const jsonPath = path.join(uploadPath, `vag45_${token}.json`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: 'Keine Daten gefunden für diesen Token' });
  }

  try {
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    res.status(200).json(JSON.parse(jsonData));
  } catch (err) {
    console.error('❌ Fehler beim Lesen der JSON-Datei:', err);
    res.status(500).json({ error: 'Fehler beim Lesen der Antwortdaten' });
  }
});

module.exports = router;
