const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const syncProgress = require('./syncProgress');
const { format, subDays } = require('date-fns');

class FacebookSyncService {
  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    // Log token info on initialization
    if (this.accessToken) {
      console.log(`Facebook token configured: ${this.accessToken.substring(0, 20)}...`);
    } else {
      console.error('WARNING: FACEBOOK_ACCESS_TOKEN is not configured!');
    }
  }

  // Obtener todas las cuentas publicitarias
  async getAdAccounts() {
    try {
      logger.info('Fetching Facebook ad accounts...');
      
      if (!this.accessToken) {
        logger.error('No Facebook access token available');
        throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
      }
      
      const response = await axios.get(`${this.baseUrl}/me/adaccounts`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,currency,timezone_name,account_status'
        }
      });

      logger.info(`Found ${response.data.data.length} ad accounts`);
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching ad accounts:', error.response?.data || error.message || error);
      throw error;
    }
  }

  // Sincronizar cuentas a la base de datos
  async syncAccounts() {
    const accounts = await this.getAdAccounts();
    
    for (const account of accounts) {
      // Quitar el prefijo "act_" del ID
      const facebookId = account.id.replace('act_', '');
      
      await query(`
        INSERT INTO accounts (facebook_id, name, currency, timezone, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (facebook_id) 
        DO UPDATE SET
          name = EXCLUDED.name,
          currency = EXCLUDED.currency,
          timezone = EXCLUDED.timezone,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [
        facebookId,
        account.name,
        account.currency,
        account.timezone_name,
        account.account_status === 1 ? 'active' : 'inactive'
      ]);
    }

    logger.info(`Synced ${accounts.length} ad accounts`);
    return accounts;
  }

  // Obtener campañas de una cuenta
  async getCampaigns(accountId) {
    try {
      const response = await axios.get(`${this.baseUrl}/act_${accountId}/campaigns`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,status,objective,created_time,updated_time',
          limit: 500
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching campaigns for account ${accountId}:`, error.response?.data || error);
      throw error;
    }
  }

  // Sincronizar campañas
  async syncCampaigns(accountId) {
    try {
      const campaigns = await this.getCampaigns(accountId);
      
      // Primero obtener el ID interno de la cuenta
      const accountResult = await query(
        'SELECT id FROM accounts WHERE facebook_id = $1',
        [accountId]
      );
      
      if (accountResult.rows.length === 0) {
        logger.error(`Account ${accountId} not found in database`);
        return 0;
      }
      
      const internalAccountId = accountResult.rows[0].id;

      for (const campaign of campaigns) {
        await query(`
          INSERT INTO campaigns (facebook_id, account_id, name, status, objective, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (facebook_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            objective = EXCLUDED.objective,
            updated_at = NOW()
        `, [
          campaign.id,
          internalAccountId,
          campaign.name,
          campaign.status,
          campaign.objective,
          campaign.created_time
        ]);
      }

      logger.info(`Synced ${campaigns.length} campaigns for account ${accountId}`);
      return campaigns.length;
    } catch (error) {
      logger.error(`Error in syncCampaigns for account ${accountId}:`, error);
      return 0;
    }
  }

  // Obtener insights (métricas) de campañas
  async getCampaignInsights(accountId, startDate, endDate) {
    try {
      const response = await axios.get(`${this.baseUrl}/act_${accountId}/insights`, {
        params: {
          access_token: this.accessToken,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,clicks,spend,actions,action_values,ctr,cpc',
          time_range: JSON.stringify({ 
            since: startDate, 
            until: endDate 
          }),
          time_increment: 1, // Datos diarios
          limit: 500
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching insights for account ${accountId}:`, error.response?.data || error);
      throw error;
    }
  }

  // Sincronizar métricas diarias
  async syncDailyMetrics(accountId, daysBack = 30) {
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
      
      const insights = await this.getCampaignInsights(accountId, startDate, endDate);

      // Obtener el ID interno de la cuenta
      const accountResult = await query(
        'SELECT id FROM accounts WHERE facebook_id = $1',
        [accountId]
      );
      
      if (accountResult.rows.length === 0) {
        logger.error(`Account ${accountId} not found for metrics sync`);
        return 0;
      }
      
      const internalAccountId = accountResult.rows[0].id;

      for (const insight of insights) {
        // Obtener el ID interno de la campaña
        const campaignResult = await query(
          'SELECT id FROM campaigns WHERE facebook_id = $1',
          [insight.campaign_id]
        );
        
        if (campaignResult.rows.length === 0) {
          logger.warn(`Campaign ${insight.campaign_id} not found, skipping metrics`);
          continue;
        }
        
        const internalCampaignId = campaignResult.rows[0].id;

        // Extraer conversiones y revenue de las acciones
        let conversions = 0;
        let revenue = 0;
        
        if (insight.actions) {
          const purchaseAction = insight.actions.find(
            action => action.action_type === 'purchase' || 
                     action.action_type === 'offsite_conversion.fb_pixel_purchase'
          );
          if (purchaseAction) {
            conversions = parseInt(purchaseAction.value) || 0;
          }
        }
        
        if (insight.action_values) {
          const purchaseValue = insight.action_values.find(
            value => value.action_type === 'purchase' || 
                    value.action_type === 'offsite_conversion.fb_pixel_purchase'
          );
          if (purchaseValue) {
            revenue = parseFloat(purchaseValue.value) || 0;
          }
        }

        // Calcular ROAS
        const roas = parseFloat(insight.spend) > 0 ? revenue / parseFloat(insight.spend) : 0;

        // Insertar métricas
        await query(`
          INSERT INTO metrics_daily (
            date, campaign_id, account_id,
            impressions, clicks, spend, conversions, revenue,
            ctr, cpc, roas
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (date, campaign_id) 
          DO UPDATE SET
            impressions = EXCLUDED.impressions,
            clicks = EXCLUDED.clicks,
            spend = EXCLUDED.spend,
            conversions = EXCLUDED.conversions,
            revenue = EXCLUDED.revenue,
            ctr = EXCLUDED.ctr,
            cpc = EXCLUDED.cpc,
            roas = EXCLUDED.roas,
            updated_at = NOW()
        `, [
          insight.date_start,
          internalCampaignId,
          internalAccountId,
          parseInt(insight.impressions) || 0,
          parseInt(insight.clicks) || 0,
          parseFloat(insight.spend) || 0,
          conversions,
          revenue,
          parseFloat(insight.ctr) || 0,
          parseFloat(insight.cpc) || 0,
          roas
        ]);
      }

      logger.info(`Synced ${insights.length} daily metrics for account ${accountId}`);
      return insights.length;
    } catch (error) {
      logger.error(`Error in syncDailyMetrics for account ${accountId}:`, error);
      return 0;
    }
  }

  // Sincronización completa
  async fullSync(daysBack = 30) {
    try {
      logger.info('Starting Facebook full sync...');
      
      // Verificar token
      if (!this.accessToken) {
        logger.error('Facebook access token is not configured');
        throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
      }
      
      logger.info(`Token starts with: ${this.accessToken.substring(0, 20)}...`);
      
      // Calcular pasos totales
      let accounts;
      try {
        accounts = await this.getAdAccounts();
      } catch (error) {
        logger.error('Failed to get ad accounts:', error);
        await syncProgress.completeSync(false, error.message || 'Failed to fetch ad accounts');
        throw error;
      }
      
      const totalSteps = 1 + (accounts.length * 3); // 1 para cuentas + 3 por cuenta (detalles, campañas, métricas)
      
      await syncProgress.startSync(totalSteps);
      
      // 1. Sincronizar cuentas
      await syncProgress.updateProgress(1, 'Sincronizando cuentas de Facebook...', {
        accounts: { total: accounts.length, processed: 0 }
      });
      await this.syncAccounts();
      
      let step = 1;
      let totalCampaigns = 0;
      let totalMetrics = 0;
      
      // 2. Para cada cuenta, sincronizar campañas y métricas
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const accountId = account.id.replace('act_', '');
        
        try {
          // Actualizar progreso - detalles de cuenta
          step++;
          await syncProgress.updateProgress(step, `Procesando cuenta ${account.name}...`, {
            accounts: { total: accounts.length, processed: i + 1 }
          });
          
          // Sincronizar campañas
          step++;
          await syncProgress.updateProgress(step, `Sincronizando campañas de ${account.name}...`);
          const campaignCount = await this.syncCampaigns(accountId);
          totalCampaigns += campaignCount;
          
          // Sincronizar métricas
          step++;
          await syncProgress.updateProgress(step, `Sincronizando métricas de ${account.name} (últimos ${daysBack} días)...`, {
            campaigns: { total: campaignCount, processed: campaignCount }
          });
          const metricCount = await this.syncDailyMetrics(accountId, daysBack);
          totalMetrics += metricCount;
          
        } catch (error) {
          logger.error(`Error syncing account ${accountId}:`, error);
          // Continuar con otras cuentas si una falla
        }
      }
      
      // Marcar sincronización como completada
      await syncProgress.completeSync(true);
      
      logger.info(`Facebook sync completed: ${accounts.length} accounts, ${totalCampaigns} campaigns, ${totalMetrics} metrics`);
      return { 
        success: true, 
        accounts: accounts.length,
        campaigns: totalCampaigns,
        metrics: totalMetrics
      };
      
    } catch (error) {
      logger.error('Facebook sync failed:', error);
      await syncProgress.completeSync(false);
      throw error;
    }
  }

  // Sincronización incremental (últimos 7 días)
  async incrementalSync() {
    return this.fullSync(7);
  }
}

module.exports = new FacebookSyncService();