import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
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
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

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

async function runCheck2() {
  console.log('=== CHECK 2: DATABASE CONNECTIVITY & LIVE SCHEMA VERIFICATION ===');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Client Key Type: Anon / Public`);

  const results: Record<string, { exists: boolean; rows: number; error: string | null }> = {};
  let failed = false;

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      results[table] = { exists: false, rows: 0, error: error.message };
      console.log(`  ❌ [FAIL] Table "${table}": ${error.message} (code: ${error.code})`);
      failed = true;
    } else {
      results[table] = { exists: true, rows: count || 0, error: null };
      console.log(`  ✓ [PASS] Table "${table}": verified reachable (row count: ${count ?? 0})`);
    }
  }

  if (failed) {
    console.error('\n>>> Check 2: FAILED');
    process.exit(1);
  } else {
    console.log('\n>>> Check 2: PASSED (All 8 core tables reachable on Supabase)');
  }
}

runCheck2().catch((err) => {
  console.error('Fatal in Check 2:', err);
  process.exit(1);
});
