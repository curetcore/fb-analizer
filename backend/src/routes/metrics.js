const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const cache = require('../config/redis');
const logger = require('../utils/logger');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');

const router = express.Router();

// Get dashboard metrics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.query;
    
    // Check cache
    const cacheKey = `dashboard:${accountId}:${startDate}:${endDate}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Verify user has access to account
    if (!req.user.account_ids.includes(parseInt(accountId))) {
      return res.status(403).json({ error: 'Access denied to this account' });
    }

    // Get date range
    const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const end = endDate || format(new Date(), 'yyyy-MM-dd');

    // Get summary metrics
    const summaryResult = await query(`
      SELECT 
        COUNT(DISTINCT campaign_id) as total_campaigns,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(spend) as total_spend,
        SUM(conversions) as total_conversions,
        SUM(revenue) as total_revenue,
        AVG(ctr) as avg_ctr,
        AVG(cpc) as avg_cpc,
        AVG(roas) as avg_roas
      FROM metrics_daily
      WHERE account_id = $1 
        AND date >= $2 
        AND date <= $3
    `, [accountId, start, end]);

    // Get daily trend
    const trendResult = await query(`
      SELECT 
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(spend) as spend,
        SUM(conversions) as conversions,
        SUM(revenue) as revenue,
        AVG(ctr) as ctr,
        AVG(cpc) as cpc,
        AVG(roas) as roas
      FROM metrics_daily
      WHERE account_id = $1 
        AND date >= $2 
        AND date <= $3
      GROUP BY date
      ORDER BY date
    `, [accountId, start, end]);

    // Get top campaigns
    const topCampaignsResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.status,
        SUM(m.impressions) as impressions,
        SUM(m.clicks) as clicks,
        SUM(m.spend) as spend,
        SUM(m.conversions) as conversions,
        SUM(m.revenue) as revenue,
        AVG(m.roas) as roas
      FROM campaigns c
      JOIN metrics_daily m ON c.id = m.campaign_id
      WHERE c.account_id = $1 
        AND m.date >= $2 
        AND m.date <= $3
      GROUP BY c.id, c.name, c.status
      ORDER BY SUM(m.revenue) DESC
      LIMIT 10
    `, [accountId, start, end]);

    const data = {
      summary: summaryResult.rows[0],
      trend: trendResult.rows,
      topCampaigns: topCampaignsResult.rows,
      dateRange: { start, end }
    };

    // Cache for 15 minutes
    await cache.set(cacheKey, data, 900);

    res.json(data);
  } catch (error) {
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get campaign metrics
router.get('/campaigns/:campaignId', auth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const end = endDate || format(new Date(), 'yyyy-MM-dd');

    // Get campaign details
    const campaignResult = await query(`
      SELECT c.*, a.name as account_name
      FROM campaigns c
      JOIN accounts a ON c.account_id = a.id
      WHERE c.id = $1
    `, [campaignId]);

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Verify access
    if (!req.user.account_ids.includes(campaign.account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get metrics
    const metricsResult = await query(`
      SELECT 
        date,
        impressions,
        clicks,
        spend,
        conversions,
        revenue,
        ctr,
        cpc,
        roas
      FROM metrics_daily
      WHERE campaign_id = $1 
        AND date >= $2 
        AND date <= $3
      ORDER BY date
    `, [campaignId, start, end]);

    // Get ad sets performance
    const adSetsResult = await query(`
      SELECT 
        ads.id,
        ads.name,
        ads.status,
        SUM(m.impressions) as impressions,
        SUM(m.clicks) as clicks,
        SUM(m.spend) as spend,
        AVG(m.roas) as roas
      FROM ad_sets ads
      JOIN metrics_daily m ON ads.id = m.ad_set_id
      WHERE ads.campaign_id = $1 
        AND m.date >= $2 
        AND m.date <= $3
      GROUP BY ads.id, ads.name, ads.status
      ORDER BY SUM(m.spend) DESC
    `, [campaignId, start, end]);

    res.json({
      campaign,
      metrics: metricsResult.rows,
      adSets: adSetsResult.rows,
      dateRange: { start, end }
    });
  } catch (error) {
    logger.error('Campaign metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign metrics' });
  }
});

// Get hourly metrics (last 24 hours)
router.get('/hourly', auth, async (req, res) => {
  try {
    const { accountId } = req.query;

    if (!req.user.account_ids.includes(parseInt(accountId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(`
      SELECT 
        datetime,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(spend) as spend,
        SUM(conversions) as conversions
      FROM metrics_hourly
      WHERE account_id = $1 
        AND datetime >= NOW() - INTERVAL '24 hours'
      GROUP BY datetime
      ORDER BY datetime
    `, [accountId]);

    res.json({
      hourlyMetrics: result.rows
    });
  } catch (error) {
    logger.error('Hourly metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch hourly metrics' });
  }
});

// Compare campaigns
router.post('/compare', auth, async (req, res) => {
  try {
    const { campaignIds, startDate, endDate } = req.body;

    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({ error: 'Campaign IDs required' });
    }

    const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const end = endDate || format(new Date(), 'yyyy-MM-dd');

    // Verify access to all campaigns
    const accessResult = await query(`
      SELECT DISTINCT account_id 
      FROM campaigns 
      WHERE id = ANY($1::int[])
    `, [campaignIds]);

    const accountIds = accessResult.rows.map(r => r.account_id);
    const hasAccess = accountIds.every(id => req.user.account_ids.includes(id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to some campaigns' });
    }

    // Get comparison data
    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.status,
        SUM(m.impressions) as impressions,
        SUM(m.clicks) as clicks,
        SUM(m.spend) as spend,
        SUM(m.conversions) as conversions,
        SUM(m.revenue) as revenue,
        AVG(m.ctr) as ctr,
        AVG(m.cpc) as cpc,
        AVG(m.roas) as roas,
        COUNT(DISTINCT m.date) as active_days
      FROM campaigns c
      JOIN metrics_daily m ON c.id = m.campaign_id
      WHERE c.id = ANY($1::int[])
        AND m.date >= $2 
        AND m.date <= $3
      GROUP BY c.id, c.name, c.status
    `, [campaignIds, start, end]);

    res.json({
      campaigns: result.rows,
      dateRange: { start, end }
    });
  } catch (error) {
    logger.error('Campaign comparison error:', error);
    res.status(500).json({ error: 'Failed to compare campaigns' });
  }
});

module.exports = router;