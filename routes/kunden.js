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
  const toolname = req.params.toolname;

  try {
    const update = {};
    update[`toolDaten.${toolname}`] = req.body;

    const updatedKunde = await Kunde.findByIdAndUpdate(
      kundenId,
      { $set: update },
      { new: true }
    );

    // ✅ Speichere auch in Advice-Session für PDF-Generierung
    const { getRepository } = require('../src/config/database');
    const adviceRepository = getRepository();
    
    let sessionPatch = {};
    
    if (toolname === 'budget') {
      // Berechne Budget-Summen für Advice-Session
      const { values, customRows } = req.body;
      const categories = [
        { name: 'einkommen', type: 'income' },
        { name: 'ausgaben', type: 'expense' }
      ];
      
      let income = 0;
      let expenses = 0;
      
      // Berechne Einkommen und Ausgaben aus values
      Object.keys(values || {}).forEach(catName => {
        const cat = categories.find(c => c.name === catName);
        if (cat) {
          const v = values[catName] || {};
          const sum = (v.kunde || 0) + (v.familie || 0);
          if (cat.type === 'income') income += sum;
          else expenses += sum;
        }
      });
      
      // Füge customRows hinzu
      if (customRows) {
        customRows.forEach(row => {
          const sum = (row.kunde || 0) + (row.familie || 0);
          if (row.type === 'income') income += sum;
          else expenses += sum;
        });
      }
      
      sessionPatch.budget = {
        income,
        expenses,
        available: income - expenses,
        savings: 0, // Wird später vom Sparrechner gesetzt
        values,
        customRows,
        notes: req.body.notes || ''
      };
    } else if (toolname === 'savingsPlanner' || toolname === 'sparrechner' || toolname === 'sparplan') {
      sessionPatch.savingsPlanner = {
        startCapital: req.body.startCapital || req.body.startkapital || 0,
        monthlyRate: req.body.monthlyRate || req.body.monatlicheRate || 0,
        ratePercent: req.body.ratePercent || req.body.zinssatz || 0,
        years: req.body.years || req.body.jahre || 0,
        targetAmount: req.body.targetAmount || req.body.zielbetrag || 0,
        notes: req.body.notes || ''
      };
    } else if (toolname === 'pension' || toolname === 'vorsorge' || toolname === 'pensionsplan') {
      sessionPatch.pension = {
        saeule3a: req.body.saeule3a || req.body.pillar3a || 0,
        saeule3b: req.body.saeule3b || req.body.pillar3b || 0,
        lebensversicherung: req.body.lebensversicherung || req.body.lifeInsurance || 0,
        notes: req.body.notes || ''
      };
    } else if (toolname === 'health' || toolname === 'gesundheit' || toolname === 'ivrechner' || toolname === 'krankenkasse') {
      sessionPatch.health = {
        praemie: req.body.praemie || req.body.premium || 0,
        franchise: req.body.franchise || 0,
        selbstbehalt: req.body.selbstbehalt || req.body.deductible || 0,
        praemienregion: req.body.praemienregion || req.body.premiumRegion || 'Unbekannt',
        notes: req.body.notes || ''
      };
    } else if (toolname === 'property' || toolname === 'immobilie' || toolname === 'tragbarkeit' || toolname === 'tragbarkeitsrechner') {
      sessionPatch.property = {
        propertyValue: req.body.propertyValue || req.body.immobilienwert || 0,
        equity: req.body.equity || req.body.eigenkapital || 0,
        mortgage: req.body.mortgage || req.body.hypothek || 0,
        monthlyPayment: req.body.monthlyPayment || req.body.monatlicheRate || 0,
        interestRate: req.body.interestRate || req.body.zinssatz || 2.5,
        amortization: req.body.amortization || req.body.amortisation || 0,
        affordable: req.body.affordable || req.body.tragbar || false,
        notes: req.body.notes || ''
      };
    } else if (toolname === 'children' || toolname === 'kinder' || toolname === 'kinderplanung') {
      sessionPatch.children = {
        anzahl: req.body.anzahl || req.body.count || 0,
        kosten: req.body.kosten || req.body.monthlyCosts || 0,
        beitrag: req.body.beitrag || req.body.monthlyContribution || 0,
        altersgruppen: req.body.altersgruppen || req.body.ageGroups || [],
        notes: req.body.notes || ''
      };
    } else if (toolname === 'wuensche' || toolname === 'empfehlungen') {
      // Diese Tools haben keine spezifische PDF-Section, aber wir loggen sie
      console.log(`[SESSION] Tool ${toolname} gespeichert, aber keine PDF-Section definiert`);
    }
    
    // Speichere in Advice-Session falls Patch vorhanden
    if (Object.keys(sessionPatch).length > 0) {
      await adviceRepository.update(kundenId, sessionPatch);
      console.log('[SESSION] updated', kundenId, Object.keys(sessionPatch));
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
