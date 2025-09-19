/**
 * Tool Loader Service
 * Lädt fehlende Tool-Daten aus der Kunde-Datenbank als Fallback
 */

const Kunde = require('../../models/Kunde');

/**
 * Lädt Tool-Daten für einen Kunden aus der Datenbank
 * @param {string} kundenId - Kunden-ID
 * @returns {Promise<Object>} Tool-Daten als Fallback
 */
async function loadToolsForCustomer(kundenId) {
  try {
    if (!kundenId) {
      console.log('[TOOL-LOADER] Keine kundenId angegeben');
      return {};
    }

    const kunde = await Kunde.findById(kundenId);
    if (!kunde) {
      console.log('[TOOL-LOADER] Kunde nicht gefunden:', kundenId);
      return {};
    }

    const toolDaten = kunde.toolDaten || {};
    console.log('[TOOL-LOADER] Gefundene Tool-Daten:', Object.keys(toolDaten));

    // Mappe Tool-Daten auf PDF-Schema
    const fallback = {};

    // Budget
    if (toolDaten.budget) {
      const budget = toolDaten.budget;
      const { values, customRows } = budget;

      // 1) If numeric summary exists, prefer it
      let income = Number(budget.income);
      let expenses = Number(budget.expenses);
      let availableNumeric = budget.available;
      let savingsNumeric = budget.savings;

      const hasNumeric = isFinite(income) || isFinite(expenses) || isFinite(availableNumeric) || isFinite(savingsNumeric);

      // 2) Otherwise compute from grid values/customRows
      if (!hasNumeric) {
        income = 0;
        expenses = 0;
        if (values) {
          const categories = [
            { name: 'einkommen', type: 'income' },
            { name: 'ausgaben', type: 'expense' }
          ];
          Object.keys(values).forEach(catName => {
            const cat = categories.find(c => c.name === catName);
            if (cat) {
              const v = values[catName] || {};
              const sum = (Number(v.kunde)||0) + (Number(v.familie)||0);
              if (cat.type === 'income') income += sum; else expenses += sum;
            }
          });
        }
        if (customRows) {
          customRows.forEach(row => {
            const sum = (Number(row.kunde)||0) + (Number(row.familie)||0);
            if (row.type === 'income') income += sum; else expenses += sum;
          });
        }
        availableNumeric = income - expenses;
        savingsNumeric = availableNumeric;
      }

      fallback.budget = {
        income: isFinite(income) ? income : 0,
        expenses: isFinite(expenses) ? expenses : 0,
        available: isFinite(availableNumeric) ? availableNumeric : (isFinite(income) && isFinite(expenses) ? income - expenses : 0),
        savings: isFinite(savingsNumeric) ? savingsNumeric : 0,
        values,
        customRows,
        notes: budget.notes || ''
      };
    }

    // Savings
    if (toolDaten.savingsPlanner || toolDaten.sparrechner || toolDaten.sparplan) {
      const savings = toolDaten.savingsPlanner || toolDaten.sparrechner || toolDaten.sparplan;
      fallback.savings = {
        startCapital: savings.startCapital || savings.startkapital || 0,
        monthlyRate: savings.monthlyRate || savings.monatlicheRate || 0,
        ratePercent: savings.ratePercent || savings.zinssatz || 0,
        years: savings.years || savings.jahre || 0,
        targetAmount: savings.targetAmount || savings.zielbetrag || 0,
        notes: savings.notes || ''
      };
    }

    // Pension
    if (toolDaten.pension || toolDaten.vorsorge || toolDaten.pensionsplan) {
      const pension = toolDaten.pension || toolDaten.vorsorge || toolDaten.pensionsplan;
      fallback.pension = {
        saeule3a: pension.saeule3a || pension.pillar3a || 0,
        saeule3b: pension.saeule3b || pension.pillar3b || 0,
        lebensversicherung: pension.lebensversicherung || pension.lifeInsurance || 0,
        notes: pension.notes || ''
      };
    }

    // Health
    if (toolDaten.health || toolDaten.gesundheit || toolDaten.ivrechner || toolDaten.krankenkasse) {
      const health = toolDaten.health || toolDaten.gesundheit || toolDaten.ivrechner || toolDaten.krankenkasse;
      fallback.health = {
        praemie: health.praemie || health.premium || 0,
        franchise: health.franchise || 0,
        selbstbehalt: health.selbstbehalt || health.deductible || 0,
        praemienregion: health.praemienregion || health.premiumRegion || 'Unbekannt',
        notes: health.notes || ''
      };
    }

    // Property
    if (toolDaten.property || toolDaten.immobilie || toolDaten.tragbarkeit || toolDaten.tragbarkeitsrechner) {
      const property = toolDaten.property || toolDaten.immobilie || toolDaten.tragbarkeit || toolDaten.tragbarkeitsrechner;
      fallback.property = {
        propertyValue: property.propertyValue || property.immobilienwert || 0,
        equity: property.equity || property.eigenkapital || 0,
        mortgage: property.mortgage || property.hypothek || 0,
        monthlyPayment: property.monthlyPayment || property.monatlicheRate || 0,
        interestRate: property.interestRate || property.zinssatz || 2.5,
        amortization: property.amortization || property.amortisation || 0,
        affordable: property.affordable || property.tragbar || false,
        notes: property.notes || ''
      };
    }

    // Children
    if (toolDaten.children || toolDaten.kinder || toolDaten.kinderplanung) {
      const children = toolDaten.children || toolDaten.kinder || toolDaten.kinderplanung;
      fallback.children = {
        anzahl: children.anzahl || children.count || 0,
        kosten: children.kosten || children.monthlyCosts || 0,
        beitrag: children.beitrag || children.monthlyContribution || 0,
        altersgruppen: children.altersgruppen || children.ageGroups || [],
        notes: children.notes || ''
      };
    }

    console.log('[TOOL-LOADER] Fallback-Daten erstellt:', Object.keys(fallback));
    return fallback;

  } catch (error) {
    console.error('[TOOL-LOADER] Fehler beim Laden der Tool-Daten:', error);
    return {};
  }
}

module.exports = {
  loadToolsForCustomer
};
