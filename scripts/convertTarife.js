const fs = require("fs");
const XLSX = require("xlsx");

try {
  // 1. XLSX-Datei laden
  const workbook = XLSX.readFile("data/gesamtbericht_ch.xlsx");

  // 2. Sheet in JSON umwandeln
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets["Export"]);

  // 3. Nur benötigte Felder extrahieren
  const neededKeys = [
    "Versicherer",
    "Kanton",
    "Region",
    "Altersklasse",
    "Altersuntergruppe",
    "Unfalleinschluss",
    "Franchise",
    "Prämie",
    "Tarifbezeichnung",
    "Tarif-ID"
  ];

  const filtered = sheet.map(entry => {
    const out = {};
    neededKeys.forEach(key => {
      if (entry[key] !== undefined) {
        out[key] = entry[key];
      }
    });
    return out;
  });

  // 4. Gefiltertes JSON speichern (minifiziert)
  fs.writeFileSync("data/gesamtbericht_ch.json", JSON.stringify(filtered));
  console.log(`✅ ${filtered.length} Tarife erfolgreich konvertiert und minifiziert!`);
} catch (err) {
  console.error("❌ Fehler beim Konvertieren:", err);
}
