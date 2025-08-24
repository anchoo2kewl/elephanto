-- Remove unique constraint on feedback submissions
ALTER TABLE velvet_hour_feedback 
DROP CONSTRAINT IF EXISTS unique_feedback_per_match;