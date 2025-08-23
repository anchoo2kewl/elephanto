-- Drop triggers
DROP TRIGGER IF EXISTS update_velvet_hour_questions_updated_at ON velvet_hour_questions;
DROP TRIGGER IF EXISTS update_velvet_hour_matches_updated_at ON velvet_hour_matches;
DROP TRIGGER IF EXISTS update_velvet_hour_participants_updated_at ON velvet_hour_participants;
DROP TRIGGER IF EXISTS update_velvet_hour_sessions_updated_at ON velvet_hour_sessions;

-- Drop indexes
DROP INDEX IF EXISTS idx_velvet_hour_questions_event_id;
DROP INDEX IF EXISTS idx_velvet_hour_feedback_match_id;
DROP INDEX IF EXISTS idx_velvet_hour_matches_users;
DROP INDEX IF EXISTS idx_velvet_hour_matches_session_round;
DROP INDEX IF EXISTS idx_velvet_hour_participants_user_id;
DROP INDEX IF EXISTS idx_velvet_hour_participants_session_id;
DROP INDEX IF EXISTS idx_velvet_hour_sessions_active;
DROP INDEX IF EXISTS idx_velvet_hour_sessions_event_id;

-- Drop tables in reverse order
DROP TABLE IF EXISTS velvet_hour_questions;
DROP TABLE IF EXISTS velvet_hour_feedback;
DROP TABLE IF EXISTS velvet_hour_matches;
DROP TABLE IF EXISTS velvet_hour_participants;
DROP TABLE IF EXISTS velvet_hour_sessions;