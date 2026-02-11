-- ShadowPulse V2 Activity Reset Script
-- WARNING: This will delete all user data and activity logs!

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TRUNCATE User Activity Tables
TRUNCATE TABLE sp_users;             -- Key user table (identities)
TRUNCATE TABLE sp_pulses;            -- Live votes/pulses
TRUNCATE TABLE sp_pulses_log;        -- Audit log of pulses
TRUNCATE TABLE sp_rankings;          -- Live leaderboard
TRUNCATE TABLE sp_daily_rankings;    -- Daily rankings snapshot
TRUNCATE TABLE sp_topic_views_daily; -- Analytics
TRUNCATE TABLE sp_board_views_daily; -- Analytics
TRUNCATE TABLE sp_btc_winners;       -- Bitcoin faucet winners history
TRUNCATE TABLE sp_debug_logs;        -- System debug logs

-- 2. TRUNCATE Content Cache
-- These tables cache forum content. Truncating ensures no stale metadata 
-- links to deleted users or pulses. They will autopopulate as the system runs.
TRUNCATE TABLE sp_topics;
TRUNCATE TABLE sp_posts;

-- 3. PRESERVE (Do Not Truncate)
-- sp_admin_users   (Admin accounts)
-- sp_boards        (Forum structure - User requested to keep)
-- sp_websites      (Tenant definitions)
-- sp_system_config (Configuration)

-- 4. RESET Configuration State
-- Reset active flags to ensure system starts clean
UPDATE sp_system_config SET config_value = '0' WHERE config_key = 'btc_active';
UPDATE sp_system_config SET config_value = '0' WHERE config_key = 'btc_scheduler_enabled';
UPDATE sp_system_config SET config_value = '' WHERE config_key = 'btc_dev_user'; -- Clear linked dev user as users are deleted

SET FOREIGN_KEY_CHECKS = 1;

SELECT "Activity Reset Complete." AS status;
