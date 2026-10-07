import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { eventDetail, saveEvent } from '@/lib/data-service';
import { eventQueryOptions } from '@/lib/query-options';
type Context = { params: Promise<{ id: string }> };
export async function GET(r: Request, c: Context) {
  try {
    const start = performance.now(); const user = await requireUser(['ADMIN','STAFF']); const authenticated = performance.now();
    const data = await eventDetail((await c.params).id, user, eventQueryOptions(new URL(r.url).searchParams));
    return ok(data, { auth: authenticated-start, database: performance.now()-authenticated });
  } catch(e) { return apiError(e); }
}
export async function PATCH(r: Request, c: Context) { try { await requireUser(['ADMIN']); return ok({ event: await saveEvent(await bodyOf(r), (await c.params).id) }); } catch(e) { return apiError(e); } }

export async function DELETE(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['ADMIN']);
    const id = (await c.params).id;
    const db = getServerSupabaseClient();
    const { error } = await db.from('events').delete().eq('id', id);
    if (error) throw error;
    return ok({ message: 'ลบกิจกรรมแล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
