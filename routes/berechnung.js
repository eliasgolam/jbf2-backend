// routes/berechnung.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const router = express.Router();

const CACHE_DIR = path.join(__dirname, "..", "cache");

// Hilfsfunktion für Cache-Key
function createCacheKey(personen) {
  return personen.map(p =>
    `${p.plz}_${p.franchise}_${p.unfall ? 1 : 0}_${p.geburtsjahr}`
  ).join("-");
}

// Hilfsfunktion zum Laden aller Daten
function ladeDaten() {
  const tarife = XLSX.utils.sheet_to_json(
    XLSX.readFile("data/gesamtbericht_ch.xlsx").Sheets["Export"]
  );

  const regionZuordnungen = XLSX.utils.sheet_to_json(
    XLSX.readFile("data/praemienregionen_2025.xlsx").Sheets[0],
    { header: 1 }
  ).map(r => ({ bfs: r[1], region: r[3] }));

  const gemeinden = Papa.parse(
    fs.readFileSync("data/amtovz_gemeinden.csv", "utf8"),
    { header: true, delimiter: ";" }
  ).data;

  return { tarife, gemeinden, regionZuordnungen };
}

const region0Kantone = ["SO", "ZG", "SZ", "NW", "OW", "GL", "AI", "AR", "JU", "NE", "TG", "UR"];

router.post("/berechne", async (req, res) => {
  const { personen } = req.body;
  const key = createCacheKey(personen);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);

  if (fs.existsSync(cachePath)) {
    return res.json(JSON.parse(fs.readFileSync(cachePath, "utf8")));
  }

  const { tarife, gemeinden, regionZuordnungen } = ladeDaten();
  const gruppiert = {};

  for (const p of personen) {
    const alter = new Date().getFullYear() - parseInt(p.geburtsjahr);
    const akl = alter < 18 ? "AKL-KIN" : alter >= 26 ? "AKL-ERW" : "AKL-JUG";
    const untergruppe = akl === "AKL-KIN" ? "K1" : null;
    const plzOnly = (p.plz || "").split(" ")[0];
    const gemeinde = gemeinden.find(g => g.PLZ?.trim() === plzOnly);

    if (!gemeinde) continue;

    const bfs = gemeinde["BFS-Nr"];
    const kanton = gemeinde["Kantonskürzel"];
    const istRegion0Kanton = region0Kantone.includes(kanton);
    const region = istRegion0Kanton ? null : regionZuordnungen.find(r => `${r.bfs}` === bfs);
    const regCode = istRegion0Kanton ? "PR-REG CH0" : `PR-REG CH${region?.region}`;

    const gefilterte = tarife.filter(t =>
      String(t.Kanton).trim() === kanton &&
      String(t.Region || "").trim() === regCode &&
      String(t.Altersklasse).trim() === akl &&
      (!untergruppe || String(t.Altersuntergruppe).trim() === untergruppe) &&
      String(t.Unfalleinschluss).trim() === (p.unfall ? "MIT-UNF" : "OHN-UNF") &&
      String(t.Franchise).trim() === `FRA-${p.franchise}`
    );

    for (const tarif of gefilterte) {
      const id = `${tarif.Versicherer}-${tarif["Tarif-ID"]}`;
      const praemie = parseFloat(tarif.Prämie);

      if (!gruppiert[id] || gruppiert[id].summe > praemie) {
        gruppiert[id] = {
          versicherer: tarif.Versicherer,
          modell: tarif["Tarifbezeichnung"] || "Unbekannt",
          tarifId: tarif["Tarif-ID"],
          summe: praemie
        };
      }
    }
  }

  const resultate = Object.values(gruppiert).sort((a, b) => a.summe - b.summe).slice(0, 10);

  // Speichern im Cache
  fs.writeFileSync(cachePath, JSON.stringify(resultate, null, 2), "utf8");

  res.json(resultate);
});

module.exports = router;
