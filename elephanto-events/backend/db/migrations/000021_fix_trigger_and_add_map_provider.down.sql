-- Revert the update_updated_at_column function to original (broken) version
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Remove map_provider column
ALTER TABLE events DROP COLUMN IF EXISTS map_provider;