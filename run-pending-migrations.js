#!/usr/bin/env node

/**
 * Auto-run pending database migrations
 * This script connects to Supabase and runs the Gmail multi-account migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read the migration SQL file
const migrationPath = join(__dirname, 'supabase/migrations/20260204202702_add_multiple_gmail_accounts_support.sql');
console.log(`📂 Reading migration: ${migrationPath}`);

const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🚀 Running migration...\n');

// Execute the migration
try {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('\n' + migrationSQL);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
  console.log('✨ You can now connect up to 3 Gmail accounts');
  process.exit(0);

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
  console.log('\n' + migrationSQL);
  process.exit(1);
}
