-- Initial database setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema_migrations table for tracking migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version BIGINT PRIMARY KEY,
    dirty BOOLEAN NOT NULL DEFAULT FALSE
);