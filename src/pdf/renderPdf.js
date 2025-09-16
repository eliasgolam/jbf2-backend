/**
 * PDF Rendering Service
 * Handles Handlebars template rendering and Puppeteer PDF generation
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

/**
 * Initialize Puppeteer browser instance
 */
async function initBrowser() {
  try {
    console.info('[PDF] launching puppeteer...');
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: { width: 1280, height: 800 }
    });
    console.info('[PDF] browser launched');
    return browser;
  } catch (err) {
    console.error('[PDF] launch failed', err);
    throw err;
  }
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
  // Currency formatter (CHF) - robust with fallbacks
  handlebars.registerHelper('formatCurrency', function(amount) {
    const n = Number(amount);
    if (!isFinite(n)) return 'CHF 0.00';
    return n.toLocaleString('de-CH', { 
      style: 'currency', 
      currency: 'CHF',
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  });

  // Percentage formatter - robust with fallbacks
  handlebars.registerHelper('formatPercentage', function(value) {
    const n = Number(value);
    if (!isFinite(n)) return '0.0%';
    return `${n.toFixed(1)}%`;
  });

  // Alias for formatPercentage (some templates use formatPercent)
  handlebars.registerHelper('formatPercent', function(value) {
    const n = Number(value);
    if (!isFinite(n)) return '0.0%';
    return `${n.toFixed(1)}%`;
  });

  // Date formatter (de-CH) - robust with fallbacks
  handlebars.registerHelper('formatDate', function(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  });

  // Convert string to number, handling Swiss formatting
  handlebars.registerHelper('toNumber', function(v) {
    const s = String(v ?? '').replace(/\sCHF\s/i, '').replace(/'/g, '').replace(/,/g, '.');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  });

  // Add two numbers
  handlebars.registerHelper('add', function(a, b) {
    const numA = Number(a) || 0;
    const numB = Number(b) || 0;
    return numA + numB;
  });

  // Number formatter - for general numbers
  handlebars.registerHelper('formatNumber', function(value, decimals = 0) {
    const n = Number(value);
    if (!isFinite(n)) return '0';
    return n.toLocaleString('de-CH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  });

  // Boolean formatter - for yes/no display
  handlebars.registerHelper('formatBoolean', function(value, trueText = 'Ja', falseText = 'Nein') {
    return value ? trueText : falseText;
  });

  // Conditional helper - for showing/hiding content
  handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });

  // Math helpers
  handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
  });

  handlebars.registerHelper('subtract', function(a, b) {
    return Number(a) - Number(b);
  });

  handlebars.registerHelper('multiply', function(a, b) {
    return Number(a) * Number(b);
  });

  handlebars.registerHelper('divide', function(a, b) {
    const divisor = Number(b);
    return divisor !== 0 ? Number(a) / divisor : 0;
  });

  // String helpers
  handlebars.registerHelper('uppercase', function(str) {
    return typeof str === 'string' ? str.toUpperCase() : '';
  });

  handlebars.registerHelper('lowercase', function(str) {
    return typeof str === 'string' ? str.toLowerCase() : '';
  });

  // Array helpers
  handlebars.registerHelper('length', function(array) {
    return Array.isArray(array) ? array.length : 0;
  });

  // Debug helper
  handlebars.registerHelper('debug', function(value) {
    console.log('Handlebars Debug:', value);
    return '';
  });

  // Test helper to verify all helpers are working
  handlebars.registerHelper('testHelpers', function() {
    console.log('[PDF] Testing Handlebars helpers...');
    const testCurrency = handlebars.helpers.formatCurrency(1234.56);
    const testPercentage = handlebars.helpers.formatPercentage(12.34);
    const testDate = handlebars.helpers.formatDate(new Date());
    console.log('[PDF] Helper test results:', { testCurrency, testPercentage, testDate });
    return '';
  });

  // Log helper registration
  console.log('[PDF] Handlebars helpers registered:', Object.keys(handlebars.helpers));
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
  
  try {
    const template = handlebars.compile(templateContent);
    return template(data);
  } catch (e) {
    console.error('[PDF][HB] Compile error:', e.message);
    console.error('[PDF][HB] Template:', templateName);
    
    // Extract line number from error message if available
    const lineMatch = e.message.match(/line (\d+)/);
    if (lineMatch) {
      const errorLine = parseInt(lineMatch[1]);
      const startLine = Math.max(0, errorLine - 10);
      const endLine = errorLine + 10;
      
      console.error('[PDF][HB] Template snippet around error (lines', startLine + 1, 'to', endLine + 1, '):');
      console.error('=====================================');
      const lines = templateContent.split('\n');
      lines.slice(startLine, endLine).forEach((line, index) => {
        const lineNum = startLine + index + 1;
        const marker = lineNum === errorLine ? '>>> ' : '    ';
        console.error(`${marker}${lineNum.toString().padStart(3, ' ')}: ${line}`);
      });
      console.error('=====================================');
    } else {
      // Fallback: show first 500 characters
      console.error('[PDF][HB] Template snippet (first 500 chars):');
      console.error(templateContent.substring(0, 500));
    }
    
    throw e;
  }
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

    // Debug: Log template data before rendering
    console.log('[PDF] template keys', Object.keys(sessionData?.sections || {}));
    console.log('[PDF] template present flags', {
      budget: sessionData.sections?.budget?.present,
      pension: sessionData.sections?.pension?.present,
      savings: sessionData.sections?.savings?.present,
      health: sessionData.sections?.health?.present,
      property: sessionData.sections?.property?.present,
      children: sessionData.sections?.children?.present,
    });

    // Render master template
    const html = renderTemplate('master', sessionData);
    
    // Debug: Log HTML snippet before PDF conversion
    console.log('[PDF] HTML snippet (first 500 chars):', html.substring(0, 500));

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

