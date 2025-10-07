-- Stored procedures for Facebook Ads Dashboard
-- Version: 1.0.0

-- Procedure to cleanup old data
CREATE OR REPLACE PROCEDURE cleanup_old_data()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete hourly metrics older than 7 days
    DELETE FROM metrics_hourly WHERE datetime < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Delete alert history older than 90 days
    DELETE FROM alert_history WHERE triggered_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Delete expired user sessions
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Log cleanup
    RAISE NOTICE 'Data cleanup completed at %', CURRENT_TIMESTAMP;
END;
$$;

-- Procedure to refresh materialized views
CREATE OR REPLACE PROCEDURE refresh_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh dashboard summary
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary;
    
    -- Refresh campaign comparison
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_comparison;
    
    RAISE NOTICE 'Materialized views refreshed at %', CURRENT_TIMESTAMP;
END;
$$;

-- Procedure to sync data from Airbyte raw tables
CREATE OR REPLACE PROCEDURE sync_from_airbyte()
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if raw_facebook schema exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'raw_facebook') THEN
        RAISE NOTICE 'raw_facebook schema not found. Skipping sync.';
        RETURN;
    END IF;
    
    -- Sync accounts
    INSERT INTO accounts (facebook_account_id, name, currency, timezone, status)
    SELECT 
        data->>'account_id',
        data->>'name',
        COALESCE(data->>'currency', 'USD'),
        COALESCE(data->>'timezone_name', 'UTC'),
        data->>'account_status'
    FROM raw_facebook._airbyte_raw_accounts
    WHERE _airbyte_emitted_at > (
        SELECT COALESCE(MAX(updated_at), '1970-01-01') 
        FROM accounts
    )
    ON CONFLICT (facebook_account_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        currency = EXCLUDED.currency,
        timezone = EXCLUDED.timezone,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '% accounts synced', v_count;
    
    -- Sync campaigns
    INSERT INTO campaigns (
        account_id, facebook_campaign_id, name, status, objective,
        buying_type, daily_budget, lifetime_budget, start_time, stop_time
    )
    SELECT 
        a.id,
        data->>'id',
        data->>'name',
        data->>'status',
        data->>'objective',
        data->>'buying_type',
        CASE WHEN data->>'daily_budget' IS NOT NULL 
            THEN (data->>'daily_budget')::DECIMAL / 100 
            ELSE NULL 
        END,
        CASE WHEN data->>'lifetime_budget' IS NOT NULL 
            THEN (data->>'lifetime_budget')::DECIMAL / 100 
            ELSE NULL 
        END,
        (data->>'start_time')::TIMESTAMP WITH TIME ZONE,
        (data->>'stop_time')::TIMESTAMP WITH TIME ZONE
    FROM raw_facebook._airbyte_raw_campaigns
    JOIN accounts a ON a.facebook_account_id = data->>'account_id'
    WHERE _airbyte_emitted_at > (
        SELECT COALESCE(MAX(updated_at), '1970-01-01') 
        FROM campaigns
    )
    ON CONFLICT (facebook_campaign_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        daily_budget = EXCLUDED.daily_budget,
        lifetime_budget = EXCLUDED.lifetime_budget,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '% campaigns synced', v_count;
END;
$$;

-- Procedure to calculate campaign performance
CREATE OR REPLACE PROCEDURE calculate_campaign_performance(
    p_campaign_id INTEGER,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_spend DECIMAL;
    v_total_revenue DECIMAL;
    v_total_conversions INTEGER;
    v_avg_cpc DECIMAL;
    v_avg_ctr DECIMAL;
    v_roas DECIMAL;
BEGIN
    -- Calculate aggregate metrics
    SELECT 
        SUM(spend),
        SUM(revenue),
        SUM(conversions),
        AVG(cpc),
        AVG(ctr)
    INTO 
        v_total_spend,
        v_total_revenue,
        v_total_conversions,
        v_avg_cpc,
        v_avg_ctr
    FROM metrics_daily
    WHERE campaign_id = p_campaign_id
        AND date BETWEEN p_start_date AND p_end_date;
    
    -- Calculate ROAS
    IF v_total_spend > 0 THEN
        v_roas = v_total_revenue / v_total_spend;
    ELSE
        v_roas = 0;
    END IF;
    
    -- Log results
    RAISE NOTICE 'Campaign % Performance: Spend=%, Revenue=%, ROAS=%', 
        p_campaign_id, v_total_spend, v_total_revenue, v_roas;
END;
$$;

-- Procedure to check and trigger alerts
CREATE OR REPLACE PROCEDURE check_alerts()
LANGUAGE plpgsql
AS $$
DECLARE
    v_alert RECORD;
    v_metric_value DECIMAL;
    v_should_trigger BOOLEAN;
BEGIN
    -- Loop through enabled alerts
    FOR v_alert IN 
        SELECT * FROM alerts WHERE enabled = true
    LOOP
        v_should_trigger := false;
        
        -- Check alert conditions based on type
        CASE v_alert.type
            WHEN 'high_cpc' THEN
                SELECT AVG(cpc) INTO v_metric_value
                FROM metrics_daily
                WHERE account_id = v_alert.account_id
                    AND date = CURRENT_DATE;
                
                IF v_metric_value > (v_alert.conditions->>'threshold')::DECIMAL THEN
                    v_should_trigger := true;
                END IF;
                
            WHEN 'low_roas' THEN
                SELECT AVG(roas) INTO v_metric_value
                FROM metrics_daily
                WHERE account_id = v_alert.account_id
                    AND date = CURRENT_DATE;
                
                IF v_metric_value < (v_alert.conditions->>'threshold')::DECIMAL THEN
                    v_should_trigger := true;
                END IF;
                
            WHEN 'budget_pace' THEN
                SELECT SUM(spend) INTO v_metric_value
                FROM metrics_daily
                WHERE account_id = v_alert.account_id
                    AND date >= DATE_TRUNC('month', CURRENT_DATE);
                
                IF v_metric_value > (v_alert.conditions->>'monthly_budget')::DECIMAL * 0.8 THEN
                    v_should_trigger := true;
                END IF;
        END CASE;
        
        -- Trigger alert if conditions met
        IF v_should_trigger THEN
            INSERT INTO alert_history (
                alert_id, metric_value, threshold_value, details
            ) VALUES (
                v_alert.id,
                v_metric_value,
                (v_alert.conditions->>'threshold')::DECIMAL,
                jsonb_build_object(
                    'alert_name', v_alert.name,
                    'alert_type', v_alert.type,
                    'triggered_at', CURRENT_TIMESTAMP
                )
            );
            
            -- Update last triggered
            UPDATE alerts 
            SET last_triggered = CURRENT_TIMESTAMP 
            WHERE id = v_alert.id;
        END IF;
    END LOOP;
END;
$$;

-- Function to get account performance summary
CREATE OR REPLACE FUNCTION get_account_performance(
    p_account_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH performance AS (
        SELECT 
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(spend) as spend,
            SUM(conversions) as conversions,
            SUM(revenue) as revenue,
            AVG(ctr) as avg_ctr,
            AVG(cpc) as avg_cpc,
            AVG(roas) as avg_roas
        FROM metrics_daily
        WHERE account_id = p_account_id
            AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    )
    SELECT 'Total Impressions', impressions FROM performance
    UNION ALL
    SELECT 'Total Clicks', clicks FROM performance
    UNION ALL
    SELECT 'Total Spend', spend FROM performance
    UNION ALL
    SELECT 'Total Conversions', conversions FROM performance
    UNION ALL
    SELECT 'Total Revenue', revenue FROM performance
    UNION ALL
    SELECT 'Average CTR', avg_ctr FROM performance
    UNION ALL
    SELECT 'Average CPC', avg_cpc FROM performance
    UNION ALL
    SELECT 'Average ROAS', avg_roas FROM performance;
END;
$$;

-- Function to get campaign trend
CREATE OR REPLACE FUNCTION get_campaign_trend(
    p_campaign_id INTEGER,
    p_metric VARCHAR DEFAULT 'spend',
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    value DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT date, %I as value
        FROM metrics_daily
        WHERE campaign_id = $1
            AND date >= CURRENT_DATE - INTERVAL ''1 day'' * $2
        ORDER BY date
    ', p_metric)
    USING p_campaign_id, p_days;
END;
$$;

-- Procedure to create partitions automatically
CREATE OR REPLACE PROCEDURE create_monthly_partition(
    p_table_name TEXT,
    p_month DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := DATE_TRUNC('month', p_month);
    v_end_date := v_start_date + INTERVAL '1 month';
    v_partition_name := p_table_name || '_' || TO_CHAR(v_start_date, 'YYYY_MM');
    
    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = v_partition_name
    ) THEN
        -- Create partition
        EXECUTE format('
            CREATE TABLE %I PARTITION OF %I
            FOR VALUES FROM (%L) TO (%L)',
            v_partition_name,
            p_table_name,
            v_start_date,
            v_end_date
        );
        
        RAISE NOTICE 'Created partition % for %', v_partition_name, p_table_name;
    END IF;
END;
$$;