import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { listEvents, saveEvent } from '@/lib/data-service';
export async function GET() { try { const start = performance.now(); const user = await requireUser(); const authenticated = performance.now(); const events = await listEvents(user); return ok({ events }, { auth: authenticated-start, database: performance.now()-authenticated }); } catch(e) { return apiError(e); } }
export async function POST(r: Request) { try { await requireUser(['ADMIN']); return ok({ event: await saveEvent(await bodyOf(r)) }); } catch(e) { return apiError(e); } }
