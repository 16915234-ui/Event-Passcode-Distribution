import { createHash } from 'node:crypto';
import { ApiError, apiError, bodyOf, ok, rateLimit } from '@/lib/auth';
import { getAuthClient, getServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeLoginIdentifier, resolveLoginEmail } from '@/lib/login-identifier';
export async function POST(r: Request) {
  try { const { username, password, deviceId } = await bodyOf(r);
    const identifier = normalizeLoginIdentifier(username);
    if(!identifier || typeof password !== 'string' || !password || password.length > 128) throw new ApiError('รหัสผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง', 401);
    await rateLimit(`login:${createHash('sha256').update(identifier).digest('hex')}`,10,300);
    const db = getServerSupabaseClient();
    const email = await resolveLoginEmail(identifier, async value => {
      const { data: profile, error } = await db.from('users').select('id').eq('username', value).maybeSingle();
      if (error) throw error;
      if (!profile) return null;
      const account = await db.auth.admin.getUserById(profile.id);
      if (account.error) throw account.error;
      return account.data.user.email || null;
    });
    const auth = await getAuthClient(); const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error?.code === 'email_not_confirmed') throw new ApiError('บัญชียังไม่ยืนยันอีเมล กรุณาติดต่อผู้ดูแลระบบ', 403);
    if (error?.status === 429) throw new ApiError('เข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่', 429);
    if(error || !data.user) throw new ApiError('รหัสผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง',401);
    const profile = await db.from('users').select('role').eq('id', data.user.id).maybeSingle();
    if (profile.error) { await auth.auth.signOut(); throw profile.error; }
    if(!profile.data) { await auth.auth.signOut(); throw new ApiError('บัญชียังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ',403); }

    if (profile.data.role === 'STUDENT' && typeof deviceId === 'string' && deviceId) {
      const lockPrefix = `devicelock:${deviceId}:`;
      const { data: locks } = await db.from('aru_rate_limits').select('key').like('key', `${lockPrefix}%`).gt('expires_at', new Date().toISOString());
      const activeLock = locks?.find(l => !l.key.endsWith(data.user.id));
      if (activeLock) {
        await auth.auth.signOut();
        throw new ApiError('อุปกรณ์นี้ถูกจำกัดให้ใช้กับอีกบัญชีหนึ่งไปแล้ว (1 ชั่วโมง) กรุณาใช้อุปกรณ์อื่น', 403);
      }
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await db.from('aru_rate_limits').upsert({ key: `${lockPrefix}${data.user.id}`, hits: 1, expires_at: expiresAt });
    }

    return ok({ redirect: `/${profile.data.role.toLowerCase()}` });
  } catch(e) { return apiError(e); }
}
