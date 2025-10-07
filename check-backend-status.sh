#!/bin/bash

echo "🔍 Verificando estado del backend..."
echo ""

# 1. Health check
echo "1️⃣ Health check:"
curl -s https://api.fbads.curetcore.com/health | jq '.'
echo ""

# 2. Login y obtener token
echo "2️⃣ Intentando login con usuario de prueba:"
TOKEN=$(curl -s -X POST "https://api.fbads.curetcore.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curetcore.com","password":"Curetcore2017"}' | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener token de autenticación"
  echo "   Creando usuario admin..."
  
  # Intentar crear usuario
  curl -X POST "https://api.fbads.curetcore.com/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@curetcore.com",
      "password": "Curetcore2017",
      "name": "Admin"
    }'
  echo ""
  
  # Intentar login de nuevo
  TOKEN=$(curl -s -X POST "https://api.fbads.curetcore.com/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@curetcore.com","password":"Curetcore2017"}' | jq -r '.token // empty')
fi

if [ -n "$TOKEN" ]; then
  echo "✅ Token obtenido exitosamente"
  echo ""
  
  # 3. Verificar estado de sincronización
  echo "3️⃣ Estado de sincronización:"
  curl -s "https://api.fbads.curetcore.com/api/sync/status" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
  
  # 4. Listar cuentas
  echo "4️⃣ Cuentas disponibles:"
  curl -s "https://api.fbads.curetcore.com/api/accounts" \
    -H "Authorization: Bearer $TOKEN" | jq '.accounts[] | {id, name, status}'
  echo ""
  
  # 5. Ejecutar sincronización manual
  echo "5️⃣ Ejecutando sincronización manual..."
  SYNC_RESPONSE=$(curl -s -X POST "https://api.fbads.curetcore.com/api/sync/facebook" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"daysBack": 30}')
  echo "$SYNC_RESPONSE" | jq '.'
  
else
  echo "❌ No se pudo autenticar. Verifica las credenciales."
fi

echo ""
echo "✅ Verificación completada"