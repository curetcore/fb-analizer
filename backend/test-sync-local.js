// Test local de sincronización con Facebook
const axios = require('axios');

const TOKEN = 'EAAQGqO8VHA8BPomgZAd1u10kt4riPDDbFq558ZBBXxpsmyZCRPgzHygRufE4M3stsTUpWcCZAA0UvJyd8oF3M5eeBaWNO6evUcSuPd2qZBexlvogVUD2b8iOGH6W4RDuJMb8ZC5RoBYGbR7JNhSwTEk47pjLKqUQNZASYlo21YVhKJiMt2uFDWksyiq0ne6OrAwauQe';

async function testSync() {
  console.log('🚀 Probando sincronización con Facebook...\n');

  try {
    // 1. Obtener cuentas
    console.log('1️⃣ Obteniendo cuentas publicitarias...');
    const accountsResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: TOKEN,
        fields: 'id,name,currency,account_status,amount_spent'
      }
    });

    const accounts = accountsResponse.data.data;
    console.log(`✅ ${accounts.length} cuentas encontradas:\n`);

    for (const account of accounts) {
      console.log(`   📊 ${account.name} (${account.id})`);
      console.log(`      Moneda: ${account.currency}`);
      console.log(`      Gastado total: ${account.amount_spent / 100} ${account.currency}\n`);

      // 2. Obtener campañas de la cuenta
      try {
        const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${account.id}/campaigns`, {
          params: {
            access_token: TOKEN,
            fields: 'id,name,status,objective,daily_budget,lifetime_budget',
            limit: 5
          }
        });

        const campaigns = campaignsResponse.data.data;
        if (campaigns.length > 0) {
          console.log(`      📈 Top ${campaigns.length} campañas:`);
          campaigns.forEach(camp => {
            console.log(`         - ${camp.name} (${camp.status})`);
          });
        } else {
          console.log(`      ⚠️  No hay campañas en esta cuenta`);
        }

        // 3. Obtener métricas de los últimos 7 días
        const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${account.id}/insights`, {
          params: {
            access_token: TOKEN,
            date_preset: 'last_7d',
            fields: 'impressions,clicks,spend,conversions,purchase_roas',
            level: 'account'
          }
        });

        const insights = insightsResponse.data.data;
        if (insights.length > 0) {
          const metrics = insights[0];
          console.log(`\n      📊 Métricas últimos 7 días:`);
          console.log(`         Impresiones: ${parseInt(metrics.impressions || 0).toLocaleString()}`);
          console.log(`         Clics: ${parseInt(metrics.clicks || 0).toLocaleString()}`);
          console.log(`         Gasto: ${(parseFloat(metrics.spend || 0)).toFixed(2)} ${account.currency}`);
        }

      } catch (error) {
        console.log(`      ❌ Error obteniendo datos de ${account.name}: ${error.response?.data?.error?.message || error.message}`);
      }

      console.log('\n' + '─'.repeat(50) + '\n');
    }

    console.log('✅ Prueba completada exitosamente!');
    console.log('\n💡 Cuando el backend esté funcionando, estos datos aparecerán en tu dashboard.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error?.message || error.message);
  }
}

testSync();