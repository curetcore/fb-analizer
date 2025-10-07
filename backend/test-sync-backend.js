// Script para probar sincronización desde el backend
require('dotenv').config();
const facebookSync = require('./src/services/facebookSync');
const { query } = require('./src/config/database');

async function testBackendSync() {
  console.log('🚀 Probando sincronización desde el backend...\n');
  
  // Verificar token
  console.log('Token configurado:', !!process.env.FACEBOOK_ACCESS_TOKEN);
  console.log('Primeros 20 caracteres:', process.env.FACEBOOK_ACCESS_TOKEN?.substring(0, 20) + '...');
  
  try {
    // Verificar conexión a base de datos
    console.log('\n📊 Verificando conexión a PostgreSQL...');
    const dbTest = await query('SELECT NOW() as time');
    console.log('✅ PostgreSQL conectado:', dbTest.rows[0].time);
    
    // Sincronizar cuentas
    console.log('\n🔄 Sincronizando cuentas de Facebook...');
    await facebookSync.syncAccounts();
    
    // Verificar cuentas guardadas
    const accounts = await query('SELECT * FROM accounts');
    console.log(`\n✅ ${accounts.rows.length} cuentas sincronizadas:`);
    accounts.rows.forEach(acc => {
      console.log(`   - ${acc.name} (ID: ${acc.id}, Facebook ID: ${acc.facebook_id})`);
    });
    
    // Sincronizar campañas de la primera cuenta
    if (accounts.rows.length > 0) {
      console.log(`\n🔄 Sincronizando campañas de ${accounts.rows[0].name}...`);
      await facebookSync.syncCampaigns(accounts.rows[0].id, accounts.rows[0].facebook_id);
      
      const campaigns = await query('SELECT * FROM campaigns WHERE account_id = $1', [accounts.rows[0].id]);
      console.log(`✅ ${campaigns.rows.length} campañas sincronizadas`);
      
      // Sincronizar métricas de los últimos 7 días
      if (campaigns.rows.length > 0) {
        console.log('\n🔄 Sincronizando métricas de los últimos 7 días...');
        await facebookSync.syncDailyMetrics(accounts.rows[0].id, accounts.rows[0].facebook_id, 7);
        
        const metrics = await query(`
          SELECT COUNT(*) as total, 
                 MIN(date) as min_date, 
                 MAX(date) as max_date 
          FROM metrics_daily 
          WHERE account_id = $1
        `, [accounts.rows[0].id]);
        
        console.log(`✅ ${metrics.rows[0].total} registros de métricas sincronizados`);
        console.log(`   Desde: ${metrics.rows[0].min_date}`);
        console.log(`   Hasta: ${metrics.rows[0].max_date}`);
      }
    }
    
    console.log('\n🎉 Sincronización completada exitosamente!');
    console.log('Los datos ya deberían estar visibles en el dashboard.');
    
  } catch (error) {
    console.error('\n❌ Error durante la sincronización:', error);
    console.error('Detalles:', error.response?.data || error.message);
  } finally {
    process.exit();
  }
}

testBackendSync();