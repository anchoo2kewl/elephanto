-- Create event_details table for dynamic content sections
CREATE TABLE event_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- 'hero', 'feature_card', 'who_we_curate', 'guidelines', 'about_org'
    title VARCHAR(255),
    content TEXT,
    icon VARCHAR(50),
    display_order INTEGER,
    color_scheme VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by event and section type
CREATE INDEX idx_event_details_event_id ON event_details(event_id);
CREATE INDEX idx_event_details_section_type ON event_details(event_id, section_type);
CREATE INDEX idx_event_details_display_order ON event_details(event_id, display_order);