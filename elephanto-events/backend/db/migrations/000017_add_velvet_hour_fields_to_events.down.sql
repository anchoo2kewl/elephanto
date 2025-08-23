-- Remove Velvet Hour configuration fields from events table
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_min_participants;
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_total_rounds;
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_break_duration;
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_round_duration;
ALTER TABLE events DROP COLUMN IF EXISTS the_hour_started;