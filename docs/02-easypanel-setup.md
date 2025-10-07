# Configuración de Easypanel

## Pre-requisitos

- Servidor con Easypanel instalado
- Dominio configurado apuntando al servidor
- Acceso SSH al servidor
- Cuenta de Facebook Developer con App creada

## 1. Configuración de PostgreSQL

### Crear servicio PostgreSQL en Easypanel

1. Ir a Easypanel Dashboard
2. Click en "Create Service"
3. Seleccionar "PostgreSQL" del marketplace
4. Configurar:
   ```
   Service Name: fbads-postgres
   Username: fbadsuser
   Password: [generar contraseña segura]
   Database: fbads
   Version: 15-alpine
   ```
5. Resources:
   ```
   Memory: 2048 MB
   CPU: 1000m
   Storage: 10GB (expandible)
   ```

### Variables de entorno para guardar:
```bash
POSTGRES_HOST=fbads-postgres
POSTGRES_PORT=5432
POSTGRES_USER=fbadsuser
POSTGRES_PASSWORD=[tu-contraseña]
POSTGRES_DB=fbads
```

## 2. Configuración de Redis

### Crear servicio Redis

1. Create Service → Redis
2. Configurar:
   ```
   Service Name: fbads-redis
   Password: [generar contraseña]
   Version: 7-alpine
   ```
3. Resources:
   ```
   Memory: 512 MB
   CPU: 500m
   ```

### Variables de entorno:
```bash
REDIS_HOST=fbads-redis
REDIS_PORT=6379
REDIS_PASSWORD=[tu-contraseña]
REDIS_URL=redis://:[tu-contraseña]@fbads-redis:6379
```

## 3. Deploy del Backend

### Crear servicio App

1. Create Service → App
2. Configurar:
   ```
   Service Name: fbads-backend
   Git Repository: https://github.com/[tu-usuario]/facebook-ads-dashboard
   Branch: main
   Root Directory: /backend
   Build Command: npm ci --only=production
   Start Command: npm start
   Port: 4000
   ```

### Environment Variables:
```bash
# Database
POSTGRES_HOST=fbads-postgres
POSTGRES_PORT=5432
POSTGRES_USER=fbadsuser
POSTGRES_PASSWORD=[contraseña-postgres]
POSTGRES_DB=fbads

# Redis
REDIS_URL=redis://:[contraseña-redis]@fbads-redis:6379

# App
NODE_ENV=production
PORT=4000
JWT_SECRET=[generar-secret-seguro]

# Facebook
FACEBOOK_APP_ID=[tu-app-id]
FACEBOOK_APP_SECRET=[tu-app-secret]
FACEBOOK_ACCESS_TOKEN=[tu-access-token]

# Frontend URL
FRONTEND_URL=https://fbads.tudominio.com
```

### Domains:
```
Domain: api.fbads.tudominio.com
Enable HTTPS: ✓
```

## 4. Deploy del Frontend

### Crear servicio App

1. Create Service → App
2. Configurar:
   ```
   Service Name: fbads-frontend
   Git Repository: https://github.com/[tu-usuario]/facebook-ads-dashboard
   Branch: main
   Root Directory: /frontend
   Build Command: npm ci && npm run build
   Start Command: npm start
   Port: 3000
   ```

### Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://api.fbads.tudominio.com
NODE_ENV=production
```

### Domains:
```
Domain: fbads.tudominio.com
Enable HTTPS: ✓
```

## 5. Configuración de Airbyte

### Opción A: Airbyte Managed (Recomendado para simplicidad)

1. Create Service → App
2. Usar este docker-compose simplificado:

```yaml
# airbyte/docker-compose.yml
version: "3.8"
services:
  airbyte:
    image: airbyte/airbyte:latest
    environment:
      - BASIC_AUTH_USERNAME=admin
      - BASIC_AUTH_PASSWORD=[contraseña-segura]
      - AIRBYTE_VERSION=0.50.0
      - DATABASE_URL=postgresql://fbadsuser:[password]@fbads-postgres:5432/airbyte_db
    ports:
      - "8000:8000"
    volumes:
      - airbyte_data:/data
      - airbyte_db:/config

