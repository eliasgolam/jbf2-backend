/**
 * PDF Rendering Service
 * Handles Handlebars template rendering and Puppeteer PDF generation
 */

const puppeteer = require('puppeteer');
const { executablePath } = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

/**
 * Initialize Puppeteer browser instance
 */
async function initBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    executablePath: await executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--single-process'
    ]
  });
}

/**
 * Load and register Handlebars partials
 */
function loadPartials() {
  const templatesDir = path.join(__dirname, 'templates');
  const partialFiles = [
    'cover.hbs',
    'executiveSummary.hbs',
    'budget.hbs',
    'savings.hbs',
    'pension.hbs',
    'health.hbs',
    'property.hbs',
    'children.hbs',
    'appendix.hbs'
  ];

  partialFiles.forEach(file => {
    const partialName = path.basename(file, '.hbs');
    const partialPath = path.join(templatesDir, file);
    
    if (fs.existsSync(partialPath)) {
      const partialContent = fs.readFileSync(partialPath, 'utf8');
      handlebars.registerPartial(partialName, partialContent);
    }
  });
}

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // Currency formatter (CHF)
  handlebars.registerHelper('formatCurrency', function(amount) {
    if (typeof amount !== 'number') return 'CHF 0.00';
    return `CHF ${amount.toLocaleString('de-CH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  });

  // Percentage formatter
  handlebars.registerHelper('formatPercentage', function(value) {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(1)}%`;
  });

  // Date formatter (de-CH)
  handlebars.registerHelper('formatDate', function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  });
}

/**
 * Render Handlebars template to HTML
 * @param {string} templateName - Name of the template (without .hbs)
 * @param {Object} data - Data object for template rendering
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}.hbs`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent);
  
  return template(data);
}

/**
 * Convert HTML to PDF using Puppeteer
 * @param {string} html - HTML content to convert
 * @returns {Buffer} PDF buffer
 */
async function htmlToPdf(html) {
  const browser = await initBrowser();
  
  try {
    const page = await browser.newPage();
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 9pt; color: #666; text-align: center; width: 100%;">
          Seite <span class="pageNumber"></span> von <span class="totalPages"></span> | JB Finanz AG · Vertraulich
        </div>
      `
    });

    return pdfBuffer;
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Generate PDF from advice session data
 * @param {Object} sessionData - Advice session data
 * @returns {Buffer} PDF buffer
 */
async function generatePdf(sessionData) {
  try {
    // Load partials and register helpers
    loadPartials();
    registerHelpers();

    // Render master template
    const html = renderTemplate('master', sessionData);

    // Convert to PDF
    const pdfBuffer = await htmlToPdf(html);

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

module.exports = {
  generatePdf,
  initBrowser
};

