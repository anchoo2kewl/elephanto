-- Drop event_faqs table and indexes
DROP INDEX IF EXISTS idx_event_faqs_display_order;
DROP INDEX IF EXISTS idx_event_faqs_event_id;
DROP TABLE IF EXISTS event_faqs;