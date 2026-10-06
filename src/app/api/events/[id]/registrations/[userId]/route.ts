
import { apiError, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(r: Request, c: { params: Promise<{ id: string, userId: string }> }) {
  try {
    await requireUser(['ADMIN']);
    const { id, userId } = await c.params;
    const db = getServerSupabaseClient();
    // Also free up the passcode assigned
    await db.from('passcodes').update({ assigned_to: null }).eq('event_id', id).eq('assigned_to', userId);
    const { error } = await db.from('event_registrations').delete().eq('event_id', id).eq('student_id', userId);
    if (error) throw error;
    return ok({ message: 'ลบนักศึกษาออกจากกิจกรรมแล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
