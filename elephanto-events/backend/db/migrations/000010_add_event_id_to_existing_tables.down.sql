-- Remove event_id from existing tables
DROP INDEX IF EXISTS idx_cocktail_preferences_event_id;
DROP INDEX IF EXISTS idx_survey_responses_event_id;
ALTER TABLE cocktail_preferences DROP COLUMN IF EXISTS event_id;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS event_id;