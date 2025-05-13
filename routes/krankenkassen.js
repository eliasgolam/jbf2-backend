const express = require('express');
const router = express.Router();
const { calculatePoints, generateDescription } = require('../utils/kassenDatenBuilder');

const DEFAULTS_BY_KASSE = {
  Axa: {
    fitness: { type: 'CHF', value: 300 },
    brille: { type: 'CHF', value: 300 },
    alternativmedizin: { type: '%CHF', value: { percent: 75, amount: 3000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 3000 } },
    familienrabatt: { type: '%', value: 20 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'hoch' }
  },
  Innova: {
    fitness: { type: 'CHF', value: 250 },
    brille: { type: 'CHF', value: 200 },
    alternativmedizin: { type: '%CHF', value: { percent: 75, amount: 3000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 3000 } },
    familienrabatt: { type: '%', value: 0 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'günstig' },
    preisleistung: { type: 'DROPDOWN', value: 'günstig' }
  },
  Concordia: {
    fitness: { type: 'CHF', value: 200 },
    brille: { type: 'CHF', value: 300 },
    alternativmedizin: { type: '%CHF', value: { percent: 75, amount: 6000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 2000 } },
    familienrabatt: { type: '%', value: 10 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'hoch' }
  },
  Swica: {
    fitness: { type: 'CHF', value: 1300 },
    brille: { type: 'CHF', value: 900 },
    alternativmedizin: { type: '%CHF', value: { percent: 100, amount: 15000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 4000 } },
    familienrabatt: { type: '%', value: 47 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'hoch' },
    preisleistung: { type: 'DROPDOWN', value: 'hoch' }
  },
  Helsana: {
    fitness: { type: 'CHF', value: 400 },
    brille: { type: 'CHF', value: 500 },
    alternativmedizin: { type: '%CHF', value: { percent: 75, amount: 5000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 3000 } },
    familienrabatt: { type: '%', value: 25 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'mittel' }
  },
  Visana: {
    fitness: { type: 'CHF', value: 200 },
    brille: { type: 'CHF', value: 250 },
    alternativmedizin: { type: '%CHF', value: { percent: 90, amount: 10000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 5000 } },
    familienrabatt: { type: '%', value: 50 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'mittel' }
  },
  Sanitas: {
    fitness: { type: 'CHF', value: 400 },
    brille: { type: 'CHF', value: 600 },
    alternativmedizin: { type: '%CHF', value: { percent: 80, amount: 10000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 80, amount: 5000 } },
    familienrabatt: { type: '%', value: 0 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'hoch' },
    preisleistung: { type: 'DROPDOWN', value: 'mittel' }
  },
  Ökk: {
    fitness: { type: 'CHF', value: 300 },
    brille: { type: 'CHF', value: 480 },
    alternativmedizin: { type: '%CHF', value: { percent: 80, amount: 10000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 5000 } },
    familienrabatt: { type: '%', value: 50 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'günstig' }
  },
  CSS: {
    fitness: { type: 'CHF', value: 500 },
    brille: { type: 'CHF', value: 300 },
    alternativmedizin: { type: '%CHF', value: { percent: 75, amount: 2000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 5000 } },
    familienrabatt: { type: '%', value: 25 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'hoch' }
  },
  Sympany: {
    fitness: { type: 'CHF', value: 300 },
    brille: { type: 'CHF', value: 270 },
    alternativmedizin: { type: '%CHF', value: { percent: 100, amount: 6000 } },
    zahnversicherung: { type: '%CHF', value: { percent: 75, amount: 5000 } },
    familienrabatt: { type: '%', value: 72 },
    spitalaufenthalt: { type: 'DROPDOWN', value: 'mittel' },
    preisleistung: { type: 'DROPDOWN', value: 'hoch' }
  }
};

router.get('/', (req, res) => {
  const daten = {};

  for (const kasse in DEFAULTS_BY_KASSE) {
    const basis = DEFAULTS_BY_KASSE[kasse];
    const enriched = {};

    for (const key in basis) {
      const eintrag = basis[key];
      enriched[key] = {
        ...eintrag,
        points: calculatePoints(key, eintrag.value),
        description: generateDescription(key, eintrag.value)
      };
    }

    daten[kasse] = enriched;
  }

  res.json({ daten });
});

module.exports = router;
