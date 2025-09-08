/**
 * PDF DTO Builder
 * Transforms AdviceSession data into PDF-ready DTO with Swiss formatting
 */

const { buildSavingsChart } = require('./charts/savingsChart');

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

  const income = budget.income || budget.totals?.income || 0;
  const expenses = budget.expenses || budget.totals?.expense || 0;
  const available = income - expenses;
  const savings = budget.savings || 0;

  return {
    present: true,
    title: 'Budget-Analyse',
    keyFigures: {
      income,
      expenses,
      available,
      savings,
      expenseRatio: income > 0 ? (expenses / income) * 100 : 0,
      availableRatio: income > 0 ? (available / income) * 100 : 0
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

  const startCapital = savings.startCapital || 0;
  const monthlyRate = savings.monthlyRate || 0;
  const ratePercent = savings.ratePercent || 0;
  const years = savings.years || 0;
  const targetAmount = savings.zielbetrag || savings.targetAmount || 0;

  // Generate schedule if not present
  let schedule = savings.schedule || [];
  if (schedule.length === 0 && years > 0) {
    schedule = generateSavingsSchedule(startCapital, monthlyRate, ratePercent, years);
  }

  const section = {
    present: true,
    title: 'Sparrechner',
    keyFigures: {
      startCapital,
      monthlyRate,
      ratePercent,
      years,
      targetAmount,
      endAmount: schedule.length > 0 ? schedule[schedule.length - 1].yearEndCapital : startCapital
    },
    schedule,
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

  const pillar3a = pension.saeule3a || pension.pillar3a || 0;
  const pillar3b = pension.saeule3b || pension.pillar3b || 0;
  const lifeInsurance = pension.lebensversicherung || pension.lifeInsurance || 0;
  const total = pillar3a + pillar3b + lifeInsurance;

  return {
    present: true,
    title: 'Vorsorge-Planung',
    keyFigures: {
      pillar3a,
      pillar3b,
      lifeInsurance,
      total,
      pillar3aMonthly: pillar3a / 12,
      pillar3bMonthly: pillar3b / 12,
      lifeInsuranceMonthly: lifeInsurance / 12,
      totalMonthly: total / 12,
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

  const premium = health.praemie || health.premium || 0;
  const franchise = health.franchise || 0;
  const deductible = health.selbstbehalt || health.deductible || 0;

  return {
    present: true,
    title: 'Gesundheitsversicherung',
    keyFigures: {
      premiumRegion: health.praemienregion || health.premiumRegion || 'Unbekannt',
      franchise,
      premium,
      deductible,
      annualPremium: premium * 12,
      maxDeductible: franchise + deductible
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

  const propertyValue = property.propertyValue || 0;
  const equity = property.equity || 0;
  const mortgage = property.mortgage || propertyValue - equity;
  const monthlyPayment = property.monthlyPayment || 0;
  const affordable = property.affordable || false;

  return {
    present: true,
    title: 'Immobilien-Planung',
    keyFigures: {
      propertyValue,
      equity,
      mortgage,
      monthlyPayment,
      affordable,
      equityRatio: propertyValue > 0 ? (equity / propertyValue) * 100 : 0,
      mortgageRatio: propertyValue > 0 ? (mortgage / propertyValue) * 100 : 0,
      requiredIncome: monthlyPayment > 0 ? monthlyPayment * 3 : 0 // 1/3 rule
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

  const count = children.anzahl || children.count || 0;
  const monthlyCosts = children.kosten || children.monthlyCosts || 0;
  const monthlyContribution = children.beitrag || children.monthlyContribution || 0;
  const ageGroups = children.altersgruppen || children.ageGroups || [];

  return {
    present: true,
    title: 'Kinder-Planung',
    keyFigures: {
      count,
      monthlyCosts,
      monthlyContribution,
      annualCosts: monthlyCosts * 12,
      careCosts: monthlyCosts * 0.6, // Estimate 60% for care
      careCostsAnnual: monthlyCosts * 0.6 * 12,
      educationCosts: monthlyCosts * 0.2, // Estimate 20% for education
      educationCostsAnnual: monthlyCosts * 0.2 * 12,
      clothingCosts: monthlyCosts * 0.2, // Estimate 20% for clothing
      clothingCostsAnnual: monthlyCosts * 0.2 * 12,
      ageGroups: ageGroups.map(group => ({
        ageGroup: group,
        count: 1,
        monthlyCosts: monthlyCosts / count,
        annualCosts: (monthlyCosts / count) * 12
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
 * @returns {Promise<Object>} PDF-ready DTO
 */
async function buildPdfDto(session) {
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
      budget: buildBudgetSection(session.budget),
      savings: await buildSavingsSection(session.savingsPlanner),
      pension: buildPensionSection(session.pension),
      health: buildHealthSection(session.health),
      property: buildPropertySection(session.property),
      children: buildChildrenSection(session.children)
    }
  };
}

module.exports = {
  buildPdfDto,
  formatCurrency,
  formatPercentage,
  formatDate
};

