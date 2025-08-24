-- Remove the_hour_min_participants column since it's now auto-calculated based on total rounds
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_min_participants;