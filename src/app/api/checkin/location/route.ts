import { ApiError, apiError, bodyOf, ok, requireUser, rateLimit } from '@/lib/auth';
import { getTicket } from '@/lib/data-service';
import { locationError } from '@/lib/validation';
export async function POST(r: Request) { try { const user = await requireUser(['STUDENT']); await rateLimit(`location:${user.id}`, 20); const body = await bodyOf(r); const ticket = await getTicket(body.eventId, user.id); const error = locationError(body.location, ticket.event); if(error) throw new ApiError(error); return ok(); } catch(e) { return apiError(e); } }
