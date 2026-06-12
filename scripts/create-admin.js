require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || 'Campus Security';
  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required');
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) throw new Error('An account with this email already exists');

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: await bcrypt.hash(password, 12),
      full_name: fullName,
      role: 'admin',
      is_active: true,
    })
    .select('id, email, full_name, role')
    .single();
  if (error) throw error;
  console.log(`Admin created: ${data.email} (${data.id})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
