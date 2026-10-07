import 'server-only';
import { getServerSupabaseClient } from './supabase/server';
import { ApiError } from './auth';
import { generateTotpSecret } from './totp';
import { studentQr } from './static-qr';
import { UUID, USERNAME, validCoordinates } from './validation';
import type { Profile, Event } from '@/types';
import { eventQueryOptions } from './query-options';
import { accountInput, provisionAccount } from './account-provisioning';
export const EVENT_COLUMNS = 'id,name,latitude,longitude,radius_meters,created_at';
export function eventId(id: unknown): string { if (typeof id !== 'string' || !UUID.test(id)) throw new ApiError('รหัสกิจกรรมไม่ถูกต้อง'); return id; }
export async function getEvent(id: string): Promise<Event> {
  const { data, error } = await getServerSupabaseClient().from('events').select(EVENT_COLUMNS).eq('id', eventId(id)).maybeSingle();
  if (error) throw error; if (!data) throw new ApiError('ไม่พบกิจกรรม', 404); return data;
}
export async function listEvents(user: Profile) {
  const db = getServerSupabaseClient();
  if (user.role === 'STUDENT') {
    const { data, error } = await db.from('events').select(`${EVENT_COLUMNS},event_registrations!inner(student_id)`).eq('event_registrations.student_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(({ event_registrations: _registration, ...event }) => { void _registration; return event; });
  }
  const query = db.from('events').select(EVENT_COLUMNS).order('created_at', { ascending: false });
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
export async function eventDetail(id: string, user: Profile, options = eventQueryOptions(new URLSearchParams())) {
  eventId(id);
  const db = getServerSupabaseClient();
  if (options.view === 'codes' && user.role !== 'ADMIN') throw new ApiError('ไม่มีสิทธิ์เข้าถึง Passcode', 403);
  let roster = db.from('event_registrations').select('id,event_id,student_id,is_attended,check_in_time,check_in_method,users!student_id!inner(id,username,full_name,role)', { count: 'exact' }).eq('event_id', id).order('created_at').order('id').range(options.from, options.to);
  if (options.search) roster = roster.or(`username.ilike.%${options.search}%,full_name.ilike.%${options.search}%`, { referencedTable: 'users' });
  // Independent reads run concurrently; count on the database, not on a truncated browser list.
  const [event, total, attended, available, registrations, codes] = await Promise.all([
    getEvent(id),
    db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', id),
    db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('is_attended', true),
    user.role === 'ADMIN' ? db.from('passcodes').select('id', { count: 'exact', head: true }).eq('event_id', id).is('assigned_to', null) : null,
    options.view === 'roster' ? roster : null,
    options.view === 'codes' ? db.from('passcodes').select('id,event_id,code_value,assigned_to,users!assigned_to(username)', { count: 'exact' }).eq('event_id', id).order('created_at').order('id').range(options.from, options.to) : null,
  ]);
  for (const result of [total, attended, available, registrations, codes]) if (result?.error) throw result.error;
  return { event, registrations: registrations?.data || [], ...(codes ? { passcodes: codes.data || [] } : {}), stats: { totalStudents: total.count || 0, attendedCount: attended.count || 0, ...(available ? { availablePasscodes: available.count || 0 } : {}) }, pagination: { page: options.page, pageSize: options.pageSize, total: registrations?.count ?? codes?.count ?? 0 } };
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
  for (const student of students) {
    const result = await provisionAccount(db, accountInput({...student, role:'STUDENT'}), 'import');
    ids.push(result.id);
  }
  const { data, error } = await db.rpc('allocate_students', { p_event: id, p_students: ids });
  if (error) { if (error.message.includes('INSUFFICIENT_PASSCODES')) throw new ApiError('Passcode ไม่พอ ยังไม่ได้เพิ่มรายชื่อเข้ากิจกรรม เติมรหัสแล้วนำเข้าอีกครั้งได้ บัญชีที่สร้างแล้วจะใช้รหัสผ่านเดิม', 409); throw error; }
  return { imported: data, message: `จัดสรรรายชื่อและผูก Passcode สำเร็จ ${data} คน` };
}

export async function allocateExistingStudents(id: string, userIds?: string[], usernames?: string[]) {
  const db = getServerSupabaseClient();
  let studentIds: string[] = userIds || [];
  
  if (usernames && usernames.length > 0) {
    if (usernames.length > 200) throw new ApiError('จำกัด 200 คนต่อครั้ง');
    const lowerUsernames = usernames.map(u => String(u).toLowerCase());
    const { data } = await db.from('users').select('id, username').in('username', lowerUsernames).eq('role', 'STUDENT');
    const validIds = (data || []).map(u => u.id);
    if (validIds.length === 0) throw new ApiError('ไม่พบรหัสนักศึกษาที่ระบุในระบบ กรุณาเพิ่มนักศึกษาเข้าสู่ระบบก่อน');
    studentIds = [...studentIds, ...validIds];
  }
  
  const uniqueIds = Array.from(new Set(studentIds));

  if (!uniqueIds.length || uniqueIds.length > 200) throw new ApiError('เลือกเพิ่มครั้งละ 1-200 คน');
  await getEvent(id);
  const { data, error } = await db.rpc('allocate_students', { p_event: id, p_students: uniqueIds });
  if (error) {
    if (error.message.includes('INSUFFICIENT_PASSCODES')) throw new ApiError('Passcode ไม่พอ กรุณาเพิ่มในคลัง Passcode ก่อน', 409);
    throw error;
  }
  return { imported: data, message: `เพิ่มรายชื่อเข้ากิจกรรมและผูก Passcode สำเร็จ ${data} คน` };
}
