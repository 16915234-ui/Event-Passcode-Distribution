import { apiError, ok, requireUser } from '@/lib/auth';
export async function GET() { try { return ok({ user: await requireUser() }); } catch(e) { return apiError(e); } }