volumes:
  airbyte_data:
  airbyte_db:
```

### Configurar en Easypanel:
```
Service Name: fbads-airbyte
Memory: 4096 MB
CPU: 2000m
Domain: airbyte.fbads.tudominio.com
```

### Opción B: Usar servicio externo de Airbyte Cloud
- Más simple pero con costo mensual
- No requiere configuración en servidor

## 6. Configuración de GitHub Actions

### Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Easypanel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Easypanel
        run: |
          curl -X POST https://api.easypanel.io/api/v1/deploy \
            -H "Authorization: Bearer ${{ secrets.EASYPANEL_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "service": "fbads-backend",
              "project": "default"
            }'
          
          curl -X POST https://api.easypanel.io/api/v1/deploy \
            -H "Authorization: Bearer ${{ secrets.EASYPANEL_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "service": "fbads-frontend",
              "project": "default"
            }'
```

### Obtener API Key de Easypanel:
1. Ir a Settings → API Keys
2. Create New API Key
3. Añadir a GitHub Secrets

## 7. Configuración inicial de la base de datos

### Conectar por SSH y ejecutar:

```bash
# Conectar al servidor
ssh usuario@tu-servidor.com

# Ejecutar migraciones
docker exec -it fbads-backend npm run migrate

# Crear usuario admin (opcional)
docker exec -it fbads-backend npm run seed:admin
```

## 8. Configurar Airbyte Connection

1. Acceder a https://airbyte.fbads.tudominio.com
2. Login con credenciales configuradas
3. Crear Source:
   - Type: Facebook Marketing
   - Account ID: [tu-account-id]
   - Access Token: [tu-access-token]
   - Start Date: 2024-01-01

4. Crear Destination:
   - Type: Postgres
   - Host: fbads-postgres
   - Port: 5432
   - Database: fbads
   - Schema: raw_facebook

5. Crear Connection:
   - Sync frequency: Every 2 hours
   - Sync mode: Incremental
   - Seleccionar tablas: campaigns, adsets, ads, insights

## 9. Monitoreo y Logs

### Ver logs en Easypanel:
- Click en servicio → Logs tab
- Filtrar por timestamp o buscar errores

### Configurar alertas:
1. Settings → Monitoring
2. Add Alert:
   - Service Down
   - High Memory Usage (>80%)
   - High CPU Usage (>80%)

## 10. Backup y Seguridad

### Backup automático de PostgreSQL:

```yaml
# Añadir a Easypanel como Cron Job
Schedule: 0 2 * * *
Command: |
  docker exec fbads-postgres pg_dump -U fbadsuser fbads | \
  gzip > /backups/fbads-$(date +%Y%m%d).sql.gz
  
  # Mantener solo últimos 7 días
  find /backups -name "fbads-*.sql.gz" -mtime +7 -delete
```

### Seguridad:
1. Habilitar 2FA en Easypanel
2. Configurar firewall para permitir solo puertos necesarios
3. Usar secrets management para tokens sensibles
4. Rotar tokens de Facebook cada 60 días

## Troubleshooting

### Backend no conecta a PostgreSQL:
```bash
# Verificar red interna
docker network ls
docker network inspect easypanel_default
```

### Frontend no carga:
```bash
# Verificar build
docker logs fbads-frontend
# Verificar variables de entorno
docker exec fbads-frontend env | grep NEXT_PUBLIC
```

### Airbyte sync falla:
- Verificar token de Facebook no expirado
- Revisar rate limits de Facebook API
- Aumentar memoria si hay OOM errors

## Scripts útiles

### Health check:
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:4000/health || exit 1
curl -f http://localhost:3000 || exit 1
```

### Restart servicios:
```bash
# restart-all.sh
docker restart fbads-backend
docker restart fbads-frontend
docker restart fbads-redis
```