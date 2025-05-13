const fs = require("fs");
const Papa = require("papaparse");

try {
  const csv = fs.readFileSync("data/amtovz_gemeinden.csv", "utf8");

  const parsed = Papa.parse(csv, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true
  });

  if (!parsed || !parsed.data || parsed.data.length === 0) {
    console.error("❌ CSV leer oder konnte nicht geparst werden.");
  } else {
    fs.writeFileSync("data/amtovz_gemeinden.json", JSON.stringify(parsed.data, null, 2));
    console.log("✅ amtovz_gemeinden.csv → JSON erfolgreich exportiert.");
  }

} catch (err) {
  console.error("❌ Fehler beim Lesen oder Schreiben:", err);
}
