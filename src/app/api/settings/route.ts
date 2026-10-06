import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    await requireUser(['ADMIN']);
    const db = getServerSupabaseClient();
    const { data } = await db.from('aru_settings').select('*');
    const settings = (data || []).reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
    return ok({ settings });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(r: Request) {
  try {
    await requireUser(['ADMIN']);
    const body = await bodyOf(r);
    const db = getServerSupabaseClient();
    for (const [key, value] of Object.entries(body)) {
      await db.from('aru_settings').upsert({ key, value });
    }
    return ok({ message: 'บันทึกการตั้งค่าแล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
