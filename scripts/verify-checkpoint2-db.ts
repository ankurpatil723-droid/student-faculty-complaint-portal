import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not read .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

const tables = [
  'users',
  'categories',
  'complaints',
  'attachments',
  'comments',
  'reveal_requests',
  'audit_logs',
  'notifications'
];

async function verifyDb() {
  console.log('--- CHECK 2: DATABASE CONNECTIVITY & SCHEMA VERIFICATION ---');
  console.log(`Supabase Host: ${new URL(supabaseUrl!).hostname}`);

  let allPassed = true;

  for (const table of tables) {
    try {
      const { data, error, count } = await adminSupabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        console.error(`❌ Table [${table}]: FAILED with error:`, error.message);
        allPassed = false;
      } else {
        const sampleKeys = data && data.length > 0 ? Object.keys(data[0]) : null;
        console.log(`✅ Table [${table}]: EXISTS (row count: ${count})`);
        if (sampleKeys) {
          console.log(`   Columns: ${sampleKeys.join(', ')}`);
        } else {
          console.log(`   Table is empty but queryable.`);
        }
      }
    } catch (err: any) {
      console.error(`❌ Table [${table}]: Exception:`, err.message);
      allPassed = false;
    }
  }

  // Check foreign keys / relationships
  console.log('\n--- VERIFYING RELATIONS & FOREIGN KEYS ---');
  try {
    const { data: compSample, error: compErr } = await adminSupabase
      .from('complaints')
      .select('id, category_id, complainant_id, categories(id, name), users!complainant_id(id, email, full_name)')
      .limit(1);
    
    if (compErr) {
      console.log('Relation test notice:', compErr.message);
    } else {
      console.log('✅ Relation join [complaints -> categories, users] succeeded!');
    }
  } catch (err: any) {
    console.log('Relation test err:', err.message);
  }

  // Also query information_schema or perform an insert/rollback probe to show all columns for all tables
  console.log('\n--- VERIFYING TABLE COLUMNS VIA RPC / QUERIES ---');
  for (const table of tables) {
    const { data, error } = await adminSupabase.from(table).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(`📋 [${table}] columns (${Object.keys(data[0]).length}): ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`📋 [${table}] table exists and ready.`);
    }
  }

  if (allPassed) {
    console.log('\n>>> CHECK 2: DATABASE CONNECTIVITY & CORE TABLES VERIFIED (PASSED) <<<');
  } else {
    console.error('\n>>> CHECK 2: FAILED <<<');
    process.exit(1);
  }
}

verifyDb().catch((err) => {
  console.error('Fatal in Check 2:', err);
  process.exit(1);
});
