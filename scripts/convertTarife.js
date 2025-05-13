const fs = require("fs");
const XLSX = require("xlsx");

const wb = XLSX.readFile("data/gesamtbericht_ch.xlsx");
const sheet = XLSX.utils.sheet_to_json(wb.Sheets["Export"]);
fs.writeFileSync("data/gesamtbericht_ch.json", JSON.stringify(sheet, null, 2));

console.log("✅ gesamtbericht_ch.xlsx wurde konvertiert → gesamtbericht_ch.json");
