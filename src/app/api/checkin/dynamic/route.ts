import { ApiError, apiError, bodyOf, ok, requireUser, rateLimit } from '@/lib/auth';
import { getTicket, performCheckIn } from '@/lib/data-service';
import { locationError } from '@/lib/validation';
import { validateTotpToken } from '@/lib/totp';
import { getServerSupabaseClient } from '@/lib/supabase/server';
export async function POST(r: Request) {
  try { const user = await requireUser(['STUDENT']); await rateLimit(`scan:${user.id}`); const body = await bodyOf(r);
    const ticket = await getTicket(body.eventId, user.id); const error = locationError(body.location, ticket.event); if(error) throw new ApiError(error);
    const result = await getServerSupabaseClient().from('events').select('totp_secret').eq('id', ticket.event.id).single(); if(result.error) throw result.error;
    if(typeof body.token !== 'string' || !validateTotpToken(result.data.totp_secret, body.token).isValid) throw new ApiError('QR Code หมดอายุหรือไม่ถูกต้อง กรุณาสแกนจากจออีกครั้ง');
    return ok(await performCheckIn(ticket.event.id, user.id, 'DYNAMIC_QR', user));
  } catch(e) { return apiError(e); }
}
