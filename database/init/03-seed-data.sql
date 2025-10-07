-- Seed data for development and testing
-- Version: 1.0.0

-- Only run in development environment
DO $$
BEGIN
    -- Check if we're in development (you can modify this check)
    IF current_database() = 'fbads' OR current_database() = 'fbads_dev' THEN
        
        -- Create admin user (password: admin123)
        INSERT INTO users (email, password_hash, name, role, account_ids)
        VALUES (
            'admin@example.com',
            '$2a$10$YKxL5JvDgHLSKrCzqzHKOOQZNwnVjQQjVYshfX2BfHhIhA9FnQ3qe',
            'Admin User',
            'admin',
            ARRAY[1,2]
        ) ON CONFLICT (email) DO NOTHING;
        
        -- Create demo user (password: demo123)
        INSERT INTO users (email, password_hash, name, role, account_ids)
        VALUES (
            'demo@example.com',
            '$2a$10$rBm2Jm7i3oCF0CvCQwPmLOuOiZzVXL.SRW/GmJXHCYkD1Y6wlC.W2',
            'Demo User',
            'viewer',
            ARRAY[1]
        ) ON CONFLICT (email) DO NOTHING;
        
        -- Create demo accounts
        INSERT INTO accounts (facebook_account_id, name, currency, timezone, status)
        VALUES 
            ('123456789', 'Demo Account 1', 'USD', 'America/New_York', 'active'),
            ('987654321', 'Demo Account 2', 'EUR', 'Europe/London', 'active')
        ON CONFLICT (facebook_account_id) DO NOTHING;
        
        -- Create demo campaigns
        INSERT INTO campaigns (
            account_id, facebook_campaign_id, name, status, objective,
            buying_type, daily_budget, start_time
        )
        SELECT 
            1, 
            'camp_' || generate_series,
            'Campaign ' || generate_series,
            CASE 
                WHEN random() > 0.3 THEN 'ACTIVE'
                ELSE 'PAUSED'
            END,
            (ARRAY['CONVERSIONS', 'TRAFFIC', 'BRAND_AWARENESS'])[floor(random() * 3 + 1)],
            'AUCTION',
            (random() * 1000 + 50)::DECIMAL(12,2),
            CURRENT_DATE - INTERVAL '30 days' + (generate_series || ' days')::INTERVAL
        FROM generate_series(1, 10)
        ON CONFLICT (facebook_campaign_id) DO NOTHING;
        
        -- Create demo ad sets
        INSERT INTO ad_sets (
            campaign_id, facebook_adset_id, name, status,
            daily_budget, optimization_goal, targeting
        )
        SELECT 
            campaign_id,
            'adset_' || campaign_id || '_' || ad_set_num,
            'Ad Set ' || ad_set_num || ' - Campaign ' || campaign_id,
            'ACTIVE',
            (random() * 200 + 20)::DECIMAL(12,2),
            'CONVERSIONS',
            jsonb_build_object(
                'age_min', 18,
                'age_max', 65,
                'genders', ARRAY[1,2],
                'geo_locations', jsonb_build_object(
                    'countries', ARRAY['US'],
                    'location_types', ARRAY['home', 'recent']
                )
            )
        FROM 
            (SELECT id as campaign_id FROM campaigns LIMIT 5) c,
            generate_series(1, 3) as ad_set_num
        ON CONFLICT (facebook_adset_id) DO NOTHING;
        
        -- Create demo ads
        INSERT INTO ads (
            ad_set_id, facebook_ad_id, name, status
        )
        SELECT 
            ad_set_id,
            'ad_' || ad_set_id || '_' || ad_num,
            'Ad ' || ad_num || ' - Ad Set ' || ad_set_id,
            'ACTIVE'
        FROM 
            (SELECT id as ad_set_id FROM ad_sets LIMIT 10) a,
            generate_series(1, 2) as ad_num
        ON CONFLICT (facebook_ad_id) DO NOTHING;
        
        -- Generate demo metrics for the last 30 days
        INSERT INTO metrics_daily (
            date, account_id, campaign_id,
            impressions, clicks, spend, conversions, revenue
        )
        SELECT 
            date,
            1 as account_id,
            c.id as campaign_id,
            (random() * 100000 + 1000)::INTEGER as impressions,
            (random() * 1000 + 10)::INTEGER as clicks,
            (random() * 1000 + 50)::DECIMAL(12,2) as spend,
            (random() * 50)::INTEGER as conversions,
            (random() * 2000 + 100)::DECIMAL(12,2) as revenue
        FROM 
            campaigns c,
            generate_series(
                CURRENT_DATE - INTERVAL '30 days',
                CURRENT_DATE,
                '1 day'::INTERVAL
            ) as date
        WHERE c.account_id = 1
        ON CONFLICT (date, campaign_id, id) DO NOTHING;
        
        -- Create demo alerts
        INSERT INTO alerts (
            account_id, name, type, conditions, notification_channels
        )
        VALUES 
            (
                1,
                'High CPC Alert',
                'high_cpc',
                jsonb_build_object('threshold', 5.0),
                jsonb_build_object('email', ARRAY['alerts@example.com'])
            ),
            (
                1,
                'Low ROAS Alert',
                'low_roas',
                jsonb_build_object('threshold', 1.5),
                jsonb_build_object('email', ARRAY['alerts@example.com'])
            ),
            (
                1,
                'Budget Pace Alert',
                'budget_pace',
                jsonb_build_object('monthly_budget', 10000),
                jsonb_build_object('email', ARRAY['budget@example.com'])
            )
        ON CONFLICT DO NOTHING;
        
        -- Refresh materialized views
        REFRESH MATERIALIZED VIEW mv_dashboard_summary;
        REFRESH MATERIALIZED VIEW mv_campaign_comparison;
        
        RAISE NOTICE 'Seed data inserted successfully';
        
    ELSE
        RAISE NOTICE 'Skipping seed data - not in development environment';
    END IF;
END $$;