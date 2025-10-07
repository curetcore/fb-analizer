const express = require('express');
const facebookSync = require('../services/facebookSync');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Manual sync endpoint (admin only)
router.post('/facebook', auth, authorize('admin'), async (req, res) => {
  try {
    const { daysBack = 30 } = req.body;
    
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      return res.status(400).json({ 
        error: 'Facebook access token not configured',
        help: 'Set FACEBOOK_ACCESS_TOKEN in environment variables'
      });
    }
    
    // Run sync in background
    res.json({ 
      message: 'Sync started in background',
      daysBack 
    });
    
    // Execute sync asynchronously
    facebookSync.fullSync(daysBack)
      .then(result => {
        logger.info('Manual Facebook sync completed', result);
      })
      .catch(error => {
        logger.error('Manual Facebook sync failed', error);
      });
      
  } catch (error) {
    logger.error('Sync endpoint error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// Check sync status
router.get('/status', auth, async (req, res) => {
  try {
    // Get last sync info from database
    const { query } = require('../config/database');
    
    const lastSync = await query(`
      SELECT 
        MAX(updated_at) as last_sync,
        COUNT(DISTINCT date) as days_synced,
        COUNT(*) as total_records
      FROM metrics_daily
      WHERE updated_at > NOW() - INTERVAL '24 hours'
    `);
    
    const accounts = await query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts
      FROM accounts
    `);
    
    const campaigns = await query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_campaigns
      FROM campaigns
    `);
    
    res.json({
      lastSync: lastSync.rows[0].last_sync,
      recentMetrics: {
        dayssynced: lastSync.rows[0].days_synced,
        recordsSynced: lastSync.rows[0].total_records
      },
      accounts: accounts.rows[0],
      campaigns: campaigns.rows[0],
      hasAccessToken: !!process.env.FACEBOOK_ACCESS_TOKEN
    });
    
  } catch (error) {
    logger.error('Status endpoint error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

module.exports = router;