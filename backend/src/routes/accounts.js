const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all accounts accessible by the user
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM accounts 
       WHERE id = ANY($1::int[]) 
       ORDER BY name`,
      [req.user.account_ids]
    );

    res.json({
      accounts: result.rows
    });
  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get specific account details
router.get('/:accountId', auth, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Check if user has access
    if (!req.user.account_ids.includes(parseInt(accountId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

module.exports = router;