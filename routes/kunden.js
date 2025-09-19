const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const checkKundenSession = require('../middleware/sessionKunde');

// ✅ Zentrale keyMap für alle Tools
const keyMap = {
  budget: 'budget',
  sparrechner: 'savingsPlanner',
  savingsplanner: 'savingsPlanner',
  zinsvergleich: 'interestCompare',
  pension: 'pension',
  gesundheit: 'health',
  health: 'health',
  immobilien: 'property',
  property: 'property',
  kinder: 'children',
  children: 'children'
};

// ✅ Throttling für duplicate saves per user+tool
const recentSaves = new Map(); // key: userId:tool -> lastHash + ts

// ✅ Normalize SavingsPlanner data
function normalizeSavingsPlanner(body) {
  const num = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/\sCHF\s/gi,'').replace(/'/g,"'").replace(/'/g,'').replace(/\s/g,'').replace(/,/g,'.');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };
  return {
    startCapital: num(body.startCapital),
    monthlySaving: num(body.monthlySaving),
    rate: num(body.rate),
    years: num(body.years),
    endValue: num(body.endValue),
    interval: body.interval || 'monthly',
    chartData: Array.isArray(body.chartData) ? body.chartData.map(p => ({
      x: p.x ?? p.year ?? null,
      y: p.y ?? p.value ?? null
    })).filter(p => p.x !== null && p.y !== null) : []
  };
}

// 🟢 Neuen Kunden anlegen (öffentlich aufrufbar)
router.post('/', async (req, res) => {
  console.log("📥 Eingehende Kundendaten:", req.body);

  try {
    const neuerKunde = new Kunde({
      anrede:        req.body.anrede,
      vorname:       req.body.vorname,
      nachname:      req.body.nachname,
      geburtsdatum:  req.body.geburtsdatum,
      adresse:       req.body.adresse,
      plz:           req.body.plz,
      ort:           req.body.ort,
      zivilstand:    req.body.zivilstand,
      raucher:       req.body.raucher,
      kinder:        req.body.kinder,
      beruf:         req.body.beruf,
      email:         req.body.email,
      telefonnummer: req.body.telefonnummer,
      besitzer:      req.body.besitzer
    });

    const gespeicherterKunde = await neuerKunde.save();
    // ⬇️ hier wird der Kunde direkt als „aktiver Kunde“ in die Session geschrieben
    req.session.kundenId = gespeicherterKunde._id;

    res.status(201).json(gespeicherterKunde);
  } catch (err) {
    console.error("❌ Fehler beim Speichern:", err.message, err.errors || err);
    res.status(500).json({ message: 'Fehler beim Speichern des Kunden.' });
  }
});

// 🟢 Eigene Kunden abrufen
router.get('/besitzer/:besitzerId', async (req, res) => {
  try {
    const kunden = await Kunde.find({ besitzer: req.params.besitzerId });
    res.json(kunden);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Fehler beim Abrufen der Kunden.' });
  }
});

// 🔒 Kunden aktualisieren – NUR wenn aktiv in Session
router.put('/:id', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const updated = await Kunde.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update fehlgeschlagen.' });
  }
});

// 🔒 Kunde löschen – NUR wenn aktiv in Session
router.delete('/:id', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    await Kunde.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Löschen fehlgeschlagen.' });
  }
});

// 🔒 VAG45 ANTWORTEN SPEICHERN – nur bei aktivem Kunden
router.post('/:id/vag45', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const updated = await Kunde.findByIdAndUpdate(
      req.params.id,
      { vag45Antworten: req.body },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error('❌ Fehler beim Speichern der VAG45-Antworten:', err);
    res.status(500).json({ message: 'Fehler beim Speichern.' });
  }
});

// 🔒 VAG45 ANTWORTEN LADEN – nur bei aktivem Kunden
router.get('/:id/vag45', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;

  if (kundenId !== req.params.id) {
    return res.status(403).json({ message: 'Aktiver Kunde stimmt nicht mit Ziel-Kunde überein.' });
  }

  try {
    const kunde = await Kunde.findById(req.params.id);
    if (!kunde?.vag45Antworten) {
      return res.status(404).json({ message: 'Keine VAG-Daten vorhanden.' });
    }
    res.status(200).json(kunde.vag45Antworten);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen der VAG45-Antworten:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen.' });
  }
});

