-- First, remove duplicate feedback entries, keeping only the first one per match_id and from_user_id
DELETE FROM velvet_hour_feedback 
WHERE id NOT IN (
    SELECT DISTINCT ON (match_id, from_user_id) id
    FROM velvet_hour_feedback
    ORDER BY match_id, from_user_id, created_at ASC
);

-- Then add unique constraint to prevent duplicate feedback submissions
-- A user can only submit feedback once per match
ALTER TABLE velvet_hour_feedback 
ADD CONSTRAINT unique_feedback_per_match 
UNIQUE (match_id, from_user_id);