-- Drop event_details table and indexes
DROP INDEX IF EXISTS idx_event_details_display_order;
DROP INDEX IF EXISTS idx_event_details_section_type;
DROP INDEX IF EXISTS idx_event_details_event_id;
DROP TABLE IF EXISTS event_details;