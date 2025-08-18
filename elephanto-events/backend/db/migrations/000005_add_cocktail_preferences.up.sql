-- Add cocktail preferences table
CREATE TABLE cocktail_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id) ON DELETE CASCADE,
    preference VARCHAR(50) NOT NULL CHECK (preference IN ('beer', 'wine', 'cocktail', 'non-alcoholic')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId)
);

-- Trigger to update updatedAt
CREATE TRIGGER update_cocktail_preferences_updated_at BEFORE UPDATE ON cocktail_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();