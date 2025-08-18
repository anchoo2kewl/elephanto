-- Create event_faqs table for dynamic FAQ management
CREATE TABLE event_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER,
    color_gradient VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by event
CREATE INDEX idx_event_faqs_event_id ON event_faqs(event_id);
CREATE INDEX idx_event_faqs_display_order ON event_faqs(event_id, display_order);