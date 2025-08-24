-- Fix the update_updated_at_column function to handle both naming conventions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Try updated_at first (with underscore), fallback to updatedat (no underscore)
    IF TG_TABLE_NAME IN ('events', 'event_attendance', 'personal_access_tokens', 'velvet_hour_matches', 'velvet_hour_participants', 'velvet_hour_questions', 'velvet_hour_sessions') THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    ELSE
        NEW.updatedat = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;

-- Add map_provider field to events table
ALTER TABLE events ADD COLUMN map_provider VARCHAR(20) DEFAULT 'google' CHECK (map_provider IN ('google', 'openstreetmap'));

-- Update existing events to use the current google_maps_enabled setting
UPDATE events SET map_provider = CASE 
    WHEN google_maps_enabled = true THEN 'google'
    ELSE 'openstreetmap'
END;

-- Add comment to explain the field
COMMENT ON COLUMN events.map_provider IS 'Map provider: google (requires API key) or openstreetmap (free)';