const handlebars = require('handlebars');

/**
 * Convert string to number, handling Swiss formatting
 * @param {any} v - Value to convert
 * @returns {number} Converted number or 0
 */
handlebars.registerHelper('toNumber', function(v) {
  const s = String(v ?? '').replace(/\sCHF\s/i, '').replace(/'/g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
});

/**
 * Add two numbers
 * @param {any} a - First number
 * @param {any} b - Second number
 * @returns {number} Sum of a and b
 */
handlebars.registerHelper('add', function(a, b) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return numA + numB;
});

module.exports = handlebars;
