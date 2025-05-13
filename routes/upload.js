const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload-tarife", upload.single("file"), (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets["Export"]);

    fs.writeFileSync("data/gesamtbericht_ch.json", JSON.stringify(sheet, null, 2));
    res.json({ success: true, message: "Tarife erfolgreich aktualisiert!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Fehler beim Verarbeiten der Datei." });
  }
});

module.exports = router;
