-- Remove unused profile fields from users table
ALTER TABLE users DROP COLUMN IF EXISTS dateOfBirth;
ALTER TABLE users DROP COLUMN IF EXISTS currentCity;