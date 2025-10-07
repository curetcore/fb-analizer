# Modelo de Datos PostgreSQL

## Diseño de Base de Datos

El modelo está optimizado para consultas analíticas con un balance entre normalización y performance.

## Esquemas

### 1. Schema: `public` (Datos procesados)

```sql
-- Tabla de cuentas de Facebook
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    facebook_account_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_accounts_facebook_id ON accounts(facebook_account_id);
CREATE INDEX idx_accounts_status ON accounts(status);

-- Tabla de campañas
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    facebook_campaign_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    objective VARCHAR(50),
    buying_type VARCHAR(50),
    daily_budget DECIMAL(12,2),
    lifetime_budget DECIMAL(12,2),
    start_time TIMESTAMP WITH TIME ZONE,
    stop_time TIMESTAMP WITH TIME ZONE,
    created_time TIMESTAMP WITH TIME ZONE,
    updated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_campaigns_account ON campaigns(account_id);
CREATE INDEX idx_campaigns_facebook_id ON campaigns(facebook_campaign_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_time, stop_time);

-- Tabla de conjuntos de anuncios
CREATE TABLE ad_sets (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    facebook_adset_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    daily_budget DECIMAL(12,2),
    lifetime_budget DECIMAL(12,2),
    bid_amount DECIMAL(12,2),
    billing_event VARCHAR(50),
    optimization_goal VARCHAR(50),
    targeting JSONB,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_time TIMESTAMP WITH TIME ZONE,
    updated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_adsets_campaign ON ad_sets(campaign_id);
CREATE INDEX idx_adsets_facebook_id ON ad_sets(facebook_adset_id);
CREATE INDEX idx_adsets_status ON ad_sets(status);

-- Tabla de anuncios
CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    ad_set_id INTEGER REFERENCES ad_sets(id) ON DELETE CASCADE,
    facebook_ad_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    creative_id VARCHAR(50),
    created_time TIMESTAMP WITH TIME ZONE,
    updated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_ads_adset ON ads(ad_set_id);
CREATE INDEX idx_ads_facebook_id ON ads(facebook_ad_id);
CREATE INDEX idx_ads_status ON ads(status);

-- Tabla de métricas diarias (particionada por mes)
CREATE TABLE metrics_daily (
    id SERIAL,
    date DATE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    ad_set_id INTEGER REFERENCES ad_sets(id),
    ad_id INTEGER REFERENCES ads(id),
    -- Métricas de alcance
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(10,2) DEFAULT 0,
    -- Métricas de engagement
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    ctr DECIMAL(10,4) DEFAULT 0,
    unique_ctr DECIMAL(10,4) DEFAULT 0,
    -- Métricas de costo
    spend DECIMAL(12,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    cpp DECIMAL(10,2) DEFAULT 0,
    -- Métricas de conversión
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(10,4) DEFAULT 0,
    -- ROAS
    revenue DECIMAL(12,2) DEFAULT 0,
    roas DECIMAL(10,2) DEFAULT 0,
    -- Métricas de video (si aplica)
    video_views INTEGER DEFAULT 0,
    video_p25_watched INTEGER DEFAULT 0,
    video_p50_watched INTEGER DEFAULT 0,
    video_p75_watched INTEGER DEFAULT 0,
    video_p100_watched INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, campaign_id, id)
) PARTITION BY RANGE (date);

-- Crear particiones para los últimos 6 meses y próximos 3 meses
CREATE TABLE metrics_daily_2024_01 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    
CREATE TABLE metrics_daily_2024_02 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... continuar creando particiones según necesidad

-- Índices para métricas
CREATE INDEX idx_metrics_daily_date ON metrics_daily(date);
CREATE INDEX idx_metrics_daily_campaign ON metrics_daily(campaign_id);
CREATE INDEX idx_metrics_daily_account_date ON metrics_daily(account_id, date);
CREATE INDEX idx_metrics_daily_spend ON metrics_daily(spend) WHERE spend > 0;

-- Tabla de métricas por hora (últimos 7 días)
CREATE TABLE metrics_hourly (
    id SERIAL PRIMARY KEY,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(12,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_metrics_hourly_datetime ON metrics_hourly(datetime);
CREATE INDEX idx_metrics_hourly_campaign ON metrics_hourly(campaign_id, datetime);

-- Tabla para alertas configuradas
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'high_cpc', 'low_roas', 'budget_pace', etc
    enabled BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL,
    notification_channels JSONB, -- email, slack, webhook
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de alertas disparadas
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metric_value DECIMAL(12,2),
    threshold_value DECIMAL(12,2),
    details JSONB,
    notification_sent BOOLEAN DEFAULT false
);

-- Tabla para reportes programados
CREATE TABLE scheduled_reports (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly'
    recipients TEXT[], -- array de emails
    filters JSONB,
    format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios del sistema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
    account_ids INTEGER[], -- array de cuentas permitidas
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sesiones de usuario
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Schema: `raw_facebook` (Datos crudos de Airbyte)

```sql
CREATE SCHEMA IF NOT EXISTS raw_facebook;

