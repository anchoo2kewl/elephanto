-- Add event_id to existing survey_responses and cocktail_preferences tables
ALTER TABLE survey_responses ADD COLUMN event_id UUID REFERENCES events(id);
ALTER TABLE cocktail_preferences ADD COLUMN event_id UUID REFERENCES events(id);

-- Create indexes for better performance
CREATE INDEX idx_survey_responses_event_id ON survey_responses(event_id);
CREATE INDEX idx_cocktail_preferences_event_id ON cocktail_preferences(event_id);