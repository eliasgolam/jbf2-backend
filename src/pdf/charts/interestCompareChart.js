/**
 * Interest Compare Chart Generator
 * Creates PNG chart data URLs for multi-rate interest comparison
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function buildInterestCompareChart(rates, chartData) {
  if (!Array.isArray(rates) || rates.length === 0) {
    throw new Error('Rates must be a non-empty array');
  }
  if (!Array.isArray(chartData) || chartData.length === 0) {
    throw new Error('chartData must be a non-empty array');
  }

  const labels = chartData.map(p => `Jahr ${p.jahr}`);
  const palette = ['#FF8C00', '#003366', '#50C878', '#B2965C', '#A28549'];
  const datasets = rates.map((rate, idx) => ({
    label: `Zins ${rate}%`,
    data: chartData.map(p => Number(p[`zins${rate}`]) || 0),
    borderColor: palette[idx % palette.length],
    backgroundColor: 'rgba(0,0,0,0)',
    borderWidth: 3,
    fill: false,
    tension: 0.3,
    pointRadius: 0
  }));

  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        title: {
          display: true,
          text: 'Zinsvergleich – Kapitalentwicklung'
        }
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.1)', drawBorder: false } },
        y: {
          grid: { color: 'rgba(0,0,0,0.1)', drawBorder: false },
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
            }
          }
        }
      }
    }
  };

  const canvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });
  const dataUrl = await canvas.renderToDataURL(config);
  return dataUrl;
}

module.exports = { buildInterestCompareChart };


