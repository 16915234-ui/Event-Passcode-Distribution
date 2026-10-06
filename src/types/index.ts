export interface Event {
  id: string;
  name: string;
  totp_secret: string;
  created_at: string;
}

export interface Passcode {
  id: string;
  event_id: string;
  code_value: string;
  assigned_to: string | null;
  created_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  student_id: string;
  student_name: string;
  is_attended: boolean;
  check_in_time: string | null;
  check_in_method: 'STAFF_SCAN' | 'DYNAMIC_QR' | null;
  created_at: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  alreadyCheckedIn?: boolean;
  registration?: Registration;
  passcode?: string | null;
  error?: string;
}

export interface DynamicQrPayload {
  e: string;      // eventId
  c: string;      // 6-digit TOTP code
  t: number;      // timestamp in seconds
}
