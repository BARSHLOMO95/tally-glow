import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20260130115000_add_first_name_last_name_to_user_settings.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running migration: add_first_name_last_name_to_user_settings');
    console.log('SQL:', sql);

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
