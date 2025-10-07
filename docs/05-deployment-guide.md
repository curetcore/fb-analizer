# Guía Completa de Deployment

## 📋 Pre-requisitos

1. **Servidor con Easypanel instalado**
2. **Cuenta de Facebook Developer** con:
   - App creada
   - Permisos de Marketing API
   - Token de acceso de larga duración
3. **Dominio configurado** apuntando a tu servidor
4. **GitHub** para el repositorio

## 🚀 Pasos de Deployment

### 1. Preparar el Código

```bash
# En tu máquina local
cd ~/Desktop/facebook-ads-dashboard

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit: Facebook Ads Dashboard"

# Crear repositorio en GitHub (via web o CLI)
# Luego conectar:
git remote add origin https://github.com/TU_USUARIO/facebook-ads-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Configurar PostgreSQL en Easypanel

1. **Crear servicio PostgreSQL:**
   ```
   Service Name: fbads-postgres
   Username: fbadsuser
   Password: [generar contraseña segura]
   Database: fbads
   Memory: 2048 MB
   Storage: 10GB
   ```

2. **Guardar credenciales** para usar después

### 3. Configurar Redis en Easypanel

1. **Crear servicio Redis:**
   ```
   Service Name: fbads-redis
   Password: [generar contraseña]
   Memory: 512 MB
   ```

### 4. Deploy del Backend

1. **Crear App en Easypanel:**
   ```
   Service Name: fbads-backend
   Source: GitHub
   Repository: https://github.com/TU_USUARIO/facebook-ads-dashboard
   Branch: main
   Root Directory: /backend
   ```

2. **Build Configuration:**
   ```
   Build Command: npm ci --only=production
   Start Command: npm start
   Port: 4000
   ```

3. **Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=4000
   
   # Database
   POSTGRES_HOST=fbads-postgres
   POSTGRES_PORT=5432
   POSTGRES_USER=fbadsuser
   POSTGRES_PASSWORD=[tu-contraseña-postgres]
   POSTGRES_DB=fbads
   
   # Redis
   REDIS_URL=redis://:[tu-contraseña-redis]@fbads-redis:6379
   
   # JWT
   JWT_SECRET=[generar-con-openssl-rand-base64-32]
   JWT_EXPIRES_IN=7d
   
   # Facebook
   FACEBOOK_APP_ID=[tu-app-id]
   FACEBOOK_APP_SECRET=[tu-app-secret]
   FACEBOOK_ACCESS_TOKEN=[tu-token]
   
   # URLs
   FRONTEND_URL=https://fbads.tudominio.com
   ```

4. **Domain:**
   ```
   Domain: api.fbads.tudominio.com
   Enable HTTPS: ✓
   ```

### 5. Deploy del Frontend

1. **Crear App en Easypanel:**
   ```
   Service Name: fbads-frontend
   Source: GitHub
   Repository: https://github.com/TU_USUARIO/facebook-ads-dashboard
   Branch: main
   Root Directory: /frontend
   ```

2. **Build Configuration:**
   ```
   Build Command: npm ci && npm run build
   Start Command: npm start
   Port: 3000
   ```

