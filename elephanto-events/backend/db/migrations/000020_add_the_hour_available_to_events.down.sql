-- Remove the_hour_available field from events table
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_available;