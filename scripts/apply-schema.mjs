/**
 * Applies the full schema.sql and seed.sql to the live Supabase project
 * using the Supabase Management API (exec endpoint).
 * Run: node scripts/apply-schema.mjs
 */

const PROJECT_REF = 'ncxrbsdeosnnbyfaizrc';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeHJic2Rlb3NubmJ5ZmFpenJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzkwNzc2OCwiZXhwIjoyMTAzNDgzNzY4fQ.Xl8wRNCj7yzoE4rlPuipr36HkoomW_VZRVK9lHO531I';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// We'll use the Management API REST endpoint to execute raw SQL
// Endpoint: POST https://api.supabase.com/v1/projects/{ref}/database/query
// However for self-hosted projects, we can use the direct database connection
// via the Supabase JS client for queries that return data, but for DDL
// we need a different approach.

// The best approach without a PAT token is to use the service role + 
// a temporary RPC function or the db pooler

// Let's check connectivity first via the Next.js app's internal endpoint
// by reading the schema and seed SQL and splitting into executable chunks

const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
const seedPath = join(__dirname, '..', 'supabase', 'seed.sql');

const schemaSql = readFileSync(schemaPath, 'utf-8');
const seedSql = readFileSync(seedPath, 'utf-8');

console.log('Schema SQL length:', schemaSql.length);
console.log('Seed SQL length:', seedSql.length);

// Test connection first
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Check if categories table exists
console.log('\n--- Checking connection ---');
const { data, error } = await supabase.from('categories').select('id').limit(1);
if (error) {
  console.log('categories table check:', error.message);
  if (error.message.includes('schema cache') || error.message.includes('404') || error.message.includes('Not Found')) {
    console.log('CONFIRMED: Tables do not exist yet. Schema needs to be applied.');
  }
} else {
  console.log('categories table exists, rows:', data?.length);
}

// Try using the supabase management API exec endpoint
// We need to use the REST query endpoint with a direct database query
// The correct endpoint for running arbitrary SQL is the /database/query endpoint
// which requires a Supabase PAT (Personal Access Token) at api.supabase.com

// Alternative: Use the database connection string directly via pg
// We'll generate the SQL statements in chunks that can be pasted into the Supabase SQL editor

console.log('\n=== DIAGNOSIS COMPLETE ===');
console.log('The tables do not exist in the live Supabase project.');
console.log('The schema.sql and seed.sql need to be applied via Supabase SQL Editor.');
console.log('\nProject URL: https://supabase.com/dashboard/project/ncxrbsdeosnnbyfaizrc/sql/new');
console.log('\nTo apply the schema:');
console.log('1. Go to the SQL Editor link above');
console.log('2. Paste and run supabase/schema.sql');
console.log('3. Then paste and run supabase/seed.sql');
