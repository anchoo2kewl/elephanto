-- Add back the removed profile fields
ALTER TABLE users ADD COLUMN dateOfBirth DATE;
ALTER TABLE users ADD COLUMN currentCity VARCHAR(255);