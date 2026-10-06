import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { allocateExistingStudents } from '@/lib/data-service';

export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['ADMIN']);
    const body = await bodyOf(r);
    return ok(await allocateExistingStudents((await c.params).id, body.userIds));
  } catch (e) {
    return apiError(e);
  }
}
