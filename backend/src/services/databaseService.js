const { query } = require('../config/database');
const logger = require('../utils/logger');

async function refreshMaterializedViews() {
  try {
    // Refresh dashboard summary view
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary');
    logger.info('Refreshed mv_dashboard_summary');

    // Refresh campaign comparison view
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_comparison');
    logger.info('Refreshed mv_campaign_comparison');
  } catch (error) {
    logger.error('Refresh materialized views error:', error);
    throw error;
  }
}

module.exports = {
  refreshMaterializedViews
};