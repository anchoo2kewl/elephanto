-- Create events table for dynamic event management
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    tagline VARCHAR(500),
    date DATE NOT NULL,
    time VARCHAR(100) NOT NULL,
    entry_time VARCHAR(100),
    location VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    attire VARCHAR(100),
    age_range VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    ticket_url VARCHAR(500),
    google_maps_enabled BOOLEAN DEFAULT true,
    countdown_enabled BOOLEAN DEFAULT true,
    cocktail_selection_enabled BOOLEAN DEFAULT true,
    survey_enabled BOOLEAN DEFAULT true,
    the_hour_enabled BOOLEAN DEFAULT false,
    the_hour_active_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Ensure only one event can be active at a time
CREATE UNIQUE INDEX idx_events_active_unique ON events (is_active) WHERE is_active = true;

-- Create trigger to update updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();