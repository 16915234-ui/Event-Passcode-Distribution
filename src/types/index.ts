export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';
export interface Profile { id: string; username: string; role: Role; full_name: string; faculty?: string; major?: string; academic_year?: string; plaintext_password?: string }
export interface Event { id: string; name: string; latitude: number | null; longitude: number | null; radius_meters: number; created_at: string }
export interface Registration { id: string; event_id: string; student_id: string; is_attended: boolean; check_in_time: string | null; check_in_method: 'STAFF_SCAN' | 'DYNAMIC_QR' | 'MANUAL' | null; users?: Profile }
export interface Passcode { id: string; event_id: string; code_value: string; assigned_to: string | null; users?: {username: string} | null }
export interface PageInfo { page: number; pageSize: number; total: number }
export interface EventDetail { event: Event; registrations: Registration[]; passcodes?: Passcode[]; pagination: PageInfo; stats: { totalStudents: number; attendedCount: number; availablePasscodes?: number } }
export interface UserList { users: Profile[]; pagination: PageInfo }
export interface Organization { name: string; majors: string[] }
export interface Settings { organization?: Organization[]; faculties?: string[] }
export interface StudentTicket { event: Event; registration: Registration; passcode: string | null; qr: string }
export interface DynamicQrPayload { e: string; c: string; t: number }
