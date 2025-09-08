/**
 * Savings Chart Generator
 * Creates PNG chart data URLs for savings plan visualization
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Chart configuration
const chartConfig = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Kapitalentwicklung',
      data: [],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Sparplan - Kapitalentwicklung',
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
        display: true,
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
            size: 11
          }
        }
      },
      y: {
        display: true,
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
            size: 11
          },
          callback: function(value) {
            return new Intl.NumberFormat('de-CH', {
              style: 'currency',
              currency: 'CHF',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#2563eb'
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }
};

/**
 * Generate savings chart as data URL
 * @param {Array} schedule - Savings schedule array with year and yearEndCapital
 * @returns {Promise<string>} Data URL for PNG image
 */
async function buildSavingsChart(schedule) {
  try {
    if (!schedule || schedule.length < 2) {
      throw new Error('Schedule must have at least 2 data points');
    }

    // Extract years and capital values
    const years = schedule.map(item => `Jahr ${item.year}`);
    const capitalValues = schedule.map(item => item.yearEndCapital);

    // Create chart configuration with data
    const config = {
      ...chartConfig,
      data: {
        ...chartConfig.data,
        labels: years,
        datasets: [{
          ...chartConfig.data.datasets[0],
          data: capitalValues
        }]
      }
    };

    // Create chart canvas
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });

    // Generate chart as data URL
    const dataUrl = await chartJSNodeCanvas.renderToDataURL(config);

    return dataUrl;
  } catch (error) {
    console.error('Error generating savings chart:', error);
    throw new Error(`Chart generation failed: ${error.message}`);
  }
}

module.exports = {
  buildSavingsChart
};
