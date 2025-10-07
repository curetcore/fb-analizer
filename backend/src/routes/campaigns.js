const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all campaigns for an account
router.get('/', auth, async (req, res) => {
  try {
    const { accountId, status, limit = 50, offset = 0 } = req.query;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Check if user has access
    if (!req.user.account_ids.includes(parseInt(accountId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let queryText = `
      SELECT c.*, COUNT(*) OVER() as total_count
      FROM campaigns c
      WHERE c.account_id = $1
    `;
    const queryParams = [accountId];

    if (status) {
      queryText += ' AND c.status = $2';
      queryParams.push(status);
    }

    queryText += ' ORDER BY c.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      campaigns: result.rows,
      total: result.rows[0]?.total_count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get specific campaign details
router.get('/:campaignId', auth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const result = await query(
      `SELECT c.*, a.name as account_name
       FROM campaigns c
       JOIN accounts a ON c.account_id = a.id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = result.rows[0];

    // Check if user has access
    if (!req.user.account_ids.includes(campaign.account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(campaign);
  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

module.exports = router;