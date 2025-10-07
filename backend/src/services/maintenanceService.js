const { query } = require('../config/database');
const logger = require('../utils/logger');

async function cleanupOldData() {
  try {
    // Delete hourly metrics older than 7 days
    const hourlyResult = await query(
      'DELETE FROM metrics_hourly WHERE datetime < NOW() - INTERVAL \'7 days\''
    );
    logger.info(`Deleted ${hourlyResult.rowCount} old hourly metrics`);

    // Delete alert history older than 90 days
    const alertResult = await query(
      'DELETE FROM alert_history WHERE triggered_at < NOW() - INTERVAL \'90 days\''
    );
    logger.info(`Deleted ${alertResult.rowCount} old alert history records`);

    // Delete expired user sessions
    const sessionResult = await query(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    logger.info(`Deleted ${sessionResult.rowCount} expired sessions`);

    // Create next month's partition if needed
    await createNextMonthPartition();
  } catch (error) {
    logger.error('Cleanup old data error:', error);
    throw error;
  }
}

async function createNextMonthPartition() {
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    
    const partitionName = `metrics_daily_${year}_${month}`;
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, nextMonth.getMonth() + 1, 1);
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`;

    // Check if partition exists
    const checkResult = await query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = $1
      )`,
      [partitionName]
    );

    if (!checkResult.rows[0].exists) {
      await query(`
        CREATE TABLE ${partitionName} PARTITION OF metrics_daily
        FOR VALUES FROM ('${startDate}') TO ('${endDateStr}')
      `);
      logger.info(`Created partition ${partitionName}`);
    }
  } catch (error) {
    logger.error('Create partition error:', error);
  }
}

module.exports = {
  cleanupOldData
};