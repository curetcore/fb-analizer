const { query } = require('../config/database');
const logger = require('../utils/logger');

async function processAlerts() {
  try {
    // Get all enabled alerts
    const alertsResult = await query(
      'SELECT * FROM alerts WHERE enabled = true'
    );

    for (const alert of alertsResult.rows) {
      await checkAlert(alert);
    }
  } catch (error) {
    logger.error('Process alerts error:', error);
  }
}

async function checkAlert(alert) {
  try {
    let shouldTrigger = false;
    let metricValue = 0;

    switch (alert.type) {
      case 'high_cpc':
        const cpcResult = await query(
          `SELECT AVG(cpc) as avg_cpc
           FROM metrics_daily
           WHERE account_id = $1 AND date = CURRENT_DATE`,
          [alert.account_id]
        );
        metricValue = cpcResult.rows[0]?.avg_cpc || 0;
        shouldTrigger = metricValue > alert.conditions.threshold;
        break;

      case 'low_roas':
        const roasResult = await query(
          `SELECT AVG(roas) as avg_roas
           FROM metrics_daily
           WHERE account_id = $1 AND date = CURRENT_DATE`,
          [alert.account_id]
        );
        metricValue = roasResult.rows[0]?.avg_roas || 0;
        shouldTrigger = metricValue < alert.conditions.threshold;
        break;

      case 'budget_pace':
        const spendResult = await query(
          `SELECT SUM(spend) as total_spend
           FROM metrics_daily
           WHERE account_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)`,
          [alert.account_id]
        );
        metricValue = spendResult.rows[0]?.total_spend || 0;
        const budgetThreshold = alert.conditions.monthly_budget * 0.8;
        shouldTrigger = metricValue > budgetThreshold;
        break;
    }

    if (shouldTrigger) {
      // Record alert trigger
      await query(
        `INSERT INTO alert_history (alert_id, metric_value, threshold_value, details)
         VALUES ($1, $2, $3, $4)`,
        [
          alert.id,
          metricValue,
          alert.conditions.threshold || alert.conditions.monthly_budget,
          {
            alert_name: alert.name,
            alert_type: alert.type,
            triggered_at: new Date()
          }
        ]
      );

      // Update last triggered
      await query(
        'UPDATE alerts SET last_triggered = NOW() WHERE id = $1',
        [alert.id]
      );

      // Send notifications
      await sendAlertNotifications(alert, metricValue);
    }
  } catch (error) {
    logger.error(`Check alert ${alert.id} error:`, error);
  }
}

async function sendAlertNotifications(alert, metricValue) {
  // TODO: Implement email/webhook notifications
  logger.info(`Alert triggered: ${alert.name}, value: ${metricValue}`);
}

module.exports = {
  processAlerts
};