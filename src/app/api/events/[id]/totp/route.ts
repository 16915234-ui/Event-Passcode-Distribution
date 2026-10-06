import { apiError, ok, requireUser } from '@/lib/auth';
import { eventId } from '@/lib/data-service';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { generateTotpToken } from '@/lib/totp';
export async function GET(_: Request, c: { params: Promise<{ id: string }> }) {
  try { await requireUser(['ADMIN']); const { id } = await c.params;
    const { data, error } = await getServerSupabaseClient().from('events').select('totp_secret').eq('id', eventId(id)).single(); if (error) throw error;
    const now = Date.now(); return ok({ token: generateTotpToken(data.totp_secret, now), timestamp: now, expiresAt: (Math.floor(now/5000)+1)*5000, secret: data.totp_secret });
  } catch(e) { return apiError(e); }
}
