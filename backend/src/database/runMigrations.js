const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    // Crear tabla de migraciones si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, 'migrations');
    let files = [];
    
    try {
      files = await fs.readdir(migrationsDir);
    } catch (error) {
      logger.warn('No migrations directory found, skipping migrations');
      return;
    }
    
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      // Verificar si ya se ejecutó
      const result = await query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (result.rows.length === 0) {
        logger.info(`Running migration: ${file}`);
        
        try {
          // Leer y ejecutar el SQL
          const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
          await query(sql);
          
          // Marcar como ejecutada
          await query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
          
          logger.info(`Migration ${file} completed successfully`);
        } catch (error) {
          logger.error(`Migration ${file} failed:`, error);
          throw error;
        }
      } else {
        logger.info(`Migration ${file} already executed, skipping`);
      }
    }
    
    logger.info('All migrations completed');
  } catch (error) {
    logger.error('Migration runner error:', error);
    // No lanzar el error para no impedir que el servidor inicie
    logger.warn('Server will continue despite migration errors');
  }
}

module.exports = runMigrations;