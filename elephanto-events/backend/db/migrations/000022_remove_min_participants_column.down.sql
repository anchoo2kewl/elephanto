-- Add back the_hour_min_participants column (rollback)
ALTER TABLE events ADD COLUMN IF NOT EXISTS the_hour_min_participants integer DEFAULT 4;