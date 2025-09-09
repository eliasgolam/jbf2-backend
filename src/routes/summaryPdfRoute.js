/**
 * PDF Summary Route
 * Handles PDF generation for advice sessions
 */

const express = require('express');
const router = express.Router();
const { getRepository } = require('../config/database');
const { generatePdf } = require('../pdf/renderPdf');
const { buildPdfDto } = require('../pdf/buildPdfDto');
const { optionalAuth, rateLimit } = require('../../middleware/auth');
const { logSecurityEvent, logPerformance } = require('../../middleware/logging');

/**
 * POST /api/advice/:id/summary-pdf
 * Generate PDF summary for advice session
 */
router.post('/:id/summary-pdf', rateLimit, optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('[PDF] start', { id: req.params.id });

    // Optional smoke test: enable by setting SMOKE_PDF=1 in env
    if (process.env.SMOKE_PDF === '1') {
      const { initBrowser } = require('../pdf/renderPdf');
      const browser = await initBrowser();
      try {
        const page = await browser.newPage();
        await page.setContent(`<html><body><h1>Smoke OK ${req.params.id}</h1></body></html>`, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        return res.status(200).send(pdf);
      } finally {
        await browser.close().catch(() => {});
      }
    }

    // Check if PDF generation is enabled
    if (process.env.PDF_ENABLED !== 'true') {
      console.log('[PDF] disabled');
      return res.status(503).json({ 
        message: 'PDF disabled' 
      });
    }

    // Validate session ID
    if (!id || typeof id !== 'string') {
      console.log('[PDF] invalid session ID', { id });
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    // Load session from repository
    console.log('[PDF] loading session from repository');
    const adviceRepository = getRepository();
    const session = await adviceRepository.get(id);
    if (!session) {
      console.log('[PDF] session not found', { id });
      return res.status(404).json({ 
        message: 'Session not found' 
      });
    }
    console.log('[PDF] session loaded', { sessionId: id, hasData: !!session });

    // Build PDF DTO
    console.log('[PDF] building PDF DTO');
    const pdfDto = await buildPdfDto(session);
    console.log('[PDF] PDF DTO built', { hasData: !!pdfDto });

    // Generate PDF with performance logging
    console.log('[PDF] generating PDF');
    const startTime = Date.now();
    const pdfBuffer = await generatePdf(pdfDto);
    const duration = Date.now() - startTime;
    console.log('[PDF] PDF generated', { duration: `${duration}ms`, size: pdfBuffer.length });
    
    logPerformance('PDF Generation', duration, {
      sessionId: id,
      pdfSize: pdfBuffer.length
    });

    // Set response headers
    const filename = `JB_Finanz_Analyse_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    console.log('[PDF] sending PDF response');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF] failed', error);
    console.error('[PDF] error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return appropriate error response
    if (error.message.includes('Template not found')) {
      return res.status(500).json({ 
        message: 'PDF template error' 
      });
    }
    
    if (error.message.includes('PDF generation failed')) {
      return res.status(500).json({ 
        message: 'PDF generation failed' 
      });
    }

    // Pass error to global error handler
    next(error);
  }
});

/**
 * GET /api/advice/:id/summary-pdf/status
 * Check PDF generation status and session info
 */
router.get('/:id/summary-pdf/status', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    const adviceRepository = getRepository();
    const session = await adviceRepository.get(id);
    if (!session) {
      return res.status(404).json({ 
        message: 'Session not found' 
      });
    }

    res.json({
      sessionId: id,
      pdfEnabled: process.env.PDF_ENABLED === 'true',
      sessionExists: true,
      lastUpdated: session.meta?.updatedAt || session.meta?.createdAt,
      sections: {
        budget: !!session.budget,
        savings: !!session.savingsPlanner,
        pension: !!session.pension,
        health: !!session.health,
        property: !!session.property,
        children: !!session.children
      }
    });

  } catch (error) {
    console.error('Error checking PDF status:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

