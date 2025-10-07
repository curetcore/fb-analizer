const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all scheduled reports
router.get('/', auth, async (req, res) => {
  try {
    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Check if user has access
    if (!req.user.account_ids.includes(parseInt(accountId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM scheduled_reports WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );

    res.json({
      reports: result.rows
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Generate a report on demand
router.post('/generate', auth, async (req, res) => {
  try {
    const { accountId, type, format = 'pdf', dateRange, filters } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Check if user has access
    if (!req.user.account_ids.includes(accountId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Implement actual report generation
    // For now, return a mock response
    const reportId = require('crypto').randomUUID();

    res.json({
      reportId,
      status: 'processing',
      downloadUrl: null
    });

    // In a real implementation, you would:
    // 1. Create a job in a queue (Bull)
    // 2. Generate the report in the background
    // 3. Store it in S3 or similar
    // 4. Update the status and downloadUrl
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Download a generated report
router.get('/:reportId/download', auth, async (req, res) => {
  try {
    const { reportId } = req.params;

    // TODO: Implement actual report download
    // For now, return a mock error
    res.status(404).json({ error: 'Report not found or still processing' });

    // In a real implementation, you would:
    // 1. Check if the report exists and is ready
    // 2. Verify user has access to the report
    // 3. Either redirect to S3 URL or stream the file
  } catch (error) {
    logger.error('Download report error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

module.exports = router;