-- Create event attendance table to track user attendance for events
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attending BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure one attendance record per user per event
CREATE UNIQUE INDEX idx_event_attendance_user_event ON event_attendance (user_id, event_id);

-- Index for quick lookups by event
CREATE INDEX idx_event_attendance_event_id ON event_attendance (event_id);

-- Index for quick lookups by user
CREATE INDEX idx_event_attendance_user_id ON event_attendance (user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_event_attendance_updated_at BEFORE UPDATE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();