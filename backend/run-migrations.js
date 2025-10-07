// Script manual para ejecutar migraciones
require('dotenv').config();
const { connectDB, query } = require('./src/config/database');
const runMigrations = require('./src/database/runMigrations');

async function main() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await connectDB();
    
    console.log('📝 Ejecutando migraciones...');
    await runMigrations();
    
    console.log('✅ Migraciones completadas exitosamente');
    
    // Verificar que la tabla se creó
    const result = await query('SELECT * FROM sync_progress');
    console.log('📊 Estado actual de sync_progress:', result.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();