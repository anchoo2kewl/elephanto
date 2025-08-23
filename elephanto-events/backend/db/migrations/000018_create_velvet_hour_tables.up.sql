-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create velvet_hour_sessions table
CREATE TABLE velvet_hour_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITHOUT TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    current_round INTEGER DEFAULT 0,
    round_started_at TIMESTAMP WITHOUT TIME ZONE NULL,
    round_ends_at TIMESTAMP WITHOUT TIME ZONE NULL,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, in_round, break, completed
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create velvet_hour_participants table
CREATE TABLE velvet_hour_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES velvet_hour_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, matched, in_round, completed
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- Create velvet_hour_matches table
CREATE TABLE velvet_hour_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES velvet_hour_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL, -- the number shown on screen
    match_color VARCHAR(20) NOT NULL, -- background color
    started_at TIMESTAMP WITHOUT TIME ZONE NULL,
    confirmed_user1 BOOLEAN DEFAULT FALSE,
    confirmed_user2 BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create velvet_hour_feedback table
CREATE TABLE velvet_hour_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES velvet_hour_matches(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    want_to_connect BOOLEAN NOT NULL,
    feedback_reason VARCHAR(50) NOT NULL, -- humor, confidence, listening, no_connection
    submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create velvet_hour_questions table
CREATE TABLE velvet_hour_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL, -- connect, feedback
    question_text TEXT NOT NULL,
    options JSONB NULL, -- for multiple choice options
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_velvet_hour_sessions_event_id ON velvet_hour_sessions(event_id);
CREATE INDEX idx_velvet_hour_sessions_active ON velvet_hour_sessions(is_active);
CREATE INDEX idx_velvet_hour_participants_session_id ON velvet_hour_participants(session_id);
CREATE INDEX idx_velvet_hour_participants_user_id ON velvet_hour_participants(user_id);
CREATE INDEX idx_velvet_hour_matches_session_round ON velvet_hour_matches(session_id, round_number);
CREATE INDEX idx_velvet_hour_matches_users ON velvet_hour_matches(user1_id, user2_id);
CREATE INDEX idx_velvet_hour_feedback_match_id ON velvet_hour_feedback(match_id);
CREATE INDEX idx_velvet_hour_questions_event_id ON velvet_hour_questions(event_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_velvet_hour_sessions_updated_at BEFORE UPDATE ON velvet_hour_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_velvet_hour_participants_updated_at BEFORE UPDATE ON velvet_hour_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_velvet_hour_matches_updated_at BEFORE UPDATE ON velvet_hour_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_velvet_hour_questions_updated_at BEFORE UPDATE ON velvet_hour_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();