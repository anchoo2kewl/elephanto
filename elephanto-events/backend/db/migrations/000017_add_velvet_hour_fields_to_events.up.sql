-- Add Velvet Hour configuration fields to events table
ALTER TABLE events ADD COLUMN the_hour_started BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN the_hour_round_duration INTEGER DEFAULT 10; -- minutes
ALTER TABLE events ADD COLUMN the_hour_break_duration INTEGER DEFAULT 5; -- minutes
ALTER TABLE events ADD COLUMN the_hour_total_rounds INTEGER DEFAULT 4;
ALTER TABLE events ADD COLUMN the_hour_min_participants INTEGER DEFAULT 4;