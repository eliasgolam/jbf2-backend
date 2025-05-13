const fs = require("fs");
const XLSX = require("xlsx");

try {
  // 1. XLSX-Datei laden
  const workbook = XLSX.readFile("data/gesamtbericht_ch.xlsx");

  // 2. Sheet in JSON umwandeln
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets["Export"]);

  // 3. JSON minifizieren und speichern
  fs.writeFileSync("data/gesamtbericht_ch.json", JSON.stringify(sheet));
  console.log("✅ Datei wurde erfolgreich konvertiert und minifiziert!");
} catch (err) {
  console.error("❌ Fehler beim Konvertieren:", err);
}
