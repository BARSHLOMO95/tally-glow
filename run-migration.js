// Simple script to run the migration
// You can run this migration manually in Supabase Dashboard > SQL Editor
// Or run this script with: node run-migration.js

const migration = `
-- Add first_name and last_name columns to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Add comment to columns for documentation
COMMENT ON COLUMN user_settings.first_name IS 'User first name';
COMMENT ON COLUMN user_settings.last_name IS 'User last name';
`;

console.log('\n=== MIGRATION SQL ===\n');
console.log(migration);
console.log('\n=== HOW TO RUN ===\n');
console.log('1. Go to Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Click "Run"');
console.log('\nOr use Supabase CLI:');
console.log('  supabase db push\n');
