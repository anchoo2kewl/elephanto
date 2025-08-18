-- Drop events table and related indexes/triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP INDEX IF EXISTS idx_events_active_unique;
DROP TABLE IF EXISTS events;