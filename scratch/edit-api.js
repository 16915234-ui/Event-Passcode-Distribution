const fs = require('fs');

// 1. Delete Event
let eventRoute = fs.readFileSync('src/app/api/events/[id]/route.ts', 'utf-8');
if (!eventRoute.includes('export async function DELETE')) {
  eventRoute += `
export async function DELETE(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(['ADMIN']);
    const id = (await c.params).id;
    const db = getServerSupabaseClient();
    const { error } = await db.from('events').delete().eq('id', id);
    if (error) throw error;
    return ok({ message: 'ลบกิจกรรมแล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
`;
  fs.writeFileSync('src/app/api/events/[id]/route.ts', eventRoute);
}

// 2. Remove student from event
fs.mkdirSync('src/app/api/events/[id]/registrations/[userId]', { recursive: true });
fs.writeFileSync('src/app/api/events/[id]/registrations/[userId]/route.ts', `
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
`);

// 3. Edit and Delete User
let userRoute = fs.readFileSync('src/app/api/users/route.ts', 'utf-8');
if (!userRoute.includes('export async function DELETE')) {
  userRoute += `
export async function DELETE(r: Request) {
  try {
    await requireUser(['ADMIN']);
    const search = new URL(r.url).searchParams.get('id');
    if (!search) throw new Error('No ID');
    const db = getServerSupabaseClient();
    const { error } = await db.auth.admin.deleteUser(search);
    if (error) throw error;
    return ok({ message: 'ลบบัญชีผู้ใช้แล้ว' });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(r: Request) {
  try {
    await requireUser(['ADMIN']);
    const b = await r.json();
    const db = getServerSupabaseClient();
    
    // Update public.users
    const { error: err1 } = await db.from('users').update({
      full_name: b.full_name,
      faculty: b.faculty,
      major: b.major,
      academic_year: b.academic_year
    }).eq('id', b.id);
    if (err1) throw err1;
    
    // Update auth.users metadata
    const { error: err2 } = await db.auth.admin.updateUserById(b.id, {
      app_metadata: { full_name: b.full_name, faculty: b.faculty, major: b.major, academic_year: b.academic_year }
    });
    if (err2) throw err2;
    
    return ok({ message: 'อัปเดตข้อมูลผู้ใช้แล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
`;
  fs.writeFileSync('src/app/api/users/route.ts', userRoute);
}

console.log('APIs updated');
