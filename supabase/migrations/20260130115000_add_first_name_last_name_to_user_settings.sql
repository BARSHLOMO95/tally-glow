-- Add first_name and last_name columns to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Add comment to columns for documentation
COMMENT ON COLUMN user_settings.first_name IS 'User first name';
COMMENT ON COLUMN user_settings.last_name IS 'User last name';
