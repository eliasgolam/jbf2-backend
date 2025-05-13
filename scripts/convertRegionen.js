const fs = require("fs");
const XLSX = require("xlsx");

const wb = XLSX.readFile("data/praemienregionen_2025.xlsx");
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
const regionZuordnungen = rows.map(r => ({ bfs: r[1], region: r[3] }));
fs.writeFileSync("data/praemienregionen_2025.json", JSON.stringify(regionZuordnungen, null, 2));

console.log("✅ praemienregionen_2025.xlsx wurde konvertiert → praemienregionen_2025.json");
