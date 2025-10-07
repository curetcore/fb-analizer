const axios = require('axios');
const { query, getClient } = require('../config/database');
const logger = require('../utils/logger');
const { format, subDays } = require('date-fns');

const FB_API_VERSION = 'v18.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

class FacebookSyncService {
  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
  }

  async syncFacebookData() {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get all active accounts
      const accounts = await this.getAccounts(client);
      
      for (const account of accounts) {
        await this.syncAccountData(account, client);
      }
      
      await client.query('COMMIT');
      logger.info('Facebook sync completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Facebook sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAccounts(client) {
    const result = await client.query(
      "SELECT * FROM accounts WHERE status = 'active'"
    );
    return result.rows;
  }

  async syncAccountData(account, client) {
    try {
      // Sync campaigns
      const campaigns = await this.fetchCampaigns(account.facebook_account_id);
      await this.saveCampaigns(campaigns, account.id, client);
      
      // Sync ad sets and ads
      for (const campaign of campaigns) {
        const adSets = await this.fetchAdSets(campaign.id);
        await this.saveAdSets(adSets, campaign.id, client);
        
        for (const adSet of adSets) {
          const ads = await this.fetchAds(adSet.id);
          await this.saveAds(ads, adSet.id, client);
        }
      }
      
      // Sync insights (metrics)
      await this.syncInsights(account, client);
      
    } catch (error) {
      logger.error(`Failed to sync account ${account.id}:`, error);
      throw error;
    }
  }

  async fetchCampaigns(accountId) {
    const url = `${FB_BASE_URL}/act_${accountId}/campaigns`;
    const params = {
      access_token: this.accessToken,
      fields: 'id,name,status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
      limit: 100
    };

    const response = await axios.get(url, { params });
    return response.data.data || [];
  }

  async saveCampaigns(campaigns, accountId, client) {
    for (const campaign of campaigns) {
      await client.query(`
        INSERT INTO campaigns (
          account_id, facebook_campaign_id, name, status, objective,
          buying_type, daily_budget, lifetime_budget, start_time, stop_time,
          created_time, updated_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (facebook_campaign_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          lifetime_budget = EXCLUDED.lifetime_budget,
          updated_time = EXCLUDED.updated_time,
          updated_at = NOW()
      `, [
        accountId,
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.objective,
        campaign.buying_type,
        campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
        campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
        campaign.start_time,
        campaign.stop_time,
        campaign.created_time,
        campaign.updated_time
      ]);
    }
  }

  async fetchAdSets(campaignId) {
    const url = `${FB_BASE_URL}/${campaignId}/adsets`;
    const params = {
      access_token: this.accessToken,
      fields: 'id,name,status,daily_budget,lifetime_budget,bid_amount,billing_event,optimization_goal,targeting,start_time,end_time,created_time,updated_time',
      limit: 100
    };

    const response = await axios.get(url, { params });
    return response.data.data || [];
  }

  async saveAdSets(adSets, campaignId, client) {
    // Get internal campaign ID
    const campaignResult = await client.query(
      'SELECT id FROM campaigns WHERE facebook_campaign_id = $1',
      [campaignId]
    );
    
    if (campaignResult.rows.length === 0) return;
    
    const internalCampaignId = campaignResult.rows[0].id;

    for (const adSet of adSets) {
      await client.query(`
        INSERT INTO ad_sets (
          campaign_id, facebook_adset_id, name, status,
          daily_budget, lifetime_budget, bid_amount, billing_event,
          optimization_goal, targeting, start_time, end_time,
          created_time, updated_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (facebook_adset_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          lifetime_budget = EXCLUDED.lifetime_budget,
          updated_time = EXCLUDED.updated_time,
          updated_at = NOW()
      `, [
        internalCampaignId,
        adSet.id,
        adSet.name,
        adSet.status,
        adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
        adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
        adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : null,
        adSet.billing_event,
        adSet.optimization_goal,
        JSON.stringify(adSet.targeting),
        adSet.start_time,
        adSet.end_time,
        adSet.created_time,
        adSet.updated_time
      ]);
    }
  }

  async fetchAds(adSetId) {
    const url = `${FB_BASE_URL}/${adSetId}/ads`;
    const params = {
      access_token: this.accessToken,
      fields: 'id,name,status,creative,created_time,updated_time',
      limit: 100
    };

    const response = await axios.get(url, { params });
    return response.data.data || [];
  }

  async saveAds(ads, adSetId, client) {
    // Get internal ad set ID
    const adSetResult = await client.query(
      'SELECT id FROM ad_sets WHERE facebook_adset_id = $1',
      [adSetId]
    );
    
    if (adSetResult.rows.length === 0) return;
    
    const internalAdSetId = adSetResult.rows[0].id;

    for (const ad of ads) {
      await client.query(`
        INSERT INTO ads (
          ad_set_id, facebook_ad_id, name, status,
          creative_id, created_time, updated_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (facebook_ad_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          updated_time = EXCLUDED.updated_time,
          updated_at = NOW()
      `, [
        internalAdSetId,
        ad.id,
        ad.name,
        ad.status,
        ad.creative?.id,
        ad.created_time,
        ad.updated_time
      ]);
    }
  }

  async syncInsights(account, client) {
    // Sync last 7 days of data
    const since = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const until = format(new Date(), 'yyyy-MM-dd');

    const url = `${FB_BASE_URL}/act_${account.facebook_account_id}/insights`;
    const params = {
      access_token: this.accessToken,
      fields: 'campaign_id,campaign_name,impressions,clicks,spend,conversions,conversion_values,ctr,cpc,cpm,roas',
      level: 'campaign',
      time_range: JSON.stringify({ since, until }),
      time_increment: 1, // Daily breakdown
      limit: 500
    };

    try {
      const response = await axios.get(url, { params });
      const insights = response.data.data || [];

      for (const insight of insights) {
        await this.saveInsight(insight, account.id, client);
      }
    } catch (error) {
      logger.error(`Failed to fetch insights for account ${account.id}:`, error);
    }
  }

  async saveInsight(insight, accountId, client) {
    // Get internal campaign ID
    const campaignResult = await client.query(
      'SELECT id FROM campaigns WHERE facebook_campaign_id = $1',
      [insight.campaign_id]
    );
    
    if (campaignResult.rows.length === 0) return;
    
    const campaignId = campaignResult.rows[0].id;

    const spend = parseFloat(insight.spend || 0);
    const revenue = parseFloat(insight.conversion_values?.[0]?.value || 0);
    const roas = spend > 0 ? revenue / spend : 0;

    await client.query(`
      INSERT INTO metrics_daily (
        date, account_id, campaign_id,
        impressions, clicks, spend, conversions,
        revenue, ctr, cpc, cpm, roas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (date, campaign_id, id) DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        spend = EXCLUDED.spend,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue,
        ctr = EXCLUDED.ctr,
        cpc = EXCLUDED.cpc,
        cpm = EXCLUDED.cpm,
        roas = EXCLUDED.roas,
        updated_at = NOW()
    `, [
      insight.date_start,
      accountId,
      campaignId,
      parseInt(insight.impressions || 0),
      parseInt(insight.clicks || 0),
      spend,
      parseInt(insight.conversions?.[0]?.value || 0),
      revenue,
      parseFloat(insight.ctr || 0),
      parseFloat(insight.cpc || 0),
      parseFloat(insight.cpm || 0),
      roas
    ]);
  }
}

const service = new FacebookSyncService();

module.exports = {
  syncFacebookData: () => service.syncFacebookData()
};