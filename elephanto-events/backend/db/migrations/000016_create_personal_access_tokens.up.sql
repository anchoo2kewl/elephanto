-- Create personal access tokens table
CREATE TABLE personal_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_personal_access_tokens_user_id ON personal_access_tokens(user_id);
CREATE INDEX idx_personal_access_tokens_token_hash ON personal_access_tokens(token_hash);
CREATE INDEX idx_personal_access_tokens_expires_at ON personal_access_tokens(expires_at);
CREATE INDEX idx_personal_access_tokens_created_at ON personal_access_tokens(created_at);

-- Add update trigger for updated_at
CREATE TRIGGER update_personal_access_tokens_updated_at
    BEFORE UPDATE ON personal_access_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();