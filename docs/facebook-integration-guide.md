# Guía de Integración con Facebook Ads

## Resumen del Proceso

Para conectar datos reales de Facebook Ads necesitas:

1. **Facebook App y Tokens** → 2. **Airbyte** → 3. **PostgreSQL** → 4. **Dashboard**

## Paso 1: Configurar Facebook App

### 1.1 Crear una App en Facebook Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Crea una nueva app tipo "Business"
3. Añade el producto "Marketing API"
4. Guarda:
   - App ID
   - App Secret

### 1.2 Obtener Access Token

1. En Facebook Business Manager, ve a "Configuración del negocio"
2. En "Cuentas" → "Cuentas publicitarias", selecciona las cuentas que quieres sincronizar
3. Genera un token de acceso con estos permisos:
   - `ads_read`
   - `ads_management`
   - `business_management`

### 1.3 Obtener Ad Account IDs

En Business Manager, cada cuenta publicitaria tiene un ID como: `act_123456789`

## Paso 2: Configurar Airbyte

### 2.1 Instalar Airbyte en tu servidor

```bash
# Opción 1: Docker Compose (recomendado para Easypanel)
mkdir airbyte && cd airbyte
wget https://raw.githubusercontent.com/airbytehq/airbyte/master/docker-compose.yaml
docker-compose up -d
```

### 2.2 Configurar Source (Facebook Marketing)

1. Accede a Airbyte UI (puerto 8000)
2. Crea un nuevo Source → "Facebook Marketing"
3. Configura:
   ```
   Account ID: act_123456789
   Access Token: [tu-token-largo]
   Start Date: 2024-01-01
   ```

### 2.3 Configurar Destination (PostgreSQL)

1. Crea un nuevo Destination → "PostgreSQL"
2. Configura con los datos de tu PostgreSQL:
   ```
   Host: postgresql
   Port: 5432
   Database: fbads
   Username: postgres
   Password: Curetcore2017
   Schema: airbyte_facebook
   ```

### 2.4 Crear Connection

1. Conecta Source → Destination
2. Configura sync:
   - Frequency: Every hour (o lo que prefieras)
   - Sync mode: Incremental
3. Selecciona estas tablas:
   - `ads_insights` (métricas diarias)
   - `ads_insights_hourly` (métricas por hora)
   - `campaigns`
   - `adsets`
   - `ads`
   - `ad_accounts`

## Paso 3: Mapear datos de Airbyte a nuestro esquema

Airbyte creará tablas con prefijo `airbyte_facebook_`. Necesitamos un proceso ETL para copiar estos datos a nuestras tablas:

### 3.1 Crear función de sincronización

```sql
-- Crear función para sincronizar datos
CREATE OR REPLACE FUNCTION sync_facebook_data() RETURNS void AS $$
BEGIN
    -- Sincronizar cuentas
    INSERT INTO accounts (facebook_id, name, currency, timezone)
    SELECT 
        account_id::text,
        account_name,
        currency,
        timezone_name
    FROM airbyte_facebook.ad_accounts
    ON CONFLICT (facebook_id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        currency = EXCLUDED.currency,
        updated_at = NOW();

    -- Sincronizar campañas
    INSERT INTO campaigns (facebook_id, account_id, name, status, objective)
    SELECT 
        c.campaign_id::text,
        a.id,
        c.campaign_name,
        c.status,
        c.objective
    FROM airbyte_facebook.campaigns c
    JOIN accounts a ON a.facebook_id = c.account_id::text
    ON CONFLICT (facebook_id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- Sincronizar métricas diarias
    INSERT INTO metrics_daily (
        date, campaign_id, impressions, clicks, spend, 
        conversions, revenue, ctr, cpc, roas
    )
    SELECT 
        i.date_start::date,
        c.id,
        i.impressions::integer,
        i.clicks::integer,
        i.spend::decimal,
        COALESCE(i.actions_offsite_conversion_fb_pixel_purchase::integer, 0),
        COALESCE(i.action_values_offsite_conversion_fb_pixel_purchase::decimal, 0),
        CASE WHEN i.impressions > 0 
            THEN (i.clicks::float / i.impressions * 100)
            ELSE 0 
        END,
        CASE WHEN i.clicks > 0 
            THEN (i.spend::float / i.clicks)
            ELSE 0 
        END,
        CASE WHEN i.spend > 0 
            THEN (COALESCE(i.action_values_offsite_conversion_fb_pixel_purchase, 0)::float / i.spend)
            ELSE 0 
        END
    FROM airbyte_facebook.ads_insights i
    JOIN campaigns c ON c.facebook_id = i.campaign_id::text
    ON CONFLICT (date, campaign_id) 
    DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        spend = EXCLUDED.spend,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Crear job para ejecutar cada hora
SELECT cron.schedule(
    'sync-facebook-data',
    '0 * * * *',  -- cada hora
    'SELECT sync_facebook_data();'
);
```

## Paso 4: Configurar variables de entorno

En Easypanel, añade estas variables al backend:

```bash
# Facebook API (para futuras features)
FACEBOOK_APP_ID=tu_app_id
FACEBOOK_APP_SECRET=tu_app_secret
FACEBOOK_ACCESS_TOKEN=tu_access_token

# Airbyte (si quieres monitorear el sync)
AIRBYTE_API_URL=http://airbyte:8001
```

## Paso 5: Verificar la integración

1. **Verifica que Airbyte esté sincronizando:**
   ```sql
   -- Ver últimos datos sincronizados
   SELECT MAX(_airbyte_emitted_at) 
   FROM airbyte_facebook.ads_insights;
   ```

2. **Ejecuta la sincronización manual:**
   ```sql
   SELECT sync_facebook_data();
   ```

3. **Verifica tus tablas:**
   ```sql
   SELECT COUNT(*) FROM campaigns;
   SELECT COUNT(*) FROM metrics_daily;
   ```

## Alternativa: Sin Airbyte (Directa)

Si prefieres no usar Airbyte, puedes crear un servicio que llame directamente a la API de Facebook:

```javascript
// backend/src/services/facebookSync.js
const axios = require('axios');

async function syncFacebookData() {
  const insights = await axios.get(
    `https://graph.facebook.com/v18.0/act_${ACCOUNT_ID}/insights`,
    {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'impressions,clicks,spend,actions,action_values',
        time_range: { since: '2024-01-01', until: 'today' },
        level: 'campaign',
        time_increment: 1
      }
    }
  );
  
  // Procesar y guardar en PostgreSQL
  for (const metric of insights.data) {
    await saveMetricToDatabase(metric);
  }
}
```

## Notas importantes:

1. **Límites de API**: Facebook tiene límites de rate. Airbyte maneja esto automáticamente.
2. **Costos**: Airbyte Open Source es gratis, pero necesita recursos del servidor.
3. **Historial**: La primera sincronización puede tardar si tienes mucho historial.
4. **Permisos**: Necesitas ser admin de las cuentas publicitarias.

## Próximos pasos:

1. ¿Tienes ya una cuenta de Facebook Business Manager con campañas activas?
2. ¿Prefieres usar Airbyte o hacer la integración directa?
3. ¿Necesitas ayuda con algún paso específico?