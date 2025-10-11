// Servicio para rastrear el progreso de sincronización
const { query } = require('../config/database');
const logger = require('../utils/logger');

class SyncProgressService {
  constructor() {
    this.activeSync = null;
  }

  async startSync(totalSteps) {
    this.activeSync = {
      id: Date.now(),
      startTime: new Date(),
      totalSteps,
      currentStep: 0,
      currentTask: 'Iniciando sincronización...',
      percentage: 0,
      details: {
        accounts: { total: 0, processed: 0 },
        campaigns: { total: 0, processed: 0 },
        metrics: { total: 0, processed: 0 }
      }
    };

    // Guardar en base de datos
    try {
      await query(
        `INSERT INTO sync_progress (id, status, total_steps, current_step, current_task, percentage, started_at)
         VALUES ($1, 'running', $2, 0, $3, 0, NOW())
         ON CONFLICT (id) DO UPDATE SET 
           status = 'running',
           total_steps = $2,
           current_step = 0,
           current_task = $3,
           percentage = 0,
           started_at = NOW()`,
        [1, totalSteps, this.activeSync.currentTask]
      );
    } catch (error) {
      logger.error('Error saving sync progress:', error);
    }

    return this.activeSync.id;
  }

  async updateProgress(step, task, details = {}) {
    if (!this.activeSync) return;

    this.activeSync.currentStep = step;
    this.activeSync.currentTask = task;
    this.activeSync.percentage = Math.round((step / this.activeSync.totalSteps) * 100);
    
    if (details) {
      Object.assign(this.activeSync.details, details);
    }

    // Actualizar en base de datos
    try {
      await query(
        `UPDATE sync_progress 
         SET current_step = $1,
             current_task = $2,
             percentage = $3,
             details = $4,
             updated_at = NOW()
         WHERE id = 1`,
        [
          this.activeSync.currentStep,
          this.activeSync.currentTask,
          this.activeSync.percentage,
          JSON.stringify(this.activeSync.details)
        ]
      );
    } catch (error) {
      logger.error('Error updating sync progress:', error);
    }
  }

  async completeSync(success = true, errorMessage = null) {
    if (!this.activeSync) return;

    const status = success ? 'completed' : 'failed';
    
    // Si hay error, guardarlo en los detalles
    if (!success && errorMessage) {
      if (!this.activeSync.details) {
        this.activeSync.details = {};
      }
      this.activeSync.details.error = errorMessage;
    }
    
    try {
      await query(
        `UPDATE sync_progress 
         SET status = $1,
             percentage = $2,
             details = $3,
             completed_at = NOW()
         WHERE id = 1`,
        [status, success ? 100 : this.activeSync.percentage, JSON.stringify(this.activeSync.details || {})]
      );
    } catch (error) {
      logger.error('Error completing sync progress:', error);
    }

    this.activeSync = null;
  }

  async getProgress() {
    if (this.activeSync) {
      return this.activeSync;
    }

    // Obtener de la base de datos
    try {
      const result = await query(
        `SELECT * FROM sync_progress WHERE id = 1`
      );

      if (result.rows.length > 0) {
        const progress = result.rows[0];
        return {
          id: progress.id,
          status: progress.status,
          percentage: progress.percentage || 0,
          currentTask: progress.current_task || '',
          currentStep: progress.current_step || 0,
          totalSteps: progress.total_steps || 0,
          details: progress.details || {},
          startTime: progress.started_at,
          completedAt: progress.completed_at
        };
      }
    } catch (error) {
      logger.error('Error getting sync progress:', error);
    }

    return null;
  }
}

module.exports = new SyncProgressService();