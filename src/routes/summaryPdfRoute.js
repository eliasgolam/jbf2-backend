/**
 * PDF Summary Route
 * Handles PDF generation for advice sessions
 */

const express = require('express');
const router = express.Router();
const { initBrowser } = require('../pdf/renderPdf');
const { getRepository } = require('../config/database');
const { generatePdf } = require('../pdf/renderPdf');
const { buildPdfDto } = require('../pdf/buildPdfDto');
const { optionalAuth, rateLimit } = require('../../middleware/auth');
const { logSecurityEvent, logPerformance } = require('../../middleware/logging');

// Topic mapping for PDF filtering
const topicMap = {
  lebensstandard: ['budget','savingsPlanner','interestCompare','health'],
  'lebensstandard beibehalten': ['budget','savingsPlanner','interestCompare','health'],
  lebenstandard: ['budget','savingsPlanner','interestCompare','health'],
  vermoegen: ['budget','savingsPlanner','interestCompare'],
  'vermögen': ['budget','savingsPlanner','interestCompare'],
  'vermögen aufbauen': ['budget','savingsPlanner','interestCompare'],
  vorsorge: ['budget','savingsPlanner','interestCompare','pension'],
  'pension vorsorgen': ['budget','savingsPlanner','interestCompare','pension'],
  gesundheit: ['budget','health'],
  kranken: ['budget','health'],
  immobilien: ['budget','property'],
  kinder: ['budget','savingsPlanner','children'],
  'kinder absichern': ['budget','savingsPlanner','children'],
  alle: ['budget','savingsPlanner','pension','health','property','children']
};

// Health-Route (nur wenn SMOKE_PDF=1)
if (process.env.SMOKE_PDF === '1') {
  router.get('/health/pdf', async (req, res) => {
    try {
      const browser = await initBrowser();
      try {
        const page = await browser.newPage();
        await page.setContent('<html><body><h1>Smoke OK</h1></body></html>', { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.status(200).send(pdf);
      } finally {
        await browser.close().catch(() => {});
      }
    } catch (error) {
      console.error('[HEALTH] PDF health check failed:', error);
      res.status(500).json({ 
        message: 'Health check failed',
        error: error.message 
      });
    }
  });
}

/**
 * POST /api/advice/:id/summary-pdf
 * Generate PDF summary for advice session
 */
router.post('/:id/summary-pdf', rateLimit, optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Enhanced logging for debugging
    console.log('[PDF] route hit, params.id=', req.params.id);
    console.log('[PDF] session.kundenId=', req.session?.kundenId);
    console.log('[PDF] body keys=', Object.keys(req.body || {}));
    console.log('[PDF] selectedTopics=', req.body?.selectedTopics);
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
    console.log('[PDF] repository type:', adviceRepository.constructor?.name || 'unknown');
    
    const session = await adviceRepository.get(id);
    if (!session) {
      console.log('[PDF] session not found', { id });
      return res.status(404).json({ 
        message: 'Session not found' 
      });
    }
    
    // Verifizieren: Session hat Tool-Daten vor PDF
    console.log('[PDF] session keys', Object.keys(session || {}));
    console.log('[PDF] session sections', {
      budget: !!session?.budget, 
      savingsPlanner: !!session?.savingsPlanner, 
      pension: !!session?.pension,
      health: !!session?.health, 
      property: !!session?.property, 
      children: !!session?.children
    });
    
    console.log('[PDF] session loaded', { 
      sessionId: id, 
      hasData: !!session,
      sessionKeys: Object.keys(session || {}),
      hasBudget: !!session?.budget,
      hasSavings: !!session?.savingsPlanner,
      hasPension: !!session?.pension,
      hasHealth: !!session?.health,
      hasProperty: !!session?.property,
      hasChildren: !!session?.children
    });
    
    console.log('[PDF] session sections', {
      budget: !!session?.budget,
      savingsPlanner: !!session?.savingsPlanner,
      pension: !!session?.pension,
      health: !!session?.health,
      property: !!session?.property,
      children: !!session?.children,
      selectedTopics: session?.selectedTopics?.length || 0,
      closedTopics: session?.closedTopics?.length || 0,
    });

    // Build PDF DTO with selectedTopics
    console.log('[PDF] building PDF DTO');
    
    // Process selectedTopics through topicMap
    let selectedTopics = req.body?.selectedTopics || session?.selectedTopics || [];
    if (Array.isArray(selectedTopics) && selectedTopics.length > 0) {
      // Expand topic categories to individual sections (case-insensitive)
      const expandedTopics = new Set();
      selectedTopics.forEach(topic => {
        const key = String(topic || '').toLowerCase();
        if (topicMap[key]) {
          topicMap[key].forEach(section => expandedTopics.add(section));
        }
      });
      // If nothing recognizable was selected, don't filter at all
      selectedTopics = expandedTopics.size > 0 ? Array.from(expandedTopics) : [];
    }
    
    const options = {
      selectedTopics: selectedTopics,
      notes: req.body?.notes || session?.notes || '',
      kundenId: req.session?.kundenId || session?.customerId || session?.meta?.clientId
    };
    console.log('[PDF] topic mapping applied', { 
      original: req.body?.selectedTopics || session?.selectedTopics || [],
      expanded: selectedTopics 
    });
    
    // If caller passes tools inline (belt-and-braces), merge values in (always prefer inline)
    if (req.body?.tools) {
      const merge = (dst, src) => (src && typeof src === 'object') ? { ...(dst||{}), ...src } : dst;
      session.budget = merge(session.budget, req.body.tools.budget);
      session.savingsPlanner = merge(session.savingsPlanner, req.body.tools.savingsPlanner);
      session.interestCompare = merge(session.interestCompare, req.body.tools.interestCompare);
    }

    const pdfDto = await buildPdfDto(session, options);
    console.log('[PDF] section present flags (after DTO)', {
      budget: pdfDto.sections?.budget?.present,
      savingsPlanner: pdfDto.sections?.savingsPlanner?.present,
    });
    console.log('[PDF] PDF DTO built', { hasData: !!pdfDto, selectedTopics: options.selectedTopics });
    
    console.log('[PDF] section present flags (after DTO)', {
      budget: pdfDto.sections.budget?.present,
      savingsPlanner: pdfDto.sections.savingsPlanner?.present,
      pension: pdfDto.sections.pension?.present,
      health: pdfDto.sections.health?.present,
      property: pdfDto.sections.property?.present,
      children: pdfDto.sections.children?.present
    });

    // Generate PDF with performance logging
    console.log('[PDF] generating PDF');
    const startTime = Date.now();
    
    try {
      const pdfBuffer = await generatePdf(pdfDto);
      const duration = Date.now() - startTime;
      console.log('[PDF] PDF generated', { duration: `${duration}ms`, size: pdfBuffer.length });
      
      logPerformance('PDF Generation', duration, {
        sessionId: id,
        pdfSize: pdfBuffer.length
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="summary-${req.params.id || 'report'}.pdf"`);

      // Send PDF
      console.log('[PDF] sending PDF response');
      res.status(200).send(pdfBuffer);
    } catch (pdfError) {
      console.error('[PDF] PDF generation failed', pdfError);
      return res.status(500).json({ 
        message: 'PDF generation failed', 
        code: 'PDF_RENDER_ERROR', 
        detail: pdfError.message 
      });
    }

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

