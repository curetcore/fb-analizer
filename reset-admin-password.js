// Script para resetear contraseña del admin
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Curetcore2017';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL para actualizar:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@curetcore.com';`);
}

generateHash();