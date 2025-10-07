require('dotenv').config();
const axios = require('axios');

async function testFacebookToken() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN || 'EAAQGqO8VHA8BPomgZAd1u10kt4riPDDbFq558ZBBXxpsmyZCRPgzHygRufE4M3stsTUpWcCZAA0UvJyd8oF3M5eeBaWNO6evUcSuPd2qZBexlvogVUD2b8iOGH6W4RDuJMb8ZC5RoBYGbR7JNhSwTEk47pjLKqUQNZASYlo21YVhKJiMt2uFDWksyiq0ne6OrAwauQe';
  
  if (!token) {
    console.error('❌ FACEBOOK_ACCESS_TOKEN no está configurado en las variables de entorno');
    return;
  }

  console.log('✅ Token encontrado:', token.substring(0, 20) + '...');
  
  try {
    // Probar el token con la API de Facebook
    const response = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: token,
        fields: 'id,name,currency,account_status'
      }
    });

    console.log('✅ Token válido! Cuentas encontradas:');
    console.log(`   Total de cuentas: ${response.data.data.length}`);
    
    response.data.data.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.name} (${account.id})`);
    });

  } catch (error) {
    console.error('❌ Error al verificar el token:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error?.message || error.response.data);
    } else {
      console.error('   ', error.message);
    }
  }
}

testFacebookToken();