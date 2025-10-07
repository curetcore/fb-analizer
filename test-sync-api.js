// Test de sincronización usando la API
const axios = require('axios');

async function testSyncViaAPI() {
  console.log('🚀 Ejecutando sincronización a través de la API...\n');
  
  try {
    // 1. Login para obtener token
    console.log('1️⃣ Obteniendo token de autenticación...');
    const loginResponse = await axios.post('https://api.fbads.curetcore.com/api/auth/login', {
      email: 'admin@curetcore.com',
      password: 'Curetcore2017'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido exitosamente\n');
    
    // 2. Verificar estado actual
    console.log('2️⃣ Verificando estado de sincronización...');
    const statusResponse = await axios.get('https://api.fbads.curetcore.com/api/sync/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Estado actual:', statusResponse.data);
    console.log(`   Token Facebook: ${statusResponse.data.hasAccessToken ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   Cuentas: ${statusResponse.data.accounts.total_accounts}`);
    console.log(`   Campañas: ${statusResponse.data.campaigns.total_campaigns}\n`);
    
    // 3. Ejecutar sincronización
    if (statusResponse.data.hasAccessToken) {
      console.log('3️⃣ Ejecutando sincronización manual...');
      const syncResponse = await axios.post(
        'https://api.fbads.curetcore.com/api/sync/facebook',
        { daysBack: 30 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Sincronización iniciada:', syncResponse.data.message);
      console.log('\nEspera unos segundos y recarga el dashboard para ver los datos actualizados.');
    } else {
      console.log('❌ No se puede sincronizar: Token de Facebook no configurado en el servidor');
      console.log('   Asegúrate de que la variable FACEBOOK_ACCESS_TOKEN esté configurada en Easypanel');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSyncViaAPI();