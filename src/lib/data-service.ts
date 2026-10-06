import 'server-only';
import { getServerSupabaseClient } from './supabase/server';
import { ApiError } from './auth';
import { generateTotpSecret } from './totp';
import { studentQr } from './static-qr';
import { UUID, USERNAME, accountEmail, validCoordinates } from './validation';
import type { Profile, Event } from '@/types';
export const EVENT_COLUMNS = 'id,name,latitude,longitude,radius_meters,created_at';
export function eventId(id: unknown): string { if (typeof id !== 'string' || !UUID.test(id)) throw new ApiError('รหัสกิจกรรมไม่ถูกต้อง'); return id; }
export async function getEvent(id: string): Promise<Event> {
  const { data, error } = await getServerSupabaseClient().from('events').select(EVENT_COLUMNS).eq('id', eventId(id)).maybeSingle();
  if (error) throw error; if (!data) throw new ApiError('ไม่พบกิจกรรม', 404); return data;
}
export async function listEvents(user: Profile) {
  const db = getServerSupabaseClient();
  let query = db.from('events').select(EVENT_COLUMNS).order('created_at', { ascending: false });
  if (user.role === 'STUDENT') {
    const { data, error } = await db.from('event_registrations').select('event_id').eq('student_id', user.id);
    if (error) throw error; query = query.in('id', (data || []).map(r => r.event_id));
  }
  const { data, error } = await query; if (error) throw error; return data || [];
}
export function eventInput(body: Record<string, unknown>) {
  const { name, latitude, longitude, radius_meters } = body;
  if (typeof name !== 'string' || !name.trim() || name.length > 200 || !validCoordinates(latitude, longitude) || !Number.isInteger(radius_meters) || Number(radius_meters) < 10 || Number(radius_meters) > 5000) throw new ApiError('กรุณาระบุชื่อ พิกัดที่ถูกต้อง และรัศมี 10–5,000 เมตร');
  return { name: name.trim(), latitude: latitude as number, longitude: longitude as number, radius_meters: radius_meters as number };
}
export async function saveEvent(body: Record<string, unknown>, id?: string) {
  const db = getServerSupabaseClient(); const values = eventInput(body);
  const query = id ? db.from('events').update(values).eq('id', eventId(id)) : db.from('events').insert({ ...values, totp_secret: generateTotpSecret() });
  const { data, error } = await query.select(EVENT_COLUMNS).single(); if (error) throw error; return data;
}
export async function eventDetail(id: string, user: Profile) {
  const event = await getEvent(id); const db = getServerSupabaseClient();
  const { data: registrations, error } = await db.from('event_registrations').select('*,users!student_id(id,username,full_name,role)').eq('event_id', id).order('created_at');
  if (error) throw error;
  let passcodes;
  if (user.role === 'ADMIN') { const result = await db.from('passcodes').select('*').eq('event_id', id); if (result.error) throw result.error; passcodes = result.data; }
  return { event, registrations, ...(passcodes ? { passcodes } : {}), stats: { totalStudents: registrations.length, attendedCount: registrations.filter(r => r.is_attended).length, ...(passcodes ? { availablePasscodes: passcodes.filter(p => !p.assigned_to).length } : {}) } };
}
export async function getTicket(id: string, studentId: string) {
  const db = getServerSupabaseClient();
  const { data: registration, error } = await db.from('event_registrations').select('*').eq('event_id', eventId(id)).eq('student_id', studentId).maybeSingle();
  if (error) throw error; if (!registration) throw new ApiError('คุณไม่มีรายชื่อในกิจกรรมนี้', 404);
  let passcode: string | null = null;
  if (registration.is_attended) { const result = await db.from('passcodes').select('code_value').eq('event_id', id).eq('assigned_to', studentId).maybeSingle(); if (result.error) throw result.error; passcode = result.data?.code_value || null; }
  return { event: await getEvent(id), registration, passcode, qr: studentQr(id, studentId) };
}
export async function performCheckIn(id: string, studentId: string, method: string, actor: Profile) {
  const { data, error } = await getServerSupabaseClient().rpc('check_in_student', { p_event: eventId(id), p_student: studentId, p_method: method, p_actor: actor.id });
  if (error) { if (error.message.includes('STUDENT_NOT_FOUND')) throw new ApiError('ไม่พบรายชื่อในกิจกรรมนี้', 404); throw error; }
  return { ...data, message: data.alreadyCheckedIn ? 'นักศึกษาเช็คอินเรียบร้อยแล้ว' : 'เช็คอินสำเร็จ นักศึกษาสามารถดู Passcode ได้แล้ว' };
}
export interface ImportStudent { username: string; full_name: string; password: string; faculty?: string; major?: string; academic_year?: string }
export function validateStudents(value: unknown): ImportStudent[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new ApiError('นำเข้าครั้งละ 1–100 คน');
  const seen = new Set<string>();
  return value.map((s, i) => {
    if (!s || typeof s.username !== 'string' || !USERNAME.test(s.username) || typeof s.full_name !== 'string' || !s.full_name.trim() || s.full_name.length > 200 || typeof s.password !== 'string' || !s.password) throw new ApiError(`แถว ${i+1}: กรุณาตรวจสอบข้อมูลให้ครบถ้วน`);
    const username = s.username.toLowerCase(); if (seen.has(username)) throw new ApiError(`รหัส ${username} ซ้ำในไฟล์`); seen.add(username);
    return { username, full_name: s.full_name.trim(), password: s.password, faculty: s.faculty, major: s.major, academic_year: s.academic_year };
  });
}
export async function importStudents(id: string, value: unknown) {
  const students = validateStudents(value); await getEvent(id); const db = getServerSupabaseClient();
  const ids: string[] = [];
  for (const s of students) {
    const { data: existing, error: lookupError } = await db.from('users').select('id,role').eq('username', s.username).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) { if (existing.role !== 'STUDENT') throw new ApiError(`${s.username} เป็นบัญชีบุคลากร`); ids.push(existing.id); continue; }
    const { data, error } = await db.auth.admin.createUser({ email: accountEmail(s.username), password: s.password, email_confirm: true, app_metadata: { aru_provisioned: true, username: s.username, full_name: s.full_name, role: 'STUDENT', faculty: s.faculty, major: s.major, academic_year: s.academic_year, plaintext_password: s.password } });
    if (error) {
      // A simultaneous import may have created this account. Do not reset its password.
      const retry = await db.from('users').select('id,role').eq('username', s.username).maybeSingle();
      if (retry.data?.role === 'STUDENT') { ids.push(retry.data.id); continue; }
      throw new ApiError(`สร้างบัญชี ${s.username} ไม่สำเร็จ: ${error.message}`, 409);
    }
    ids.push(data.user.id);
  }
  const { data, error } = await db.rpc('allocate_students', { p_event: id, p_students: ids });
  if (error) { if (error.message.includes('INSUFFICIENT_PASSCODES')) throw new ApiError('Passcode ไม่พอ ยังไม่ได้เพิ่มรายชื่อเข้ากิจกรรม เติมรหัสแล้วนำเข้าอีกครั้งได้ บัญชีที่สร้างแล้วจะใช้รหัสผ่านเดิม', 409); throw error; }
  return { imported: data, message: `จัดสรรรายชื่อและผูก Passcode สำเร็จ ${data} คน` };
}

export async function allocateExistingStudents(id: string, studentIds: string[]) {
  if (!Array.isArray(studentIds) || !studentIds.length || studentIds.length > 100) throw new ApiError('เลือกเพิ่มครั้งละ 1-100 คน');
  await getEvent(id);
  const db = getServerSupabaseClient();
  const { data, error } = await db.rpc('allocate_students', { p_event: id, p_students: studentIds });
  if (error) {
    if (error.message.includes('INSUFFICIENT_PASSCODES')) throw new ApiError('Passcode ไม่พอ กรุณาเพิ่มในคลัง Passcode ก่อน', 409);
    throw error;
  }
  return { imported: data, message: `เพิ่มรายชื่อเข้ากิจกรรมและผูก Passcode สำเร็จ ${data} คน` };
}
