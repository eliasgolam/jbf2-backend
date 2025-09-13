/**
 * PDF DTO Builder
 * Transforms AdviceSession data into PDF-ready DTO with Swiss formatting
 */

const { buildSavingsChart } = require('./charts/savingsChart');
const { loadToolsForCustomer } = require('../services/toolLoader');

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
  if (!budget) return { present: false };

  const income = safe(budget.income ?? budget.totals?.income ?? budget.summeEinnahmen ?? budget.totalIncome);
  const expenses = safe(budget.expenses ?? budget.totals?.expense ?? budget.summeAusgaben ?? budget.totalExpenses);
  const available = income - expenses;
  const savings = safe(budget.savings ?? budget.sparquote ?? budget.savingsRate);

  return {
    present: true,
    title: 'Budget-Analyse',
    keyFigures: {
      income,
      expenses,
      available,
      savings,
      expenseRatio: income > 0 ? Number(((expenses / income) * 100).toFixed(1)) : 0,
      availableRatio: income > 0 ? Number(((available / income) * 100).toFixed(1)) : 0
    },
    notes: budget.notes || ''
  };
}

/**
 * Build savings section DTO
 * @param {Object} savings - Savings data from session
 * @returns {Object} Savings section DTO
 */
async function buildSavingsSection(savings) {
  if (!savings) return { present: false };

  const startCapital = safe(savings.startCapital ?? savings.startkapital ?? savings.anfangskapital);
  const monthlyRate = safe(savings.monthlyRate ?? savings.monatlicheRate ?? savings.monatlicherBetrag);
  const ratePercent = safe(savings.ratePercent ?? savings.zinssatz ?? savings.interestRate);
  const years = safe(savings.years ?? savings.jahre ?? savings.laufzeit);
  const targetAmount = safe(savings.zielbetrag ?? savings.targetAmount ?? savings.ziel ?? savings.goal);

  // Generate schedule if not present
  let schedule = savings.schedule || [];
  if (schedule.length === 0 && years > 0) {
    schedule = generateSavingsSchedule(startCapital, monthlyRate, ratePercent, years);
  }

  const endValue = schedule.length > 0 ? schedule[schedule.length - 1].yearEndCapital : startCapital;
  const totalInvested = startCapital + (monthlyRate * 12 * years);

  const section = {
    present: true,
    title: 'Sparrechner',
    keyFigures: {
      endValue: safe(endValue),
      years: safe(years),
      rate: safe(ratePercent),
      monthlySaving: safe(monthlyRate),
      totalInvested: safe(totalInvested),
      startCapital: safe(startCapital),
      targetAmount: safe(targetAmount)
    },
    tables: {
      schedule: schedule || []
    },
    notes: savings.notes || ''
  };

  // Add chart data if schedule has multiple entries
  if (schedule.length > 1) {
    try {
      section.chartDataUrl = await buildSavingsChart(schedule);
    } catch (error) {
      console.warn('Failed to generate savings chart:', error.message);
      // Continue without chart if generation fails
    }
  }

  return section;
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

  const premium = safe(health.praemie ?? health.premium ?? health.monatlichePraemie ?? health.monthlyPremium);
  const franchise = safe(health.franchise ?? health.franchise ?? health.franchise);
  const deductible = safe(health.selbstbehalt ?? health.deductible ?? health.selbstbehalt ?? health.deductible);
  const providerCount = safe(health.providerCount ?? health.versichererAnzahl ?? health.insuranceCount ?? 1);

  return {
    present: true,
    title: 'Gesundheitsversicherung',
    keyFigures: {
      premiumAdult: safe(premium),
      premiumChild: safe(premium * 0.5), // Estimate 50% for children
      deductible: safe(deductible),
      providerCount: safe(providerCount),
      yearlyCost: safe(premium * 12),
      premiumRegion: health.praemienregion ?? health.premiumRegion ?? health.region ?? 'Unbekannt',
      franchise: safe(franchise),
      maxDeductible: safe(franchise + deductible)
    },
    notes: health.notes || ''
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
async function buildPdfDto(session, options = {}) {
  console.log('[PDF] dto input (original session)', {
    hasBudget: !!session?.budget,
    hasSavingsPlanner: !!session?.savingsPlanner,
    hasPension: !!session?.pension,
    hasHealth: !!session?.health,
    hasProperty: !!session?.property,
    hasChildren: !!session?.children,
  });

  // Optionaler Fallback-Loader für fehlende Tool-Daten
  const kundenId = session?.customerId || session?.meta?.clientId || session?.kundenId;
  const needs = { 
    budget: !session?.budget, 
    savingsPlanner: !session?.savingsPlanner, 
    pension: !session?.pension, 
    health: !session?.health, 
    property: !session?.property, 
    children: !session?.children 
  };
  
  let fallback = {};
  if (kundenId && Object.values(needs).some(Boolean)) {
    fallback = await loadToolsForCustomer(kundenId);
    console.log('[PDF] fallback tools', Object.fromEntries(Object.entries(fallback).map(([k,v])=>[k, !!v])));
  }
  
  const merged = {
    budget: session?.budget ?? fallback.budget ?? null,
    savingsPlanner: session?.savingsPlanner ?? fallback.savings ?? null,
    pension: session?.pension ?? fallback.pension ?? null,
    health: session?.health ?? fallback.health ?? null,
    property: session?.property ?? fallback.property ?? null,
    children: session?.children ?? fallback.children ?? null,
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
  const budgetSec = buildBudgetSection(merged.budget);
  const savingsSec = await buildSavingsSection(merged.savingsPlanner);
  const pensionSec = buildPensionSection(merged.pension);
  const healthSec = buildHealthSection(merged.health);
  const propertySec = buildPropertySection(merged.property);
  const childrenSec = buildChildrenSection(merged.children);
  
  // Apply selectedTopics filter
  const selected = new Set(options?.selectedTopics || session?.selectedTopics || []);
  const allow = (code) => selected.size === 0 || selected.has(code);
  
  console.log('[PDF] selectedTopics filter', {
    selectedTopics: Array.from(selected),
    allowAll: selected.size === 0
  });
  
  // Apply filter to sections
  budgetSec.present = budgetSec.present && allow('budget');
  savingsSec.present = savingsSec.present && allow('savings');
  pensionSec.present = pensionSec.present && allow('pension');
  healthSec.present = healthSec.present && allow('health');
  propertySec.present = propertySec.present && allow('property');
  childrenSec.present = childrenSec.present && allow('children');
  
  console.log('[PDF] section present flags (after filter)', {
    'budget.present': budgetSec?.present, 
    'pension.present': pensionSec?.present, 
    'savings.present': savingsSec?.present,
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
      savings: savingsSec,
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

