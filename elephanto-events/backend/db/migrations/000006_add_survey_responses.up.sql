-- Add survey responses table
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id) ON DELETE CASCADE,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    torontoMeaning VARCHAR(100) NOT NULL CHECK (torontoMeaning IN (
        'new_beginning', 
        'temporary_stop', 
        'place_to_visit', 
        'land_of_opportunity', 
        'home'
    )),
    personality VARCHAR(50) NOT NULL CHECK (personality IN (
        'Ambitious',
        'Adventurous', 
        'Balanced',
        'Intentional',
        'Social'
    )),
    connectionType VARCHAR(50) NOT NULL CHECK (connectionType IN (
        'Dating',
        'Friendship',
        'Professional'
    )),
    instagramHandle VARCHAR(100),
    howHeardAboutUs VARCHAR(50) NOT NULL CHECK (howHeardAboutUs IN (
        'Instagram',
        'Event Brite',
        'Friends/Family',
        'Facebook'
    )),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId)
);

-- Trigger to update updatedAt
CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();