-- Tablas creadas automáticamente por Airbyte
-- Ejemplos:
-- raw_facebook._airbyte_raw_campaigns
-- raw_facebook._airbyte_raw_adsets
-- raw_facebook._airbyte_raw_ads
-- raw_facebook._airbyte_raw_insights
```

## Vistas Materializadas para Performance

```sql
-- Vista para dashboard principal
CREATE MATERIALIZED VIEW mv_dashboard_summary AS
SELECT 
    a.id as account_id,
    a.name as account_name,
    DATE(m.date) as date,
    COUNT(DISTINCT m.campaign_id) as active_campaigns,
    SUM(m.impressions) as total_impressions,
    SUM(m.clicks) as total_clicks,
    SUM(m.spend) as total_spend,
    SUM(m.conversions) as total_conversions,
    SUM(m.revenue) as total_revenue,
    CASE 
        WHEN SUM(m.impressions) > 0 
        THEN (SUM(m.clicks)::DECIMAL / SUM(m.impressions)) * 100 
        ELSE 0 
    END as overall_ctr,
    CASE 
        WHEN SUM(m.clicks) > 0 
        THEN SUM(m.spend) / SUM(m.clicks) 
        ELSE 0 
    END as overall_cpc,
    CASE 
        WHEN SUM(m.spend) > 0 
        THEN SUM(m.revenue) / SUM(m.spend) 
        ELSE 0 
    END as overall_roas
FROM accounts a
JOIN metrics_daily m ON a.id = m.account_id
WHERE m.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.name, DATE(m.date)
WITH DATA;

-- Refrescar cada hora
CREATE INDEX idx_mv_dashboard_summary ON mv_dashboard_summary(account_id, date);

-- Vista para comparación de campañas
CREATE MATERIALIZED VIEW mv_campaign_comparison AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status,
    c.objective,
    SUM(m.impressions) as total_impressions,
    SUM(m.clicks) as total_clicks,
    SUM(m.spend) as total_spend,
    SUM(m.conversions) as total_conversions,
    AVG(m.ctr) as avg_ctr,
    AVG(m.cpc) as avg_cpc,
    AVG(m.roas) as avg_roas,
    COUNT(DISTINCT m.date) as days_active
FROM campaigns c
LEFT JOIN metrics_daily m ON c.id = m.campaign_id
WHERE m.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.name, c.status, c.objective
WITH DATA;

CREATE INDEX idx_mv_campaign_comparison ON mv_campaign_comparison(campaign_id);
```

## Funciones y Triggers

```sql
-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas principales
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular métricas derivadas
CREATE OR REPLACE FUNCTION calculate_derived_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions) * 100;
    END IF;
    
    -- Calcular CPC
    IF NEW.clicks > 0 THEN
        NEW.cpc = NEW.spend / NEW.clicks;
    END IF;
    
    -- Calcular CPM
    IF NEW.impressions > 0 THEN
        NEW.cpm = (NEW.spend / NEW.impressions) * 1000;
    END IF;
    
    -- Calcular ROAS
    IF NEW.spend > 0 THEN
        NEW.roas = NEW.revenue / NEW.spend;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_metrics_before_insert 
    BEFORE INSERT ON metrics_daily
    FOR EACH ROW EXECUTE FUNCTION calculate_derived_metrics();
```

## Procedimientos de Mantenimiento

```sql
-- Procedimiento para limpiar datos antiguos
CREATE OR REPLACE PROCEDURE cleanup_old_data()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Eliminar métricas por hora más antiguas de 7 días
    DELETE FROM metrics_hourly WHERE datetime < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Eliminar histórico de alertas más antiguo de 90 días
    DELETE FROM alert_history WHERE triggered_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Eliminar sesiones expiradas
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Refrescar vistas materializadas
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_comparison;
END;
$$;

-- Programar para ejecutar diariamente
```

## Queries de Ejemplo

### Dashboard Principal
```sql
-- KPIs del día actual
SELECT 
    SUM(impressions) as impressions_today,
    SUM(clicks) as clicks_today,
    SUM(spend) as spend_today,
    SUM(conversions) as conversions_today,
    AVG(ctr) as avg_ctr_today,
    AVG(roas) as avg_roas_today
FROM metrics_daily
WHERE date = CURRENT_DATE
AND account_id = $1;

-- Tendencia últimos 30 días
SELECT 
    date,
    SUM(spend) as daily_spend,
    SUM(revenue) as daily_revenue,
    SUM(conversions) as daily_conversions
FROM metrics_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
AND account_id = $1
GROUP BY date
ORDER BY date;
```

### Análisis de Campañas
```sql
-- Top 10 campañas por ROAS
SELECT 
    c.name,
    SUM(m.spend) as total_spend,
    SUM(m.revenue) as total_revenue,
    SUM(m.revenue) / NULLIF(SUM(m.spend), 0) as roas
FROM campaigns c
JOIN metrics_daily m ON c.id = m.campaign_id
WHERE m.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.name
ORDER BY roas DESC
LIMIT 10;
```

## Migración de Datos

### Script inicial de migración
```sql
-- database/migrations/001_initial_schema.sql
BEGIN;

-- Crear todas las tablas
-- ... (incluir todo el esquema anterior)

COMMIT;
```

### Sincronización con Airbyte
```sql
-- Procedimiento para copiar datos de raw a procesados
CREATE OR REPLACE PROCEDURE sync_from_airbyte()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sincronizar campañas
    INSERT INTO campaigns (facebook_campaign_id, account_id, name, status, objective)
    SELECT 
        data->>'id',
        (SELECT id FROM accounts WHERE facebook_account_id = data->>'account_id'),
        data->>'name',
        data->>'status',
        data->>'objective'
    FROM raw_facebook._airbyte_raw_campaigns
    WHERE _airbyte_emitted_at > (
        SELECT COALESCE(MAX(updated_at), '1970-01-01') 
        FROM campaigns
    )
    ON CONFLICT (facebook_campaign_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;
```