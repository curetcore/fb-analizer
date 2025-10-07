const cron = require('node-cron');
const logger = require('../utils/logger');
const { syncFacebookData } = require('../services/facebookSync');
const { processAlerts } = require('../services/alertService');
const { cleanupOldData } = require('../services/maintenanceService');
const { refreshMaterializedViews } = require('../services/databaseService');

const jobs = [];

// Sync Facebook data every 2 hours
const syncJob = cron.schedule('0 */2 * * *', async () => {
  logger.info('Starting Facebook data sync');
  try {
    await syncFacebookData();
    logger.info('Facebook data sync completed');
  } catch (error) {
    logger.error('Facebook sync failed:', error);
  }
}, {
  scheduled: false
});

// Process alerts every 15 minutes
const alertJob = cron.schedule('*/15 * * * *', async () => {
  logger.info('Processing alerts');
  try {
    await processAlerts();
  } catch (error) {
    logger.error('Alert processing failed:', error);
  }
}, {
  scheduled: false
});

// Daily cleanup at 3 AM
const cleanupJob = cron.schedule('0 3 * * *', async () => {
  logger.info('Starting daily cleanup');
  try {
    await cleanupOldData();
    await refreshMaterializedViews();
    logger.info('Daily cleanup completed');
  } catch (error) {
    logger.error('Daily cleanup failed:', error);
  }
}, {
  scheduled: false
});

// Refresh materialized views every hour
const refreshViewsJob = cron.schedule('0 * * * *', async () => {
  logger.info('Refreshing materialized views');
  try {
    await refreshMaterializedViews();
  } catch (error) {
    logger.error('View refresh failed:', error);
  }
}, {
  scheduled: false
});

jobs.push(syncJob, alertJob, cleanupJob, refreshViewsJob);

module.exports = {
  start: () => {
    jobs.forEach(job => job.start());
    logger.info('Cron jobs started');
  },
  stop: () => {
    jobs.forEach(job => job.stop());
    logger.info('Cron jobs stopped');
  }
};