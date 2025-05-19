// backend/routes/vagUpload.js
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

// 📄 Dateispeicher-Strategie mit Token als Dateiname
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const token = req.body.token || 'unknown';
    cb(null, `vag45_${token}.pdf`);
  }
});

const upload = multer({ storage });

// 📥 POST /api/vag-upload – PDF-Datei speichern
router.post('/vag-upload', upload.single('pdf'), (req, res) => {
  console.log('✅ PDF empfangen für Token:', req.body.token);
  res.status(200).json({ message: 'PDF erfolgreich gespeichert' });
});

module.exports = router;
