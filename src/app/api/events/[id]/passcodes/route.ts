import { ApiError, apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getEvent } from '@/lib/data-service';
import { getServerSupabaseClient } from '@/lib/supabase/server';
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try { await requireUser(['ADMIN']); const { id } = await c.params; await getEvent(id); const { codes } = await bodyOf(r);
    if (!Array.isArray(codes) || !codes.length || codes.length > 2000 || codes.some(x => typeof x !== 'string' || !x.trim() || x.length > 200)) throw new ApiError('ระบุ Passcode 1–2,000 รหัส ความยาวไม่เกิน 200 ตัวอักษร');
    const unique = [...new Set<string>(codes.map(c => c.trim()))];
    const { data, error } = await getServerSupabaseClient().from('passcodes').upsert(unique.map(code_value => ({ event_id: id, code_value })), { onConflict: 'event_id,code_value', ignoreDuplicates: true }).select('id');
    if (error) throw error; return ok({ added: data.length, message: `เพิ่ม Passcode ใหม่ ${data.length} รหัส` });
  } catch(e) { return apiError(e); }
}
