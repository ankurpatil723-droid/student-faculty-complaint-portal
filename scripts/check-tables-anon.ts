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

async function checkAllTables() {
  console.log('--- CHECKING ALL 8 TABLES WITH SUPABASE ANON CLIENT ---');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`Table [${table}]: Status = ${error.code || 'ERROR'} (${error.message})`);
      } else {
        console.log(`✅ Table [${table}]: REACHABLE (row count: ${count}, items returned: ${data.length})`);
      }
    } catch (e: any) {
      console.log(`Table [${table}]: Exception: ${e.message}`);
    }
  }
}

checkAllTables();
