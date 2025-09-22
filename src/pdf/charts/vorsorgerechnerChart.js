/**
 * Vorsorgerechner Chart Generator
 * Creates PNG chart data URLs for Vorsorgerechner visualization
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Chart configuration
const chartConfig = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Sparphase',
      data: [],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }, {
      label: 'Entnahmephase',
      data: [],
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Vorsorgerechner - Spar- und Entnahmephase',
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
          text: 'Jahr',
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
      },
      y: {
        title: {
          display: true,
          text: 'Kapital (CHF)',
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
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#ffffff',
        hoverBorderColor: '#2563eb',
        hoverBorderWidth: 3
      }
    }
  }
};

/**
 * Build Vorsorgerechner chart image
 * @param {Array} chartData - Chart data from Vorsorgerechner
 * @returns {Promise<string>} Base64 PNG data URL
 */
async function buildVorsorgerechnerChart(chartData) {
  if (!Array.isArray(chartData) || chartData.length === 0) {
    throw new Error('Invalid chart data provided');
  }

  // Prepare data for chart
  const labels = chartData.map(item => item.jahr);
  const sparenData = chartData.map(item => item.sparen || null);
  const entnehmenData = chartData.map(item => item.entnehmen || null);

  // Update chart configuration
  const config = {
    ...chartConfig,
    data: {
      labels: labels,
      datasets: [
        {
          ...chartConfig.data.datasets[0],
          data: sparenData
        },
        {
          ...chartConfig.data.datasets[1],
          data: entnehmenData
        }
      ]
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
    console.error('Error generating Vorsorgerechner chart:', error);
    throw new Error(`Failed to generate Vorsorgerechner chart: ${error.message}`);
  }
}

module.exports = {
  buildVorsorgerechnerChart
};
