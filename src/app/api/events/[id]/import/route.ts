import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { importStudents } from '@/lib/data-service';
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) { try { await requireUser(['ADMIN']); return ok(await importStudents((await c.params).id, (await bodyOf(r)).students)); } catch(e) { return apiError(e); } }
