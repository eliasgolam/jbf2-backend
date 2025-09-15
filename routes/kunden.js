const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const checkKundenSession = require('../middleware/sessionKunde');

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
  const normalize = (s) => (s || '').toLowerCase().trim();
  const mapTool = (t) => {
    if (['budget'].includes(t)) return 'budget';
    if (['savingsplanner','sparrechner','sparen','savings'].includes(t)) return 'savingsPlanner';
    if (['pension','vorsorge','pensionsplan','vorsorgerechner','vorsorgeplanung'].includes(t)) return 'pension';
    if (['health','gesundheit','krankenkasse','ivrechner','iv'].includes(t)) return 'health';
    if (['property','immobilie','tragbarkeit','tragbarkeitsrechner'].includes(t)) return 'property';
    if (['children','kinder','kinderplanung','kinderabsichern'].includes(t)) return 'children';
    return t;
  };
  
  const raw = req.body.toolname || req.params.tool || req.params.toolname;
  const toolKey = mapTool(normalize(raw));
  
  if (!['budget','savingsPlanner','pension','health','property','children'].includes(toolKey)) {
    return res.status(400).json({ error: `Unsupported toolname: ${raw}` });
  }
  
  console.log('[SESSION] Incoming tool:', raw, '=>', toolKey);
  
  // ✅ Defensive Datenextraktion je Tool
  const safeNum = (v) => v===null||v===undefined ? undefined : (isFinite(Number(v))?Number(v):undefined);
  const b = req.body || {};
  let payload;
  
  switch (toolKey) {
    case 'budget': {
      payload = {
        income: safeNum(b.summeEinnahmen ?? b.totalIncome ?? b.income),
        expenses: safeNum(b.summeAusgaben ?? b.totalExpenses ?? b.expenses),
        available: safeNum(b.available),
        savings: safeNum(b.savings ?? b.sparquote ?? b.savingsRate),
        notes: b.notes
      };
      break;
    }
    case 'savingsPlanner': {
      payload = {
        ziel: b.ziel,
        intervall: b.intervall,
        startCapital: safeNum(b.anfangskapital ?? b.startCapital ?? b.startkapital),
        monthlySaving: safeNum(b.sparrate ?? b.monthlyRate ?? b.monatlicheRate),
        rate: safeNum(b.zinssatz ?? b.ratePercent ?? b.interestRate),
        years: safeNum(b.jahre ?? b.laufzeit ?? b.years),
        endValue: safeNum(b.endkapital ?? b.endAmount ?? b.endValue),
        chartData: b.chartData
      };
      break;
    }
    case 'pension': {
      payload = {
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
      payload = {
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
      payload = {
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
      payload = {
        count: safeNum(b.anzahl ?? b.count ?? b.kinderAnzahl ?? b.numberOfChildren),
        monthlyCosts: safeNum(b.kosten ?? b.monthlyCosts ?? b.monatlicheKosten ?? b.monthlyCost),
        monthlyContribution: safeNum(b.beitrag ?? b.monthlyContribution ?? b.monatlicherBeitrag ?? b.contribution),
      };
      break;
    }
  }
  
  console.log('[SESSION] Tool parsed:', toolKey, 'keys:', Object.keys(payload||{}));

  try {
    const update = {};
    update[`toolDaten.${toolKey}`] = payload;

    const updatedKunde = await Kunde.findByIdAndUpdate(
      kundenId,
      { $set: update },
      { new: true }
    );

    // ✅ Speichere auch in Advice-Session für PDF-Generierung
    const { getRepository } = require('../src/config/database');
    const adviceRepository = getRepository();
    
    let sessionPatch = {};
    
    if (toolKey === 'budget') {
      sessionPatch.budget = payload;
    } else if (toolKey === 'savingsPlanner') {
      sessionPatch.savingsPlanner = payload;
    } else if (toolKey === 'pension') {
      sessionPatch.pension = payload;
    } else if (toolKey === 'health') {
      sessionPatch.health = payload;
    } else if (toolKey === 'property') {
      sessionPatch.property = payload;
    } else if (toolKey === 'children') {
      sessionPatch.children = payload;
    } else {
      // Diese Tools haben keine spezifische PDF-Section, aber wir loggen sie
      console.log(`[SESSION] Tool ${raw} (${toolKey}) gespeichert, aber keine PDF-Section definiert`);
    }
    
    // Speichere in Advice-Session falls Patch vorhanden
    if (Object.keys(sessionPatch).length > 0) {
      await adviceRepository.update(kundenId, sessionPatch);
      console.log('[SESSION] Tool saved:', toolKey);
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
  const toolname = req.params.toolname;

  try {
    const kunde = await Kunde.findById(kundenId).lean();
    const daten = kunde?.toolDaten?.[toolname] || null;

    res.status(200).json(daten);
  } catch (err) {
    console.error('❌ Fehler beim Laden der Tool-Daten:', err);
    res.status(500).json({ message: 'Fehler beim Laden der Tool-Daten.' });
  }
});


module.exports = router;
