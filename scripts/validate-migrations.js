const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'database', 'migrations');
const files = fs.readdirSync(directory)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (files.length === 0) throw new Error('No migrations found');

files.forEach((file, index) => {
  const expectedPrefix = String(index + 1).padStart(3, '0') + '_';
  if (!file.startsWith(expectedPrefix)) {
    throw new Error(`Migration sequence error: expected ${expectedPrefix}, got ${file}`);
  }
});

const sql = [
  fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8'),
  ...files.map((file) => fs.readFileSync(path.join(directory, file), 'utf8')),
].join('\n');

const required = [
  'auth_sessions',
  'push_tokens',
  'analysis_settings',
  'device_zone_state',
  'noise_zone_device_state',
  'hourly_zone_summaries',
  'cg_upsert_active_alert',
  'cg_record_noise_sample',
  'cg_cleanup_retention',
  'ENABLE ROW LEVEL SECURITY',
];
for (const token of required) {
  if (!sql.includes(token)) throw new Error(`Missing migration capability: ${token}`);
}

if (/DISABLE ROW LEVEL SECURITY/i.test(sql)) {
  throw new Error('RLS must not be disabled');
}
if (/admin123|YOUR_REAL|service_role_key_here/i.test(sql)) {
  throw new Error('Default or example real credentials are forbidden');
}

console.log(`Migration validation passed for ${files.length} files.`);
