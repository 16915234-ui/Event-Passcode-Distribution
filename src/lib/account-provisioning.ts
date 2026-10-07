import type { SupabaseClient, User } from '@supabase/supabase-js';
import { accountEmail, USERNAME } from './validation';

export class ProvisioningError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export interface AccountInput {
  username: string;
  password: string;
  full_name: string;
  role: 'STUDENT' | 'STAFF';
  faculty?: string;
  major?: string;
  academic_year?: string;
}
type AccountProfile = { id: string; username: string; role: string };
const columns = 'id,username,role';

export function accountInput(value: Record<string, unknown>): AccountInput {
  if (typeof value.username !== 'string' || !USERNAME.test(value.username.trim()) || value.username.trim().length > 100 || typeof value.password !== 'string' || !value.password || value.password.length > 128 || typeof value.full_name !== 'string' || !value.full_name.trim() || value.full_name.length > 200 || !['STUDENT','STAFF'].includes(String(value.role))) {
    throw new ProvisioningError('กรุณาตรวจสอบรหัสผู้ใช้ ชื่อ รหัสผ่าน และสิทธิ์ให้ถูกต้อง', 400);
  }
  const optional = (key: string) => {
    const v = value[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string' || v.length > 200) throw new ProvisioningError('ข้อมูลคณะ สาขา หรือชั้นปีไม่ถูกต้อง', 400);
    return v.trim();
  };
  return {username:value.username.trim().toLowerCase(),password:value.password,full_name:value.full_name.trim(),role:value.role as AccountInput['role'],faculty:optional('faculty'),major:optional('major'),academic_year:optional('academic_year')};
}

// Only called by administrator-authorized routes. Never infer a role during login.
export async function provisionAccount(db: SupabaseClient, input: AccountInput, mode: 'create' | 'import' = 'create') {
  const profiles = () => db.schema('public').from('users');
  const lookup = async (key: 'username' | 'id', value: string): Promise<AccountProfile | null> => {
    const result = await profiles().select(columns).eq(key,value).maybeSingle();
    if (result.error) throw result.error;
    return result.data as AccountProfile | null;
  };
  const existing = await lookup('username',input.username);
  if (existing) {
    if (existing.role !== input.role) throw new ProvisioningError('รหัสผู้ใช้นี้ถูกใช้โดยบัญชีสิทธิ์อื่นแล้ว ไม่ได้เปลี่ยนสิทธิ์เดิม');
    const account = await db.auth.admin.getUserById(existing.id);
    if (account.error?.code === 'user_not_found' || !account.error && !account.data.user) throw new ProvisioningError('รายชื่อใน public.users ยังไม่เชื่อมกับบัญชีเข้าสู่ระบบ กรุณาติดต่อผู้ดูแลเพื่อซ่อมการเชื่อมโยง');
    if (account.error) throw account.error;
    if (mode === 'import') return {id:existing.id,recovered:false,existing:true};
    throw new ProvisioningError('มีบัญชีนี้พร้อมใช้งานแล้ว หากลืมรหัสผ่านให้เลือก “เปลี่ยนรหัส” ในรายชื่อผู้ใช้');
  }

  const email = accountEmail(input.username);
  const created = await db.auth.admin.createUser({email,password:input.password,email_confirm:true,app_metadata:{aru_provisioned:true,username:input.username,full_name:input.full_name,role:input.role,faculty:input.faculty,major:input.major,academic_year:input.academic_year}});
  let account = created.data.user;
  let recovered = false;
  if (created.error) {
    if (!['email_exists','user_already_exists'].includes(created.error.code || '')) throw new ProvisioningError(`สร้างบัญชีไม่สำเร็จ: ${created.error.message}`);
    // GoTrue has no email-filtered admin lookup. Scan only on the recovery path,
    // paginate fully, and match the exact internal address plus trusted metadata.
    account = null;
    for (let page=1;;page++) {
      const result = await db.auth.admin.listUsers({page,perPage:1000});
      if (result.error) throw result.error;
      account = result.data.users.find((user: User) => user.email?.toLowerCase() === email) || null;
      if (account || result.data.users.length < 1000) break;
    }
    if (!account || account.app_metadata.aru_provisioned !== true || account.app_metadata.username !== input.username || account.app_metadata.role !== input.role) throw new ProvisioningError('อีเมลนี้มีบัญชีเดิมที่ข้อมูลไม่ตรงกัน กรุณาตรวจสอบบัญชีเดิมก่อนเชื่อมสิทธิ์');
    recovered = true;
  }
  if (!account) throw new ProvisioningError('ไม่พบบัญชีเข้าสู่ระบบหลังสร้าง กรุณาลองใหม่');

  const assertLink = (profile: AccountProfile) => {
    if (profile.id !== account.id || profile.username !== input.username || profile.role !== input.role) throw new ProvisioningError('ข้อมูลบัญชีและสิทธิ์เดิมไม่ตรงกัน ไม่ได้เขียนทับบัญชีเดิม');
  };
  // Works both with and without a provision trigger installed in the database.
  const linked = await lookup('id',account.id);
  if (linked) assertLink(linked);
  else {
    const {error} = await profiles().insert({id:account.id,username:input.username,full_name:input.full_name,role:input.role,faculty:input.faculty,major:input.major,academic_year:input.academic_year,...(!recovered?{plaintext_password:input.password}:{})});
    if (error) {
      if (error.code !== '23505') throw new ProvisioningError('สร้างบัญชีเข้าสู่ระบบแล้ว แต่บันทึก public.users ไม่สำเร็จ กรุณาลองสร้างรหัสเดิมอีกครั้งเพื่อเชื่อมข้อมูล');
      const concurrent = await lookup('username',input.username);
      if (!concurrent) throw new ProvisioningError('เชื่อมข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองใหม่');
      assertLink(concurrent);
    }
  }
  const verified = await lookup('id',account.id);
  if (!verified) throw new ProvisioningError('ยังไม่พบข้อมูลสิทธิ์ใน public.users กรุณาลองใหม่');
  assertLink(verified);
  return {id:account.id,recovered,existing:false};
}