3. **Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://api.fbads.tudominio.com
   ```

4. **Domain:**
   ```
   Domain: fbads.tudominio.com
   Enable HTTPS: ✓
   ```

### 6. Inicializar Base de Datos

1. **Conectar por SSH al servidor:**
   ```bash
   ssh usuario@tu-servidor.com
   ```

2. **Ejecutar scripts SQL:**
   ```bash
   # Entrar al contenedor de PostgreSQL
   docker exec -it fbads-postgres psql -U fbadsuser -d fbads
   
   # Ejecutar los scripts en orden:
   # 1. Schema
   # 2. Procedures
   # 3. Seed data (opcional)
   ```

   O usar este comando directo:
   ```bash
   docker exec -i fbads-postgres psql -U fbadsuser -d fbads < /path/to/01-schema.sql
   docker exec -i fbads-postgres psql -U fbadsuser -d fbads < /path/to/02-procedures.sql
   docker exec -i fbads-postgres psql -U fbadsuser -d fbads < /path/to/03-seed-data.sql
   ```

### 7. Configurar Airbyte

#### Opción A: Airbyte en Easypanel (Recomendado)

1. **Crear archivo** `airbyte-easypanel.yml` en el repo:
   ```yaml
   version: "3.8"
   services:
     airbyte:
       image: airbyte/airbyte:latest
       environment:
         - BASIC_AUTH_USERNAME=admin
         - BASIC_AUTH_PASSWORD=[contraseña-segura]
         - DATABASE_URL=postgresql://fbadsuser:[password]@fbads-postgres:5432/airbyte_db
       ports:
         - "8000:8000"
       volumes:
         - airbyte_data:/data
   ```

2. **Deploy como Stack en Easypanel**

3. **Configurar Connection:**
   - Source: Facebook Marketing
   - Destination: PostgreSQL (fbads-postgres)
   - Sync cada 2 horas

#### Opción B: Sync Manual (Alternativa)

Si prefieres no usar Airbyte, el backend incluye un servicio de sincronización que se ejecuta cada 2 horas automáticamente.

### 8. Verificación Post-Deploy

1. **Test del Backend:**
   ```bash
   curl https://api.fbads.tudominio.com/health
   ```

2. **Test del Frontend:**
   - Navegar a https://fbads.tudominio.com
   - Debería redirigir al login

3. **Crear usuario inicial:**
   - Usar el endpoint de registro
   - O ejecutar el seed data que incluye usuarios demo

### 9. Configurar Monitoreo

1. **En Easypanel:**
   - Habilitar alertas para cada servicio
   - Configurar notificaciones por email/Discord

2. **Logs:**
   - Backend logs: Easypanel → fbads-backend → Logs
   - Frontend logs: Easypanel → fbads-frontend → Logs

## 🔧 Mantenimiento

### Actualizar la aplicación

```bash
# En local
git add .
git commit -m "Update: descripción"
git push origin main

# Easypanel detectará el cambio y re-deployará automáticamente
```

### Backup de Base de Datos

Crear un Cron Job en Easypanel:
```bash
Schedule: 0 2 * * *
Command: |
  docker exec fbads-postgres pg_dump -U fbadsuser fbads | \
  gzip > /backups/fbads-$(date +%Y%m%d).sql.gz
```

### Rotar Token de Facebook

1. Generar nuevo token en Facebook Developer
2. Actualizar en Easypanel:
   - fbads-backend → Environment → FACEBOOK_ACCESS_TOKEN
3. Restart el servicio

## 🐛 Troubleshooting

### Error: "Cannot connect to PostgreSQL"
- Verificar que fbads-postgres esté running
- Verificar credenciales en environment variables
- Check network connectivity entre servicios

### Error: "Facebook API rate limit"
- Reducir frecuencia de sync en Airbyte
- Verificar que no hay múltiples instancias sincronizando

### Frontend muestra "Error al cargar métricas"
- Verificar que el backend está accesible
- Check CORS configuration
- Verificar token JWT válido

### Airbyte no sincroniza datos
- Verificar token de Facebook válido
- Check permisos de la app en Facebook
- Revisar logs de Airbyte

## 📊 Métricas de Performance

### Recomendaciones:
- **PostgreSQL**: 2GB RAM mínimo
- **Redis**: 512MB RAM
- **Backend**: 1GB RAM
- **Frontend**: 512MB RAM
- **Airbyte**: 4GB RAM

### Optimizaciones:
1. Habilitar cache agresivo en Redis
2. Crear índices adicionales según uso
3. Configurar CDN para assets del frontend
4. Habilitar compresión gzip en Nginx

## 🔐 Seguridad

### Checklist:
- [ ] HTTPS habilitado en todos los dominios
- [ ] Variables de entorno seguras (no hardcoded)
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] 2FA habilitado en Easypanel
- [ ] Backup automático configurado
- [ ] Logs de acceso monitoreados
- [ ] Rate limiting activo
- [ ] Tokens rotados regularmente

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en Easypanel
2. Verificar status de servicios
3. Consultar documentación de errores comunes
4. Contactar soporte de Easypanel si es problema de infraestructura