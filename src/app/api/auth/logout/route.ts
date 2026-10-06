import { apiError, assertSameOrigin, ok } from '@/lib/auth';
import { getAuthClient } from '@/lib/supabase/server';
export async function POST(r: Request) { try { assertSameOrigin(r); const auth = await getAuthClient(); await auth.auth.signOut(); return ok(); } catch(e) { return apiError(e); } }
