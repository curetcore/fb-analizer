-- Facebook Ads Dashboard Database Schema
-- Version: 1.0.0

-- Create database if not exists (run as superuser)
-- CREATE DATABASE fbads;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS metrics_hourly CASCADE;
DROP TABLE IF EXISTS metrics_daily CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS ad_sets CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Create tables
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

-- Partitioned table for daily metrics
CREATE TABLE metrics_daily (
    id SERIAL,
    date DATE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    ad_set_id INTEGER REFERENCES ad_sets(id),
    ad_id INTEGER REFERENCES ads(id),
    -- Metrics
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(10,2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    ctr DECIMAL(10,4) DEFAULT 0,
    unique_ctr DECIMAL(10,4) DEFAULT 0,
    spend DECIMAL(12,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    cpp DECIMAL(10,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(10,4) DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    roas DECIMAL(10,2) DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    video_p25_watched INTEGER DEFAULT 0,
    video_p50_watched INTEGER DEFAULT 0,
    video_p75_watched INTEGER DEFAULT 0,
    video_p100_watched INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, campaign_id, id)
) PARTITION BY RANGE (date);

-- Create partitions for the last 3 months and next 3 months
CREATE TABLE metrics_daily_2024_01 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE metrics_daily_2024_02 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE metrics_daily_2024_03 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE metrics_daily_2024_04 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE metrics_daily_2024_05 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE metrics_daily_2024_06 PARTITION OF metrics_daily
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

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

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    account_ids INTEGER[],
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL,
    notification_channels JSONB,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metric_value DECIMAL(12,2),
    threshold_value DECIMAL(12,2),
    details JSONB,
    notification_sent BOOLEAN DEFAULT false
);

CREATE TABLE scheduled_reports (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50),
    recipients TEXT[],
    filters JSONB,
    format VARCHAR(20) DEFAULT 'pdf',
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_accounts_facebook_id ON accounts(facebook_account_id);
CREATE INDEX idx_accounts_status ON accounts(status);

CREATE INDEX idx_campaigns_account ON campaigns(account_id);
CREATE INDEX idx_campaigns_facebook_id ON campaigns(facebook_campaign_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_time, stop_time);

CREATE INDEX idx_adsets_campaign ON ad_sets(campaign_id);
CREATE INDEX idx_adsets_facebook_id ON ad_sets(facebook_adset_id);
CREATE INDEX idx_adsets_status ON ad_sets(status);

CREATE INDEX idx_ads_adset ON ads(ad_set_id);
CREATE INDEX idx_ads_facebook_id ON ads(facebook_ad_id);
CREATE INDEX idx_ads_status ON ads(status);

CREATE INDEX idx_metrics_daily_date ON metrics_daily(date);
CREATE INDEX idx_metrics_daily_campaign ON metrics_daily(campaign_id);
CREATE INDEX idx_metrics_daily_account_date ON metrics_daily(account_id, date);
CREATE INDEX idx_metrics_daily_spend ON metrics_daily(spend) WHERE spend > 0;

CREATE INDEX idx_metrics_hourly_datetime ON metrics_hourly(datetime);
CREATE INDEX idx_metrics_hourly_campaign ON metrics_hourly(campaign_id, datetime);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Create functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate derived metrics
CREATE OR REPLACE FUNCTION calculate_derived_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions) * 100;
    END IF;
    
    -- Calculate CPC
    IF NEW.clicks > 0 THEN
        NEW.cpc = NEW.spend / NEW.clicks;
    END IF;
    
    -- Calculate CPM
    IF NEW.impressions > 0 THEN
        NEW.cpm = (NEW.spend / NEW.impressions) * 1000;
    END IF;
    
    -- Calculate ROAS
    IF NEW.spend > 0 THEN
        NEW.roas = NEW.revenue / NEW.spend;
    END IF;
    
    -- Calculate conversion rate
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions::DECIMAL / NEW.clicks) * 100;
    END IF;
    
    -- Calculate cost per conversion
    IF NEW.conversions > 0 THEN
        NEW.cost_per_conversion = NEW.spend / NEW.conversions;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_metrics_before_insert 
    BEFORE INSERT ON metrics_daily
    FOR EACH ROW EXECUTE FUNCTION calculate_derived_metrics();

CREATE TRIGGER calculate_metrics_before_update 
    BEFORE UPDATE ON metrics_daily
    FOR EACH ROW EXECUTE FUNCTION calculate_derived_metrics();

-- Create materialized views
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

CREATE INDEX idx_mv_dashboard_summary ON mv_dashboard_summary(account_id, date);

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

-- Grant permissions (adjust as needed)
-- GRANT USAGE ON SCHEMA public TO fbads_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fbads_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fbads_user;