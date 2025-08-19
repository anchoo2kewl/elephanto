-- Fix the update_updated_at_column function to handle both naming conventions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    column_exists_underscore boolean;
    column_exists_lowercase boolean;
BEGIN
    -- Check if the table has an 'updated_at' column (with underscore)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'updated_at'
    ) INTO column_exists_underscore;
    
    -- Check if the table has an 'updatedat' column (lowercase)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'updatedat'
    ) INTO column_exists_lowercase;
    
    -- Update the appropriate column based on what exists
    IF column_exists_underscore THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    ELSIF column_exists_lowercase THEN
        NEW.updatedat = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$;