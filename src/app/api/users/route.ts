import { ApiError, apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { accountEmail, UUID } from '@/lib/validation';
import { paginationOptions } from '@/lib/query-options';
import { accountInput, provisionAccount } from '@/lib/account-provisioning';
export async function GET(r: Request) {
  try {
    const start = performance.now(); await requireUser(['ADMIN']); const authenticated = performance.now();
    const params = new URL(r.url).searchParams;
    const {page, pageSize, from, to, search} = paginationOptions(params);
    const excludeEvent = params.get('excludeEvent');
    if (excludeEvent && !UUID.test(excludeEvent)) throw new ApiError('รหัสกิจกรรมไม่ถูกต้อง');
    const columns = `id,username,full_name,role,faculty,major,academic_year${params.get('picker') === '1' ? '' : ',plaintext_password'}${excludeEvent ? ',registrations:event_registrations!student_id(event_id)' : ''}`;
    let query = getServerSupabaseClient().from('users').select(columns, {count: 'exact'}).order('username').order('id').range(from, to);
    if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
    for (const key of ['faculty','major','academic_year','role']) { const value = params.get(key); if (value) query = query.eq(key, value); }
    if (excludeEvent) query = query.eq('registrations.event_id', excludeEvent).is('registrations', null);
    const {data,error,count} = await query; if(error) throw error;
    return ok({users:data,pagination:{page,pageSize,total:count || 0}}, {auth:authenticated-start,database:performance.now()-authenticated});
  } catch(e) { return apiError(e); }
}
export async function POST(r: Request) {
  try {
    await requireUser(['ADMIN']);
    const input = accountInput(await bodyOf(r));
    const result = await provisionAccount(getServerSupabaseClient(), input);
    return ok({message: result.recovered ? 'เชื่อมบัญชีเดิมกับ public.users แล้ว ใช้รหัสผ่านเดิมเพื่อเข้าสู่ระบบ หากจำไม่ได้ให้เลือก “เปลี่ยนรหัส”' : 'สร้างบัญชีและข้อมูลสิทธิ์เรียบร้อยแล้ว', recovered: result.recovered});
  } catch(e) { return apiError(e); }
}
export async function PATCH(r:Request) {try{await requireUser(['ADMIN']);const b=await bodyOf(r);if(typeof b.id!=='string'||!UUID.test(b.id)||typeof b.password!=='string'||!b.password)throw new ApiError('กรุณากรอกรหัสผ่าน');const db=getServerSupabaseClient();const profile=await db.from('users').select('role').eq('id',b.id).single();if(profile.error||!profile.data||profile.data.role==='ADMIN')throw new ApiError('รีเซ็ตได้เฉพาะบัญชีนักศึกษาและทีมงาน',403);const {error}=await db.auth.admin.updateUserById(b.id,{password:b.password});if(error)throw error;await db.from('users').update({plaintext_password:b.password}).eq('id',b.id);return ok({message:'เปลี่ยนรหัสผ่านแล้ว'});}catch(e){return apiError(e);}}

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
      username: b.username,
      full_name: b.full_name,
      faculty: b.faculty,
      major: b.major,
      academic_year: b.academic_year,
      ...(b.password ? { plaintext_password: b.password } : {})
    }).eq('id', b.id);
    if (err1) throw err1;
    
    // Update auth.users metadata and email
    const updateData: { app_metadata: Record<string, unknown>; email: string; email_confirm: boolean; password?: string } = {
      app_metadata: { username: b.username, full_name: b.full_name, faculty: b.faculty, major: b.major, academic_year: b.academic_year },
      email: accountEmail(b.username),
      email_confirm: true
    };
    if (b.password) updateData.password = b.password;
    if (b.password) updateData.app_metadata.plaintext_password = b.password;
    
    const { error: err2 } = await db.auth.admin.updateUserById(b.id, updateData);
    if (err2) throw err2;
    
    return ok({ message: 'อัปเดตข้อมูลผู้ใช้แล้ว' });
  } catch (e) {
    return apiError(e);
  }
}
