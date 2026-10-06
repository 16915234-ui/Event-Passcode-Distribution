import { ApiError, apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { eventId, performCheckIn } from '@/lib/data-service';
import { verifyStudentQr } from '@/lib/static-qr';
import { getServerSupabaseClient } from '@/lib/supabase/server';
export async function POST(r: Request) {
  try { const user = await requireUser(['STAFF','ADMIN']); const body = await bodyOf(r); const id = eventId(body.eventId); let studentId: string | null = null;
    if(body.method === 'STAFF_SCAN' && typeof body.qr === 'string') studentId = verifyStudentQr(body.qr, id);
    else if(body.method === 'MANUAL' && typeof body.username === 'string') { const { data, error } = await getServerSupabaseClient().from('users').select('id').eq('username', body.username.toLowerCase().trim()).eq('role','STUDENT').maybeSingle(); if(error) throw error; studentId = data?.id || null; }
    if(!studentId) throw new ApiError('QR ไม่ถูกต้องสำหรับกิจกรรมนี้ หรือไม่พบรหัสนักศึกษา');
    return ok(await performCheckIn(id, studentId, body.method, user));
  } catch(e) { return apiError(e); }
}
