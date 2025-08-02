-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_authTokens_token ON authTokens(token) WHERE used = FALSE;
CREATE INDEX idx_authTokens_expires ON authTokens(expiresAt) WHERE used = FALSE;
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_userId ON sessions(userId);
CREATE INDEX idx_sessions_expires ON sessions(expiresAt);