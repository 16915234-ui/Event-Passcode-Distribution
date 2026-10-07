import { apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    await requireUser(['ADMIN']);
    const db = getServerSupabaseClient();
    const { data, error } = await db.from('aru_settings').select('key,value');
    if (error) throw error;
    const settings = Object.fromEntries((data || []).map(row => [row.key, row.value]));
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
    const records = Object.entries(body).map(([key, value]) => ({ key, value }));
    if (records.length) { const { error } = await db.from('aru_settings').upsert(records); if (error) throw error; }
    return ok({ message: 'บันทึกการตั้งค่าแล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
