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
router.post('/:id/summary-pdf', rateLimit, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if PDF generation is enabled
    if (process.env.PDF_ENABLED !== 'true') {
      return res.status(503).json({ 
        message: 'PDF disabled' 
      });
    }

    // Validate session ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    // Load session from repository
    const adviceRepository = getRepository();
    const session = await adviceRepository.get(id);
    if (!session) {
      return res.status(404).json({ 
        message: 'Session not found' 
      });
    }

    // Build PDF DTO
    const pdfDto = await buildPdfDto(session);

    // Generate PDF with performance logging
    const startTime = Date.now();
    const pdfBuffer = await generatePdf(pdfDto);
    const duration = Date.now() - startTime;
    
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
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    
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

    res.status(500).json({ 
      message: 'Internal server error' 
    });
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

