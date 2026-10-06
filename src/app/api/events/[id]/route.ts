import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { eventDetail, saveEvent } from '@/lib/data-service';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: Context) { try { const user = await requireUser(['ADMIN','STAFF']); return ok(await eventDetail((await c.params).id, user)); } catch(e) { return apiError(e); } }
export async function PATCH(r: Request, c: Context) { try { await requireUser(['ADMIN']); return ok({ event: await saveEvent(await bodyOf(r), (await c.params).id) }); } catch(e) { return apiError(e); } }
