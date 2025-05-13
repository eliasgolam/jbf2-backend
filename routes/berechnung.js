// routes/berechnung.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// 🔧 JSON-Dateien sicher laden (unabhängig vom Arbeitsverzeichnis)
const tarife = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/gesamtbericht_ch.json"), "utf8"));
const gemeinden = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/amtovz_gemeinden.json"), "utf8"));
const regionZuordnungen = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/praemienregionen_2025.json"), "utf8"));

const region0Kantone = ["SO", "ZG", "SZ", "NW", "OW", "GL", "AI", "AR", "JU", "NE", "TG", "UR"];

router.post("/berechne", async (req, res) => {
  const { personen } = req.body;

  if (!personen || !Array.isArray(personen)) {
    return res.status(400).json({ error: "Fehlende oder ungültige Eingabe." });
  }

  const gruppiert = {};

  for (const p of personen) {
    const alter = new Date().getFullYear() - parseInt(p.geburtsjahr);
    const akl = alter < 18 ? "AKL-KIN" : alter >= 26 ? "AKL-ERW" : "AKL-JUG";
    const untergruppe = akl === "AKL-KIN" ? "K1" : null;

    const plzOnly = (p.plz || "").split(" ")[0].trim();
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
          summe: praemie,
          id,
          kanton,
          region: regCode,
          akl,
          untergruppe,
          unfall: p.unfall,
          franchise: p.franchise
        };
      }
    }
  }

  const resultate = Object.values(gruppiert)
    .sort((a, b) => a.summe - b.summe)
    .slice(0, 10);

  res.json(resultate);
});

module.exports = router;
