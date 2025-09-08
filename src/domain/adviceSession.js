/**
 * @typedef {Object} AdviceSessionMeta
 * @property {string} clientId - Unique client identifier
 * @property {string} clientName - Client's full name
 * @property {string} consultantName - Consultant's name
 * @property {Date} createdAt - Session creation timestamp
 */

/**
 * @typedef {Object} SavingsPlannerSchedule
 * @property {number} year - Year in the schedule
 * @property {number} startCapital - Starting capital for this year
 * @property {number} monthlyRate - Monthly savings rate
 * @property {number} yearEndCapital - Capital at end of year
 */

/**
 * @typedef {Object} SavingsPlanner
 * @property {number} startCapital - Initial capital amount
 * @property {number} monthlyRate - Monthly savings rate
 * @property {number} ratePercent - Annual interest rate percentage
 * @property {number} years - Number of years to calculate
 * @property {SavingsPlannerSchedule[]} schedule - Yearly breakdown
 */

/**
 * @typedef {Object} Budget
 * @property {number} income - Monthly income
 * @property {number} expenses - Monthly expenses
 * @property {number} savings - Monthly savings amount
 * @property {number} available - Available disposable income
 */

/**
 * @typedef {Object} Pension
 * @property {number} pillar3a - 3rd pillar contributions
 * @property {number} pillar3b - 3rd pillar b contributions
 * @property {number} lifeInsurance - Life insurance contributions
 * @property {number} total - Total pension contributions
 */

/**
 * @typedef {Object} Health
 * @property {string} premiumRegion - Swiss premium region
 * @property {number} franchise - Health insurance franchise
 * @property {number} premium - Monthly premium amount
 * @property {number} deductible - Annual deductible amount
 */

/**
 * @typedef {Object} Property
 * @property {number} propertyValue - Property value
 * @property {number} equity - Available equity
 * @property {number} mortgage - Required mortgage amount
 * @property {number} monthlyPayment - Monthly mortgage payment
 * @property {boolean} affordable - Whether property is affordable
 */

/**
 * @typedef {Object} Children
 * @property {number} count - Number of children
 * @property {string[]} ageGroups - Age groups of children
 * @property {number} monthlyCosts - Monthly childcare costs
 * @property {number} monthlyContribution - Monthly contribution amount
 */

/**
 * @typedef {Object} AdviceSession
 * @property {AdviceSessionMeta} meta - Session metadata
 * @property {string[]} selectedTopics - Topics selected for consultation
 * @property {string[]} closedTopics - Topics that have been completed
 * @property {string[]} openTopics - Topics still open
 * @property {string} followUpTiming - When to follow up (e.g., "1 month", "3 months")
 * @property {string} summaryNotes - General summary notes
 * @property {Budget} budget - Budget planning data
 * @property {SavingsPlanner} savingsPlanner - Savings planning data
 * @property {Pension} pension - Pension planning data
 * @property {Health} health - Health insurance data
 * @property {Property} property - Property planning data
 * @property {Children} children - Children-related costs and planning
 */

/**
 * Creates a new AdviceSession with default values
 * @param {string} clientId - Client identifier
 * @param {string} clientName - Client name
 * @param {string} consultantName - Consultant name
 * @returns {AdviceSession} New advice session
 */
function createAdviceSession(clientId, clientName, consultantName) {
  return {
    meta: {
      clientId,
      clientName,
      consultantName,
      createdAt: new Date()
    },
    selectedTopics: [],
    closedTopics: [],
    openTopics: [],
    followUpTiming: '',
    summaryNotes: '',
    budget: {
      income: 0,
      expenses: 0,
      savings: 0,
      available: 0
    },
    savingsPlanner: {
      startCapital: 0,
      monthlyRate: 0,
      ratePercent: 0,
      years: 0,
      schedule: []
    },
    pension: {
      pillar3a: 0,
      pillar3b: 0,
      lifeInsurance: 0,
      total: 0
    },
    health: {
      premiumRegion: '',
      franchise: 0,
      premium: 0,
      deductible: 0
    },
    property: {
      propertyValue: 0,
      equity: 0,
      mortgage: 0,
      monthlyPayment: 0,
      affordable: false
    },
    children: {
      count: 0,
      ageGroups: [],
      monthlyCosts: 0,
      monthlyContribution: 0
    }
  };
}

module.exports = {
  createAdviceSession
};

