import { apiError, ok, requireUser } from '@/lib/auth';
import { getTicket, eventId } from '@/lib/data-service';
export async function GET(r: Request) { try { const user = await requireUser(['STUDENT']); return ok(await getTicket(eventId(new URL(r.url).searchParams.get('eventId')), user.id)); } catch(e) { return apiError(e); } }
