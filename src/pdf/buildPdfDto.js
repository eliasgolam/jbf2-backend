/**
 * PDF DTO Builder
 * Transforms AdviceSession data into PDF-ready DTO with Swiss formatting
 */

const { buildSavingsChart } = require('./charts/savingsChart');
const { buildInterestCompareChart } = require('./charts/interestCompareChart');
const { loadToolsForCustomer } = require('../services/toolLoader');

// Helper functions for robust data handling
function val(v) { return v === null || v === undefined ? undefined : v; }
function plain(o) { return (o && typeof o.toObject === 'function') ? o.toObject() : o; }
function toNumberSafe(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/\sCHF\s/i, '').replace(/'/g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Safe number conversion with fallback to 0
 * @param {any} n - Value to convert to number
 * @returns {number} Safe number or 0
 */
const safe = (n) => (typeof n === 'number' && isFinite(n) ? n : 0);

/**
 * Format currency for Swiss locale
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'CHF 0.00';
  return `CHF ${amount.toLocaleString('de-CH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Format percentage for Swiss locale
 * @param {number} value - Value to format as percentage
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

/**
 * Format date for Swiss locale
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Build budget section DTO
 * @param {Object} budget - Budget data from session
 * @returns {Object} Budget section DTO
 */
function buildBudgetSection(budget) {
  const B = budget || {};
  const income =
    val(B.income) ?? val(B.totalIncome) ?? val(B.summeEinnahmen) ?? val(B?.totals?.income);
  const expenses =
    val(B.expenses) ?? val(B.totalExpenses) ?? val(B.summeAusgaben) ?? val(B?.totals?.expense);
  const savings = val(B.savings) ?? val(B.sparquote) ?? val(B.savingsRate);
  const available = val(B.available) ?? (income !== undefined && expenses !== undefined ? income - expenses : undefined);

  const budgetSection = {
    present: [income, expenses, savings, available].some(v => v !== undefined),
    title: 'Budget',
    keyFigures: { income, expenses, savings, available },
    notes: B.notes
  };
  console.log('[PDF DTO][budget]', budgetSection);
  return budgetSection;
}


/**
 * Generate savings schedule
 * @param {number} startCapital - Starting capital
 * @param {number} monthlyRate - Monthly savings rate
 * @param {number} ratePercent - Annual interest rate
 * @param {number} years - Number of years
 * @returns {Array} Schedule array
 */
function generateSavingsSchedule(startCapital, monthlyRate, ratePercent, years) {
  const schedule = [];
  let currentCapital = startCapital;
  const monthlyRateDecimal = ratePercent / 100 / 12;

  for (let year = 1; year <= years; year++) {
    const yearStartCapital = currentCapital;
    
    // Calculate compound interest for 12 months
    for (let month = 1; month <= 12; month++) {
      currentCapital = (currentCapital + monthlyRate) * (1 + monthlyRateDecimal);
    }

    schedule.push({
      year,
      startCapital: yearStartCapital,
      monthlyRate,
      yearEndCapital: Math.round(currentCapital * 100) / 100
    });
  }

  return schedule;
}

/**
 * Build pension section DTO
 * @param {Object} pension - Pension data from session
 * @returns {Object} Pension section DTO
 */
function buildPensionSection(pension) {
  if (!pension) return { present: false };

  const pillar3a = safe(pension.saeule3a ?? pension.pillar3a ?? pension.saeule3A ?? pension.pillar3A);
  const pillar3b = safe(pension.saeule3b ?? pension.pillar3b ?? pension.saeule3B ?? pension.pillar3B);
  const lifeInsurance = safe(pension.lebensversicherung ?? pension.lifeInsurance ?? pension.lebensversicherung ?? pension.life);
  const total = pillar3a + pillar3b + lifeInsurance;

  return {
    present: true,
    title: 'Vorsorge-Planung',
    keyFigures: {
      pillar3a: safe(pillar3a),
      pillar3b: safe(pillar3b),
      lifeInsurance: safe(lifeInsurance),
      total: safe(total),
      pillar3aMonthly: safe(pillar3a / 12),
      pillar3bMonthly: safe(pillar3b / 12),
      lifeInsuranceMonthly: safe(lifeInsurance / 12),
      totalMonthly: safe(total / 12),
      pillar3aStatus: pillar3a > 0 ? 'Aktiv' : 'Inaktiv',
      pillar3bStatus: pillar3b > 0 ? 'Aktiv' : 'Inaktiv',
      lifeInsuranceStatus: lifeInsurance > 0 ? 'Aktiv' : 'Inaktiv'
    },
    notes: pension.notes || ''
  };
}

/**
 * Build health section DTO
 * @param {Object} health - Health data from session
 * @returns {Object} Health section DTO
 */
function buildHealthSection(health) {
  if (!health) return { present: false };

  const h = health || {};
  const premiumAdult = safe(h.premiumAdult ?? h.premium ?? h.praemie ?? h.monthlyPremium);
  const yearlyCost = safe(h.yearlyCost ?? h.annualPremium);
  const franchise = safe(h.franchise);
  const deductible = safe(h.selbstbehalt ?? h.deductible);
  const providerCount = safe(h.providerCount ?? h.versichererAnzahl ?? h.insuranceCount ?? 1);

  return {
    present: premiumAdult !== undefined || yearlyCost !== undefined || franchise !== undefined,
    title: 'Gesundheit',
    keyFigures: { 
      premiumAdult, 
      yearlyCost, 
      franchise,
      deductible: safe(deductible),
      providerCount: safe(providerCount),
      premiumRegion: h.praemienregion ?? h.premiumRegion ?? h.region ?? 'Unbekannt',
      maxDeductible: safe(franchise + deductible)
    },
    notes: h.notes || ''
  };
}

/**
 * Build property section DTO
 * @param {Object} property - Property data from session
 * @returns {Object} Property section DTO
 */
function buildPropertySection(property) {
  if (!property) return { present: false };

  const propertyValue = safe(property.propertyValue ?? property.immobilienwert ?? property.houseValue ?? property.value);
  const equity = safe(property.equity ?? property.eigenkapital ?? property.eigenkapital ?? property.downPayment);
  const mortgage = safe(property.mortgage ?? property.hypothek ?? property.hypothek ?? (propertyValue - equity));
  const monthlyPayment = safe(property.monthlyPayment ?? property.monatlicheRate ?? property.monatlicheZahlung ?? property.monthlyCost);
  const affordable = property.affordable ?? property.tragbar ?? property.affordable ?? false;
  const interestRate = safe(property.interestRate ?? property.zinssatz ?? property.interest ?? 2.5); // Default 2.5%
  const amortization = safe(property.amortization ?? property.amortisation ?? property.amortization ?? 0);

  return {
    present: true,
    title: 'Immobilien-Planung',
    keyFigures: {
      propertyValue: safe(propertyValue),
      mortgage: safe(mortgage),
      interestRate: safe(interestRate),
      amortization: safe(amortization),
      monthlyCost: safe(monthlyPayment),
      affordabilityRatio: propertyValue > 0 ? safe((monthlyPayment * 12) / propertyValue * 100) : 0,
      equity: safe(equity),
      affordable: Boolean(affordable),
      equityRatio: propertyValue > 0 ? safe((equity / propertyValue) * 100) : 0,
      mortgageRatio: propertyValue > 0 ? safe((mortgage / propertyValue) * 100) : 0,
      requiredIncome: safe(monthlyPayment * 3) // 1/3 rule
    },
    notes: property.notes || ''
  };
}

/**
 * Build children section DTO
 * @param {Object} children - Children data from session
 * @returns {Object} Children section DTO
 */
function buildChildrenSection(children) {
  if (!children) return { present: false };

  const count = safe(children.anzahl ?? children.count ?? children.kinderAnzahl ?? children.numberOfChildren);
  const monthlyCosts = safe(children.kosten ?? children.monthlyCosts ?? children.monatlicheKosten ?? children.monthlyCost);
  const monthlyContribution = safe(children.beitrag ?? children.monthlyContribution ?? children.monatlicherBeitrag ?? children.contribution);
  const ageGroups = children.altersgruppen ?? children.ageGroups ?? children.ageGroups ?? [];
  const monthlyCostPerChild = count > 0 ? monthlyCosts / count : 0;
  const yearlyCost = monthlyCosts * 12;
  const educationFund = monthlyCosts * 0.2 * 12; // 20% for education

  return {
    present: true,
    title: 'Kinder-Planung',
    keyFigures: {
      monthlyCostPerChild: safe(monthlyCostPerChild),
      childrenCount: safe(count),
      yearlyCost: safe(yearlyCost),
      educationFund: safe(educationFund),
      monthlyCosts: safe(monthlyCosts),
      monthlyContribution: safe(monthlyContribution),
      annualCosts: safe(yearlyCost),
      careCosts: safe(monthlyCosts * 0.6), // Estimate 60% for care
      careCostsAnnual: safe(monthlyCosts * 0.6 * 12),
      educationCosts: safe(monthlyCosts * 0.2), // Estimate 20% for education
      educationCostsAnnual: safe(monthlyCosts * 0.2 * 12),
      clothingCosts: safe(monthlyCosts * 0.2), // Estimate 20% for clothing
      clothingCostsAnnual: safe(monthlyCosts * 0.2 * 12)
    },
    tables: {
      ageGroups: ageGroups.map(group => ({
        ageGroup: group,
        count: 1,
        monthlyCosts: safe(monthlyCostPerChild),
        annualCosts: safe(monthlyCostPerChild * 12)
      }))
    },
    notes: children.notes || ''
  };
}

/**
 * Build executive summary
 * @param {Object} session - Full session data
 * @returns {Object} Executive summary
 */
function buildExecutiveSummary(session) {
  const summary = {
    summaryNotes: session.summaryNotes || '',
    keyInsights: []
  };

  // Add key insights based on available data
  if (session.budget) {
    const available = (session.budget.income || 0) - (session.budget.expenses || 0);
    if (available > 0) {
      summary.keyInsights.push(`Verfügbares Einkommen: ${formatCurrency(available)}`);
    }
  }

  if (session.savingsPlanner) {
    const target = session.savingsPlanner.zielbetrag || session.savingsPlanner.targetAmount || 0;
    if (target > 0) {
      summary.keyInsights.push(`Sparziel: ${formatCurrency(target)}`);
    }
  }

  return summary;
}

/**
 * Build PDF DTO from AdviceSession
 * @param {Object} session - AdviceSession data
 * @param {Object} options - Options including selectedTopics
 * @returns {Promise<Object>} PDF-ready DTO
 */
async function buildPdfDto(sessionRaw, options = {}) {
  // Session "ent-proxen" - convert Mongoose documents to plain objects
  const session = plain(sessionRaw) || {};
  session.budget = plain(session.budget) || {};
  session.savingsPlanner = plain(session.savingsPlanner) || {};
  session.pension = plain(session.pension) || {};
  session.health = plain(session.health) || {};
  session.property = plain(session.property) || {};
  session.children = plain(session.children) || {};
  session.interestCompare = plain(session.interestCompare) || {};

  console.log('[PDF] raw budget object', JSON.stringify(session.budget));

  console.log('[PDF] dto input (original session)', {
    hasBudget: !!session?.budget,
    hasSavingsPlanner: !!session?.savingsPlanner,
    hasPension: !!session?.pension,
    hasHealth: !!session?.health,
    hasProperty: !!session?.property,
    hasChildren: !!session?.children,
  });

  // Optionaler Fallback-Loader für fehlende Tool-Daten
  const kundenId = session?.customerId || session?.meta?.clientId || session?.kundenId || options?.kundenId;
  const hasData = (o) => o && Object.keys(o).length > 0;
  const needs = { 
    budget: !hasData(session?.budget), 
    savingsPlanner: !hasData(session?.savingsPlanner), 
    interestCompare: !hasData(session?.interestCompare),
    pension: !hasData(session?.pension), 
    health: !hasData(session?.health), 
    property: !hasData(session?.property), 
    children: !hasData(session?.children) 
  };
  
  let fallback = {};
  if (kundenId && Object.values(needs).some(Boolean)) {
    fallback = await loadToolsForCustomer(kundenId);
    console.log('[PDF] fallback tools', Object.fromEntries(Object.entries(fallback).map(([k,v])=>[k, !!v])));
  }
  
  // Merge session with fallback tool-by-tool (prefer session if has data; else fallback)
  function prefer(a, b) {
    const has = (o) => o && Object.keys(o).length > 0;
    return has(a) ? a : (has(b) ? b : null);
  }
  const merged = {
    budget: prefer(session?.budget, fallback.budget),
    savingsPlanner: prefer(session?.savingsPlanner, fallback.savings),
    interestCompare: prefer(session?.interestCompare, fallback.interestCompare),
    pension: prefer(session?.pension, fallback.pension),
    health: prefer(session?.health, fallback.health),
    property: prefer(session?.property, fallback.property),
    children: prefer(session?.children, fallback.children),
  };
  
  console.log('[PDF] dto input (merged data)', { 
    hasBudget: !!merged.budget, 
    hasSavingsPlanner: !!merged.savingsPlanner, 
    hasPension: !!merged.pension, 
    hasHealth: !!merged.health, 
    hasProperty: !!merged.property, 
    hasChildren: !!merged.children 
  });
  
  // Build each section separately and log present flags
  // ---------- Budget ----------
  const B = merged.budget || {};
  let income, expenses, savings, available, notes = B.notes;

  // a) Klassische Felder bevorzugen, falls vorhanden (auch 0 zulassen)
  if ('income' in B || 'expenses' in B || 'available' in B) {
    income = val(B.income);
    expenses = val(B.expenses);
    savings = val(B.savings) ?? val(B.savingsRate) ?? val(B.sparquote);
    available = val(B.available) ?? (income !== undefined && expenses !== undefined ? income - expenses : undefined);
  } else if (B.values && typeof B.values === 'object') {
    // b) Neues Grid-Schema aus values aggregieren
    const v = B.values || {};
    // Einkommen explizit aus Einkommens-Kategorien ziehen
    const incomeCategories = ['Einkommen', 'Nettoeinkommen', 'Lohn', 'Gehalt', 'Einkünfte'];
    let incomeFromGrid = undefined;
    for (const cat of incomeCategories) {
      if (v[cat]) {
        incomeFromGrid = toNumberSafe(v[cat].kunde) + toNumberSafe(v[cat].familie);
        break; // Erste gefundene Einkommens-Kategorie verwenden
      }
    }

    // Alle Ausgabenkategorien außer Einkommens-Kategorien summieren
    let totalExpenses = 0;
    for (const [cat, row] of Object.entries(v)) {
      if (incomeCategories.includes(cat)) continue;
      totalExpenses += toNumberSafe(row?.kunde) + toNumberSafe(row?.familie);
    }
    income = income ?? incomeFromGrid;
    expenses = totalExpenses;
    available = (income !== undefined) ? (income - expenses) : undefined;
  }

  // If still undefined but fallback budget exists with numeric fields, use them
  if ((income === undefined || expenses === undefined || available === undefined) && fallback?.budget) {
    const Fb = fallback.budget;
    income = income ?? val(Fb.income ?? Fb.totalIncome);
    expenses = expenses ?? val(Fb.expenses ?? Fb.totalExpenses);
    savings = savings ?? val(Fb.savings);
    available = available ?? (income !== undefined && expenses !== undefined ? income - expenses : val(Fb.available));
  }

  const grid = (B && (B.values || Array.isArray(B.customRows)))
    ? { values: B.values || {}, customRows: B.customRows || [] }
    : (fallback?.budget && (fallback.budget.values || Array.isArray(fallback.budget.customRows)))
      ? { values: fallback.budget.values || {}, customRows: fallback.budget.customRows || [] }
      : undefined;

  const budgetSec = {
    present: (income !== undefined || expenses !== undefined || available !== undefined || savings !== undefined) || !!grid,
    title: 'Budget',
    keyFigures: { income, expenses, savings, available },
    grid,
    notes
  };
  console.log('[PDF DTO][budget]', budgetSec);
  console.log('[PDF] raw budget object (keys):', Object.keys(B||{}));
  
  // ---------- SavingsPlanner ----------
  const Sraw = merged.savingsPlanner || {};
  const S0 = (typeof Sraw.toObject === 'function') ? Sraw.toObject() : Sraw;
  // Normalize possible alternate keys coming from fallback/tool storage
  const S = {
    ...S0,
    startCapital: S0.startCapital ?? S0.anfangskapital,
    monthlySaving: S0.monthlySaving ?? S0.monthlyRate ?? S0.sparrate,
    rate: S0.rate ?? S0.ratePercent ?? S0.zinssatz,
    years: S0.years ?? S0.jahre,
    endValue: S0.endValue ?? S0.targetAmount ?? S0.endkapital,
    interval: S0.interval || (S0.intervall === 'jährlich' ? 'yearly' : 'monthly')
  };
  const chartData = Array.isArray(S.chartData) ? S.chartData : [];
  const startCapital = S.startCapital;
  const monthlySaving = S.monthlySaving;
  const rate = S.rate;
  const years = S.years;
  const endValue = S.endValue;

  // Build chart image from provided chartData or computed schedule
  let chartImage;
  try {
    // Prefer frontend-provided chartData (expects points with x/year and y/value)
    let scheduleFromChart = [];
    if (Array.isArray(chartData) && chartData.length >= 2) {
      scheduleFromChart = chartData
        .filter(p => (p.x ?? p.year) !== undefined && (p.y ?? p.value) !== undefined)
        .map(p => ({
          year: Number(p.x ?? p.year),
          yearEndCapital: Number(p.y ?? p.value)
        }))
        .filter(r => isFinite(r.year) && isFinite(r.yearEndCapital) && r.year > 0)
        .sort((a,b) => a.year - b.year);
    }

    let scheduleToUse = scheduleFromChart;

    if (!scheduleToUse || scheduleToUse.length < 2) {
      // Fallback: compute schedule from numeric inputs
      const interval = (S.interval === 'yearly') ? 'yearly' : 'monthly';
      const start = Number(startCapital) || 0;
      const contribution = Number(monthlySaving) || 0;
      const rPercent = Number(rate) || 0;
      const numYears = Number(years) || 0;

      let currentCapital = start;
      if (interval === 'monthly') {
        const monthlyRateDecimal = rPercent / 100 / 12;
        for (let year = 1; year <= numYears; year++) {
          for (let m = 1; m <= 12; m++) {
            currentCapital = (currentCapital + contribution) * (1 + monthlyRateDecimal);
          }
          scheduleToUse.push({ year, yearEndCapital: Math.round(currentCapital * 100) / 100 });
        }
      } else {
        const yearlyRateDecimal = rPercent / 100;
        for (let year = 1; year <= numYears; year++) {
          currentCapital = (currentCapital + contribution) * (1 + yearlyRateDecimal);
          scheduleToUse.push({ year, yearEndCapital: Math.round(currentCapital * 100) / 100 });
        }
      }
    }

    if (scheduleToUse && scheduleToUse.length >= 2) {
      chartImage = await buildSavingsChart(scheduleToUse);
    }
  } catch (e) {
    console.warn('[PDF DTO][savingsPlanner] chart image build failed:', e.message);
  }

  const savingsSec = {
    present: !!(startCapital || monthlySaving || rate || years || endValue || chartData.length),
    title: 'Sparrechner',
    keyFigures: { startCapital, monthlySaving, rate, years, endValue },
    chartData,
    chartImage
  };
  console.log('[PDF DTO][savingsPlanner]', { present: savingsSec.present, points: chartData.length });
  
  const pensionSec = buildPensionSection(merged.pension);
  const healthSec = buildHealthSection(merged.health);
  const propertySec = buildPropertySection(merged.property);
  const childrenSec = buildChildrenSection(merged.children);
  // Zinsvergleich section (basic table)
  const Z = merged.interestCompare || {};
  let interestChartImage;
  try {
    if (Array.isArray(Z.rates) && Z.rates.length > 0 && Array.isArray(Z.chartData) && Z.chartData.length > 0) {
      interestChartImage = await buildInterestCompareChart(Z.rates, Z.chartData);
    }
  } catch (e) {
    console.warn('[PDF DTO][interestCompare] chart image build failed:', e.message);
  }

  const zinsSec = {
    present: (Array.isArray(Z.chartData) && Z.chartData.length > 0)
      || (Array.isArray(Z.totals) && Z.totals.length > 0)
      || (Array.isArray(Z.rates) && Z.rates.length > 0),
    title: 'Zinsvergleich',
    keyFigures: {
      initial: toNumberSafe(Z.initial),
      monthly: toNumberSafe(Z.monthly),
      years: toNumberSafe(Z.years),
      interval: Z.interval || 'monatlich',
      mode: Z.mode || 'vorschüssig'
    },
    chartData: Array.isArray(Z.chartData) ? Z.chartData : [],
    rates: Array.isArray(Z.rates) ? Z.rates : [],
    totals: Array.isArray(Z.totals) ? Z.totals : [],
    chartImage: interestChartImage
  };
  
  // Apply selectedTopics filter
  const selected = new Set(options?.selectedTopics || session?.selectedTopics || []);
  // Allow zinsvergleich under multiple codes
  const mapCode = (code) => code === 'savings' ? 'savingsPlanner' : code;
  const allow = (code) => selected.size === 0 || selected.has(mapCode(code)) || selected.has('zinsvergleich') || selected.has('interestCompare');
  
  console.log('[PDF] selectedTopics filter', {
    selectedTopics: Array.from(selected),
    allowAll: selected.size === 0
  });
  
  // Apply filter to sections
  budgetSec.present = budgetSec.present && allow('budget');
  savingsSec.present = savingsSec.present && allow('savings');
  zinsSec.present = zinsSec.present && allow('interestCompare');
  pensionSec.present = pensionSec.present && allow('pension');
  healthSec.present = healthSec.present && allow('health');
  propertySec.present = propertySec.present && allow('property');
  childrenSec.present = childrenSec.present && allow('children');
  
  console.log('[PDF] section present flags (after filter)', {
    'budget.present': budgetSec?.present, 
    'pension.present': pensionSec?.present, 
    'savingsPlanner.present': savingsSec?.present,
    'health.present': healthSec?.present,
    'property.present': propertySec?.present,
    'children.present': childrenSec?.present
  });
  
  return {
    meta: {
      clientId: session.meta?.clientId || 'Unknown',
      clientName: session.meta?.clientName || 'Unknown Client',
      consultantName: session.meta?.consultantName || 'Unknown Consultant',
      createdAt: session.meta?.createdAt || new Date(),
      updatedAt: session.meta?.updatedAt,
      version: session.meta?.version || 1
    },
    selectedTopics: session.selectedTopics || [],
    closedTopics: session.closedTopics || [],
    openTopics: session.openTopics || [],
    followUpTiming: session.followUpTiming || '',
    executiveSummary: buildExecutiveSummary(session),
    sections: {
      budget: budgetSec,
      savingsPlanner: savingsSec,
      interestCompare: zinsSec,
      pension: pensionSec,
      health: healthSec,
      property: propertySec,
      children: childrenSec
    }
  };
}

module.exports = {
  buildPdfDto,
  formatCurrency,
  formatPercentage,
  formatDate
};

