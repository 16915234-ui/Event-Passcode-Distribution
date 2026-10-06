const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await c.rpc('exec_sql', { sql: 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;' });
  console.log('Result:', error || 'Success');
}
run();
