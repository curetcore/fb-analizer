// Script de sincronización manual
require('dotenv').config();
const facebookSync = require('./src/services/facebookSync');
const { query } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function manualSync() {
  console.log('🚀 Iniciando sincronización manual de Facebook Ads...\n');
  
  try {
    // Verificar token
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      console.error('❌ Error: FACEBOOK_ACCESS_TOKEN no está configurado');
      process.exit(1);
    }
    
    console.log('✅ Token de Facebook encontrado');
    console.log('📊 Iniciando sincronización completa...\n');
    
    // Ejecutar sincronización completa
    const result = await facebookSync.fullSync(30);
    
    console.log('\n📈 Resumen de sincronización:');
    console.log(`   Cuentas sincronizadas: ${result.accounts || 0}`);
    console.log(`   Campañas sincronizadas: ${result.campaigns || 0}`);
    console.log(`   Registros de métricas: ${result.metrics || 0}`);
    
    // Verificar datos en la base
    const accountCount = await query('SELECT COUNT(*) FROM accounts');
    const campaignCount = await query('SELECT COUNT(*) FROM campaigns');
    const metricsCount = await query('SELECT COUNT(*) FROM metrics_daily');
    
    console.log('\n📊 Estado actual en la base de datos:');
    console.log(`   Total cuentas: ${accountCount.rows[0].count}`);
    console.log(`   Total campañas: ${campaignCount.rows[0].count}`);
    console.log(`   Total métricas: ${metricsCount.rows[0].count}`);
    
    console.log('\n✅ Sincronización completada exitosamente!');
    console.log('   Los datos ya deberían estar visibles en el dashboard.');
    
  } catch (error) {
    console.error('\n❌ Error durante la sincronización:', error);
    logger.error('Manual sync error:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar
manualSync();