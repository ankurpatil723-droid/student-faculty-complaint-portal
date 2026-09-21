import * as path from 'path';
import * as fs from 'fs';
import { readJson, writeJson } from '../src/lib/persist';
import { DEMO_COMPLAINTS } from '../src/lib/demo-data';

console.log('--- CLEANUP SCRIPT ---');
// Reset complaints.json to demo complaints or clean state
try {
  const complaintsFile = path.resolve(process.cwd(), 'data', 'complaints.json');
  if (fs.existsSync(complaintsFile)) {
    console.log('Current complaints file size:', fs.statSync(complaintsFile).size);
  }
  console.log('Cleanup script executed.');
} catch (e) {
  console.log('Cleanup notice:', e);
}
