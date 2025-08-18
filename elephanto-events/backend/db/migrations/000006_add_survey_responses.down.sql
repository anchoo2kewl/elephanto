-- Drop survey responses table
DROP TRIGGER IF EXISTS update_survey_responses_updated_at ON survey_responses;
DROP TABLE IF EXISTS survey_responses;