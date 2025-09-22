/**
 * IVRechner Chart Generator
 * Creates PNG chart data URLs for Invaliditätsrechner visualization
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Chart configuration
const chartConfig = {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Rente',
      data: [],
      backgroundColor: '#2E7D32',
      borderColor: '#1B5E20',
      borderWidth: 1
    }, {
      label: 'Lücke',
      data: [],
      backgroundColor: '#C62828',
      borderColor: '#B71C1C',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      title: {
        display: true,
        text: 'Invaliditätsrechner - Deckung bei Invalidität',
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#1f2937'
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12
          },
          color: '#374151'
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Betrag (CHF)',
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#374151'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 10
          },
          callback: function(value) {
            return `${(value / 1000).toFixed(0)}'000`;
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Szenario',
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#374151'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 10
          }
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 1
      }
    }
  }
};

/**
 * Build IVRechner chart image
 * @param {Array} chartData - Chart data from IVRechner
 * @param {number} benoetigt - Required income amount
 * @returns {Promise<string>} Base64 PNG data URL
 */
async function buildIVRechnerChart(chartData, benoetigt) {
  if (!Array.isArray(chartData) || chartData.length === 0) {
    throw new Error('Invalid chart data provided');
  }

  // Prepare data for chart
  const labels = chartData.map(item => item.name);
  const renteData = chartData.map(item => item.rente || 0);
  const lueckeData = chartData.map(item => item.luecke || 0);

  // Update chart configuration
  const config = {
    ...chartConfig,
    data: {
      labels: labels,
      datasets: [
        {
          ...chartConfig.data.datasets[0],
          data: renteData
        },
        {
          ...chartConfig.data.datasets[1],
          data: lueckeData
        }
      ]
    },
    options: {
      ...chartConfig.options,
      scales: {
        ...chartConfig.options.scales,
        x: {
          ...chartConfig.options.scales.x,
          max: benoetigt || Math.max(...renteData, ...lueckeData) * 1.1
        }
      }
    }
  };

  // Create chart instance
  const width = 800;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'white'
  });

  try {
    // Generate chart image
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(config);
    const base64Image = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('Error generating IVRechner chart:', error);
    throw new Error(`Failed to generate IVRechner chart: ${error.message}`);
  }
}

module.exports = {
  buildIVRechnerChart
};
