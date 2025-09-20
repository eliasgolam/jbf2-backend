const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function buildRetirementChart(chartData) {
  if (!Array.isArray(chartData) || chartData.length === 0) return null;
  const labels = chartData.map(p => p.label || '');
  const dataRente = chartData.map(p => Number(p.rente) || 0);
  const dataLuecke = chartData.map(p => Number(p.luecke) || 0);

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Rente', data: dataRente, backgroundColor: '#2E7D32' },
        { label: 'Lücke', data: dataLuecke, backgroundColor: '#C62828' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Berechnung der Altersrente' }
      },
      scales: {
        x: {
          ticks: {
            callback: (value) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
          }
        }
      }
    }
  };

  const canvas = new ChartJSNodeCanvas({ width: 800, height: 300, backgroundColour: 'white' });
  return await canvas.renderToDataURL(config);
}

module.exports = { buildRetirementChart };


