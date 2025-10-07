const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all alerts for an account
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
      'SELECT * FROM alerts WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );

    res.json({
      alerts: result.rows
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create a new alert
router.post('/', [
  auth,
  body('accountId').isInt(),
  body('name').notEmpty(),
  body('type').isIn(['high_cpc', 'low_roas', 'budget_pace']),
  body('conditions').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, name, type, conditions, notificationChannels } = req.body;

    // Check if user has access
    if (!req.user.account_ids.includes(accountId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `INSERT INTO alerts (account_id, name, type, conditions, notification_channels)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [accountId, name, type, conditions, notificationChannels || {}]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Update an alert
router.put('/:alertId', auth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const updates = req.body;

    // Get alert to check access
    const alertResult = await query(
      'SELECT account_id FROM alerts WHERE id = $1',
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Check if user has access
    if (!req.user.account_ids.includes(alertResult.rows[0].account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    if ('enabled' in updates) {
      fields.push(`enabled = $${paramCount++}`);
      values.push(updates.enabled);
    }
    if ('conditions' in updates) {
      fields.push(`conditions = $${paramCount++}`);
      values.push(updates.conditions);
    }
    if ('notification_channels' in updates) {
      fields.push(`notification_channels = $${paramCount++}`);
      values.push(updates.notification_channels);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(alertId);
    const result = await query(
      `UPDATE alerts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update alert error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete an alert
router.delete('/:alertId', auth, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Get alert to check access
    const alertResult = await query(
      'SELECT account_id FROM alerts WHERE id = $1',
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Check if user has access
    if (!req.user.account_ids.includes(alertResult.rows[0].account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM alerts WHERE id = $1', [alertId]);

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    logger.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;