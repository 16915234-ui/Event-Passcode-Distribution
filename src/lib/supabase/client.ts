import { createBrowserClient } from '@supabase/ssr';
let instance: ReturnType<typeof createBrowserClient> | undefined;
export function getSupabaseBrowserClient() {
  if (!instance) instance = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return instance;
}