// 🟢 Einzelnen Kunden abrufen – öffentlich
router.get('/:id', async (req, res) => {
  try {
    const kunde = await Kunde.findById(req.params.id);
    if (!kunde) {
      return res.status(404).json({ message: 'Kunde nicht gefunden' });
    }
    res.json(kunde);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen des Kunden:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen des Kunden.' });
  }
});

// 🔒 Tool-Daten SPEICHERN – nur für aktiven Kunden
router.post('/session/toolDaten/:toolname', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;
  
  // ✅ Tool-Namen normalisieren und defensiv mappen
  const toolName = (req.params.toolname || '').toLowerCase();
  const key = keyMap[toolName] || toolName;
  
  if (!['budget','savingsPlanner','pension','health','property','children'].includes(key)) {
    return res.status(400).json({ error: `Unsupported toolname: ${toolName}` });
  }
  
  // ✅ Normalize payload based on tool type
  let payload = req.body || {};
  if (key === 'savingsPlanner') {
    payload = normalizeSavingsPlanner(payload);
    // also keep legacy aliases for PDF robustness
    processedPayload = {
      ...payload,
      anfangskapital: payload.startCapital,
      sparrate: payload.monthlySaving,
      jahre: payload.years,
      endkapital: payload.endValue,
      zielbetrag: payload.endValue
    };
  }
  
  // ✅ Throttling: Check for duplicate saves within 2 seconds
  const saveKey = `${kundenId}:${key}`;
  const now = Date.now();
  const hash = JSON.stringify(payload);
  const last = recentSaves.get(saveKey);
  
  if (last && last.hash === hash && (now - last.ts) < 2000) {
    // Duplicate within 2s; skip
    return res.json({ ok: true, skipped: true });
  }
  
  // ✅ Update throttling map
  recentSaves.set(saveKey, { hash, ts: now });
  
  console.log('[SESSION] Saving tool', toolName, '->', key, 'keys:', Object.keys(payload || {}));
  
  // ✅ Defensive Datenextraktion je Tool (legacy compatibility)
  const safeNum = (v) => v===null||v===undefined||v==='' ? 0 : (isFinite(Number(v))?Number(v):0);
  const b = payload || {};
  let processedPayload;
  
  // ✅ Process payload for legacy compatibility (only for non-savingsPlanner tools)
  if (key !== 'savingsPlanner') {
    switch (key) {
      case 'budget': {
        processedPayload = {
          income: safeNum(b.summeEinnahmen ?? b.totalIncome ?? b.income),
          expenses: safeNum(b.summeAusgaben ?? b.totalExpenses ?? b.expenses),
          available: safeNum(b.available),
          savings: safeNum(b.savings ?? b.sparquote ?? b.savingsRate),
          notes: b.notes,
          // include grid when present so PDF can render details
          values: b.values,
          customRows: b.customRows
        };
        break;
      }
      case 'pension': {
        processedPayload = {
          pensionsluecke: b.pensionsluecke,
          entnahmezeitraum: safeNum(b.entnahmezeitraum),
          pensionsantritt: b.pensionsantritt,
          startdatum: b.startdatum,
          zinsEntnahme: safeNum(b.zinsEntnahme),
          zinsSparen: safeNum(b.zinsSparen),
          anfangskapital: b.anfangskapital,
          sparrate: safeNum(b.sparrate),
          pillar3a: safeNum(b.pillar3a ?? b['3a']),
          pillar3b: safeNum(b.pillar3b ?? b['3b']),
          lifeInsurance: safeNum(b.lifeInsurance ?? b.lebensversicherung),
          chartData: b.chartData
        };
        break;
      }
      case 'health': {
        processedPayload = {
          premiumAdult: safeNum(b.premiumAdult ?? b.premium ?? b.praemie),
          yearlyCost: safeNum(b.yearlyCost ?? b.annualPremium),
          franchise: safeNum(b.franchise),
          provider: b.provider ?? b.anbieter,
          // IV Felder mit übernehmen:
          name: b.name, 
          vorname: b.vorname, 
          geburtsdatum: b.geburtsdatum,
          zivilstand: b.zivilstand, 
          kinder: b.kinder, 
          bruttoLohn: b.bruttoLohn,
          versicherterLohn: b.versicherterLohn, 
          pensionskassenKapital: b.pensionskassenKapital,
          benoetigtesEinkommen: b.benoetigtesEinkommen, 
          bvgRente: b.bvgRente,
          lohnzuwachs: b.lohnzuwachs, 
          eintrittsalter: b.eintrittsalter
        };
        break;
      }
      case 'property': {
        processedPayload = {
          propertyValue: safeNum(b.objektkosten ?? b.propertyValue ?? b.value),
          equity: safeNum(b.eigenmittel ?? b.equity),
          mortgage: safeNum(b.result?.hypothek1 ?? b.mortgage ?? b.hypothek),
          affordabilityRatio: safeNum(b.result?.tragbarkeit ?? b.affordability ?? b.tragbarkeit),
          monthlyPayment: safeNum(b.result?.totalBelastung ?? b.monthlyPayment),
          interestRate: safeNum(b.interestRate ?? b.zinssatz),
          amortization: safeNum(b.result?.amortisation ?? b.amortization),
        };
        break;
      }
      case 'children': {
        processedPayload = {
          count: safeNum(b.anzahl ?? b.count ?? b.kinderAnzahl ?? b.numberOfChildren),
          monthlyCosts: safeNum(b.kosten ?? b.monthlyCosts ?? b.monatlicheKosten ?? b.monthlyCost),
          monthlyContribution: safeNum(b.beitrag ?? b.monthlyContribution ?? b.monatlicherBeitrag ?? b.contribution),
        };
        break;
      }
      case 'zinsvergleich': {
        processedPayload = {
          initial: safeNum(b.initial),
          monthly: safeNum(b.monthly),
          interval: b.interval || 'monatlich',
          mode: b.mode || 'vorschüssig',
          years: safeNum(b.years),
          rates: Array.isArray(b.rates) ? b.rates.map(safeNum) : [],
          totals: Array.isArray(b.totals) ? b.totals : [],
          chartData: Array.isArray(b.chartData) ? b.chartData : []
        };
        break;
      }
      default: {
        processedPayload = payload;
        break;
      }
    }
  } else {
    // For savingsPlanner, use the already normalized payload
    processedPayload = processedPayload || payload;
  }
  
  console.log('[SESSION] Tool saved:', key, Object.keys(processedPayload||{}));

  try {
    const update = {};
    update[`toolDaten.${key}`] = processedPayload;

    const updatedKunde = await Kunde.findByIdAndUpdate(
      kundenId,
      { $set: update },
      { new: true }
    );

    // ✅ Speichere auch in Advice-Session für PDF-Generierung
    const { getRepository } = require('../src/config/database');
    const adviceRepository = getRepository();
    
    let sessionPatch = {};
    
    if (key === 'budget') {
      sessionPatch.budget = processedPayload;
    } else if (key === 'savingsPlanner') {
      sessionPatch.savingsPlanner = processedPayload;
    } else if (key === 'pension') {
      sessionPatch.pension = processedPayload;
    } else if (key === 'health') {
      sessionPatch.health = processedPayload;
    } else if (key === 'property') {
      sessionPatch.property = processedPayload;
    } else if (key === 'children') {
      sessionPatch.children = processedPayload;
    } else if (key === 'interestCompare') {
      sessionPatch.interestCompare = processedPayload;
    } else {
      // Diese Tools haben keine spezifische PDF-Section, aber wir loggen sie
      console.log(`[SESSION] Tool ${toolName} (${key}) gespeichert, aber keine PDF-Section definiert`);
    }
    
    // Speichere in Advice-Session falls Patch vorhanden
    if (Object.keys(sessionPatch).length > 0) {
      await adviceRepository.update(kundenId, sessionPatch);
      console.log('[SESSION] Tool saved:', key);
    }

    res.status(200).json(updatedKunde);
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Tool-Daten:', err);
    res.status(500).json({ message: 'Fehler beim Speichern der Tool-Daten.' });
  }
});

// 🔒 Tool-Daten LADEN – nur für aktiven Kunden
router.get('/session/toolDaten/:toolname', checkKundenSession, async (req, res) => {
  const kundenId = req.session.kundenId;
  const toolName = (req.params.toolname || '').toLowerCase();
  const key = keyMap[toolName] || toolName;
  console.log('[SESSION] Loading tool', toolName, '->', key);

  try {
    const kunde = await Kunde.findById(kundenId).lean();
    const daten = kunde?.toolDaten?.[key] || null;

    res.status(200).json(daten);
  } catch (err) {
    console.error('❌ Fehler beim Laden der Tool-Daten:', err);
    res.status(500).json({ message: 'Fehler beim Laden der Tool-Daten.' });
  }
});


module.exports = router;
