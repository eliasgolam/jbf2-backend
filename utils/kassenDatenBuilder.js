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
      switch (value) {
        case 'günstig': return 300;
        case 'fair': return 250;
        case 'mittel': return 200;
        case 'hoch': return 150;
        case 'teuer': return 100;
        default: return 0;
      }

    case 'digitalservices':
  switch (value) {
    case 'sehr gut': return 300;
    case 'gut': return 200;
    case 'schlecht': return 100;
    default: return 0;
  }

  }
}

function generateDescription(key, val) {
  switch (key) {
    case 'fitness':
      return `Bis zu ${val} CHF für Fitness.`;

    case 'brille':
      return `Bis zu ${val} CHF für Brillen.`;

    case 'alternativmedizin':
      return `${val.percent}% bis ${val.amount} CHF für Alternativmedizin.`;

    case 'zahnversicherung':
      return `${val.percent}% bis ${val.amount} CHF für Zahnbehandlungen.`;

    case 'familienrabatt':
      return `${parseFloat(val)}% Familienrabatt.`;

    case 'spitalaufenthalt':
      return `Spitalaufenthalt: ${val}.`;

    case 'preisleistung':
      return `Preis-Leistung: ${val}.`;

    case 'digitalservices':
      return `Digitalservices: ${val}.`;

    default:
      return '';
  }
}

module.exports = { calculatePoints, generateDescription };
