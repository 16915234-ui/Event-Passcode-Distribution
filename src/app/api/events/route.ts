import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { listEvents, saveEvent } from '@/lib/data-service';
export async function GET() { try { return ok({ events: await listEvents(await requireUser()) }); } catch(e) { return apiError(e); } }
export async function POST(r: Request) { try { await requireUser(['ADMIN']); return ok({ event: await saveEvent(await bodyOf(r)) }); } catch(e) { return apiError(e); } }
