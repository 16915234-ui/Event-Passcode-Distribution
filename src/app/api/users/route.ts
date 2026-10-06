import { ApiError, apiError, bodyOf, ok, requireUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { accountEmail, USERNAME, UUID } from '@/lib/validation';
export async function GET(r:Request) {try{await requireUser(['ADMIN']);const search=new URL(r.url).searchParams.get('q')?.trim()||'';let query=getServerSupabaseClient().from('users').select('id,username,full_name,role,faculty,major,academic_year,plaintext_password').order('username').limit(100);if(search)query=query.ilike('username',`%${search.replace(/[%_]/g,'')}%`);const {data,error}=await query;if(error)throw error;return ok({users:data});}catch(e){return apiError(e);}}
export async function POST(r:Request) {try{await requireUser(['ADMIN']);const b=await bodyOf(r);if(typeof b.username!=='string'||!USERNAME.test(b.username)||typeof b.full_name!=='string'||!b.full_name.trim()||typeof b.password!=='string'||!b.password||!['STUDENT','STAFF'].includes(b.role))throw new ApiError('กรุณาตรวจสอบข้อมูลให้ครบถ้วน');const {error}=await getServerSupabaseClient().auth.admin.createUser({email:accountEmail(b.username),password:b.password,email_confirm:true,app_metadata:{aru_provisioned:true,username:b.username.toLowerCase(),full_name:b.full_name.trim(),role:b.role,faculty:b.faculty,major:b.major,academic_year:b.academic_year,plaintext_password:b.password}});if(error)throw new ApiError(`สร้างบัญชีไม่สำเร็จ: ${error.message}`,409);return ok({message:'สร้างบัญชีแล้ว'});}catch(e){return apiError(e);}}
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
    const updateData: any = {
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
