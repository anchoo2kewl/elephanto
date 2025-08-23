-- Add the_hour_available field to events table
ALTER TABLE events ADD COLUMN the_hour_available BOOLEAN DEFAULT false;