function calculatePoints(key, value) {
  switch (key) {
    case 'fitness':
    case 'brille':
      return value / 2;
    case 'alternativmedizin':
    case 'zahnversicherung':
      return (value.percent / 100) * value.amount;
    case 'familienrabatt':
      return value * 5;
    case 'spitalaufenthalt':
    case 'preisleistung':
      return value === 'hoch' ? 300 : value === 'mittel' ? 200 : 100;
    case 'digitalservices':
      return value === 'gut' ? 300 : 100;
    default:
      return 0;
  }
}

function generateDescription(key, val) {
  switch (key) {
    case 'fitness': return `Bis zu ${val} CHF für Fitness.`;
    case 'brille': return `Bis zu ${val} CHF für Brillen.`;
    case 'alternativmedizin': return `${val.percent}% bis ${val.amount} CHF für Alternativmedizin.`;
    case 'zahnversicherung': return `${val.percent}% bis ${val.amount} CHF für Zahnbehandlungen.`;
    case 'familienrabatt': return `${parseFloat(val)}% Familienrabatt.`;
    case 'spitalaufenthalt': return `Spitalaufenthalt: ${val}.`;
    case 'preisleistung': return `Preis-Leistung: ${val}.`;
    case 'digitalservices': return `Digitalservices: ${val}.`;
    default: return '';
  }
}

module.exports = { calculatePoints, generateDescription };
