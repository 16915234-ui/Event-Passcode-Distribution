import 'server-only';
import { getAuthClient, getServerSupabaseClient } from './supabase/server';
import type { Profile, Role } from '@/types';
export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function requireUser(roles?: Role[]): Promise<Profile> {
  const auth = await getAuthClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new ApiError('กรุณาเข้าสู่ระบบ', 401);
  const { data: profile } = await getServerSupabaseClient().from('users').select('id,username,full_name,role').eq('id', user.id).single();
  if (!profile || (roles && !roles.includes(profile.role))) throw new ApiError('ไม่มีสิทธิ์เข้าถึงส่วนนี้', 403);
  return profile as Profile;
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new ApiError('คำขอจากเว็บไซต์อื่นถูกปฏิเสธ', 403);
}
export async function bodyOf(request: Request) {
  assertSameOrigin(request);
  const text = await request.text();
  if (text.length > 250_000) throw new ApiError('ข้อมูลมีขนาดใหญ่เกินไป', 413);
  try { const body = JSON.parse(text); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); return body; }
  catch { throw new ApiError('รูปแบบ JSON ไม่ถูกต้อง'); }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ success: false, error: error.message }, { status: error.status });
  console.error('API failure', error instanceof Error ? error.message : 'Database operation failed');
  return Response.json({ success: false, error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบการตั้งค่าระบบหรือลองใหม่' }, { status: 500 });
}
export function ok(data: object = {}) { return Response.json({ success: true, ...data }, { headers: { 'Cache-Control': 'private, no-store' } }); }
export async function rateLimit(key: string, limit = 10, seconds = 30) {
  const { data, error } = await getServerSupabaseClient().rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_seconds: seconds });
  if (error) throw error;
  if (!data) throw new ApiError('ทำรายการถี่เกินไป กรุณารอสักครู่', 429);
}
