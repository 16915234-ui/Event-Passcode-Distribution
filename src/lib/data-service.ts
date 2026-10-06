import { Event, Passcode, Registration, CheckInResponse } from '@/types';
import { getServerSupabaseClient } from './supabase/server';
import { generateTotpSecret, validateTotpToken } from './totp';

// In-memory demo store for when Supabase credentials are not yet configured
interface MockDatabase {
  events: Event[];
  passcodes: Passcode[];
  registrations: Registration[];
}

const mockDb: MockDatabase = {
  events: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Tech & Innovation Day 2026',
      totp_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      created_at: new Date().toISOString(),
    },
  ],
  passcodes: [
    {
      id: 'p1',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-9821',
      assigned_to: '65010001',
      created_at: new Date().toISOString(),
    },
    {
      id: 'p2',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-4712',
      assigned_to: '65010002',
      created_at: new Date().toISOString(),
    },
    {
      id: 'p3',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-6304',
      assigned_to: '65010003',
      created_at: new Date().toISOString(),
    },
    {
      id: 'p4',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-1159',
      assigned_to: '65010004',
      created_at: new Date().toISOString(),
    },
    {
      id: 'p5',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-8823',
      assigned_to: '65010005',
      created_at: new Date().toISOString(),
    },
    {
      id: 'p6',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-5541',
      assigned_to: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p7',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      code_value: 'PASS-TECH-7790',
      assigned_to: null,
      created_at: new Date().toISOString(),
    },
  ],
  registrations: [
    {
      id: 'r1',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: '65010001',
      student_name: 'สมชาย สายเทค',
      is_attended: false,
      check_in_time: null,
      check_in_method: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'r2',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: '65010002',
      student_name: 'สมหญิง รักเรียน',
      is_attended: false,
      check_in_time: null,
      check_in_method: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'r3',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: '65010003',
      student_name: 'กิตติภูมิ พัฒนกิจ',
      is_attended: false,
      check_in_time: null,
      check_in_method: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'r4',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: '65010004',
      student_name: 'วรัญญา โค้ดเก่ง',
      is_attended: false,
      check_in_time: null,
      check_in_method: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'r5',
      event_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: '65010005',
      student_name: 'อั๋น จิรายุทธ',
      is_attended: false,
      check_in_time: null,
      check_in_method: null,
      created_at: new Date().toISOString(),
    },
  ],
};

// Data service operations
export const DataService = {
  async getEvents(): Promise<Event[]> {
    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return [...mockDb.events];
  },

  async getEventById(id: string): Promise<Event | null> {
    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    }
    return mockDb.events.find((e) => e.id === id) || null;
  },

  async createEvent(name: string): Promise<Event> {
    const totp_secret = generateTotpSecret();
    const supabase = getServerSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .insert([{ name, totp_secret }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const newEvent: Event = {
      id: crypto.randomUUID(),
      name,
      totp_secret,
      created_at: new Date().toISOString(),
    };
    mockDb.events.unshift(newEvent);
    return newEvent;
  },

  async deleteEvent(id: string): Promise<boolean> {
    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      return !error;
    }
    mockDb.events = mockDb.events.filter((e) => e.id !== id);
    mockDb.passcodes = mockDb.passcodes.filter((p) => p.event_id !== id);
    mockDb.registrations = mockDb.registrations.filter((r) => r.event_id !== id);
    return true;
  },

  async getRegistrations(eventId: string): Promise<Registration[]> {
    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('student_id', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return mockDb.registrations.filter((r) => r.event_id === eventId);
  },

  async getPasscodes(eventId: string): Promise<Passcode[]> {
    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('passcodes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return mockDb.passcodes.filter((p) => p.event_id === eventId);
  },

  async addPasscodes(eventId: string, codes: string[]): Promise<number> {
    const cleanCodes = codes.map((c) => c.trim()).filter(Boolean);
    if (cleanCodes.length === 0) return 0;

    const supabase = getServerSupabaseClient();
    if (supabase) {
      const records = cleanCodes.map((code_value) => ({
        event_id: eventId,
        code_value,
        assigned_to: null,
      }));
      const { error } = await supabase.from('passcodes').insert(records);
      if (error) throw error;
      return cleanCodes.length;
    }

    cleanCodes.forEach((code_value) => {
      mockDb.passcodes.push({
        id: crypto.randomUUID(),
        event_id: eventId,
        code_value,
        assigned_to: null,
        created_at: new Date().toISOString(),
      });
    });
    return cleanCodes.length;
  },

  /**
   * Pre-registration Logic:
   * 1. Register student in registrations table.
   * 2. Automatically bind available passcode (assigned_to = student_id).
   */
  async importStudents(
    eventId: string,
    students: { student_id: string; student_name: string }[]
  ): Promise<{ imported: number; assigned: number; missingPasscodes: number }> {
    let imported = 0;
    let assigned = 0;

    const supabase = getServerSupabaseClient();

    if (supabase) {
      for (const student of students) {
        const studentId = student.student_id.trim();
        const studentName = student.student_name.trim();
        if (!studentId || !studentName) continue;

        // Upsert student registration
        const { error: regError } = await supabase
          .from('registrations')
          .upsert(
            {
              event_id: eventId,
              student_id: studentId,
              student_name: studentName,
            },
            { onConflict: 'event_id,student_id' }
          );

        if (!regError) {
          imported++;

          // Check if student already has assigned passcode
          const { data: existingPasscode } = await supabase
            .from('passcodes')
            .select('id')
            .eq('event_id', eventId)
            .eq('assigned_to', studentId)
            .maybeSingle();

          if (!existingPasscode) {
            // Pick an available passcode and bind it
            const { data: availablePasscode } = await supabase
              .from('passcodes')
              .select('id')
              .eq('event_id', eventId)
              .is('assigned_to', null)
              .limit(1)
              .maybeSingle();

            if (availablePasscode) {
              await supabase
                .from('passcodes')
                .update({ assigned_to: studentId })
                .eq('id', availablePasscode.id);
              assigned++;
            }
          } else {
            assigned++;
          }
        }
      }

      return {
        imported,
        assigned,
        missingPasscodes: Math.max(0, imported - assigned),
      };
    }

    // Fallback Mock Logic
    for (const student of students) {
      const studentId = student.student_id.trim();
      const studentName = student.student_name.trim();
      if (!studentId || !studentName) continue;

      let reg = mockDb.registrations.find(
        (r) => r.event_id === eventId && r.student_id === studentId
      );
      if (!reg) {
        reg = {
          id: crypto.randomUUID(),
          event_id: eventId,
          student_id: studentId,
          student_name: studentName,
          is_attended: false,
          check_in_time: null,
          check_in_method: null,
          created_at: new Date().toISOString(),
        };
        mockDb.registrations.push(reg);
        imported++;
      }

      let p = mockDb.passcodes.find(
        (p) => p.event_id === eventId && p.assigned_to === studentId
      );
      if (!p) {
        const available = mockDb.passcodes.find(
          (p) => p.event_id === eventId && p.assigned_to === null
        );
        if (available) {
          available.assigned_to = studentId;
          assigned++;
        }
      } else {
        assigned++;
      }
    }

    return {
      imported,
      assigned,
      missingPasscodes: Math.max(0, imported - assigned),
    };
  },

  /**
   * Hybrid Check-in Method 1: Staff Scan
   */
  async checkInStaff(eventId: string, studentId: string): Promise<CheckInResponse> {
    const cleanId = studentId.trim();
    const supabase = getServerSupabaseClient();

    if (supabase) {
      const { data: reg, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', cleanId)
        .maybeSingle();

      if (error || !reg) {
        return {
          success: false,
          message: `ไม่พบข้อมูลนักศึกษารหัส ${cleanId} ในกิจกรรมนี้`,
          error: 'STUDENT_NOT_FOUND',
        };
      }

      // Check if already attended
      if (reg.is_attended) {
        const { data: p } = await supabase
          .from('passcodes')
          .select('code_value')
          .eq('event_id', eventId)
          .eq('assigned_to', cleanId)
          .maybeSingle();

        return {
          success: true,
          message: `นักศึกษา ${reg.student_name} ได้เช็คอินไปแล้วเมื่อ ${new Date(reg.check_in_time).toLocaleTimeString('th-TH')}`,
          alreadyCheckedIn: true,
          registration: reg,
          passcode: p?.code_value || null,
        };
      }

      const now = new Date().toISOString();
      const { data: updatedReg, error: updateError } = await supabase
        .from('registrations')
        .update({
          is_attended: true,
          check_in_time: now,
          check_in_method: 'STAFF_SCAN',
        })
        .eq('id', reg.id)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะเช็คอิน',
          error: updateError.message,
        };
      }

      const { data: p } = await supabase
        .from('passcodes')
        .select('code_value')
        .eq('event_id', eventId)
        .eq('assigned_to', cleanId)
        .maybeSingle();

      return {
        success: true,
        message: `เช็คอินสำเร็จ! ยินดีต้อนรับ ${reg.student_name}`,
        alreadyCheckedIn: false,
        registration: updatedReg,
        passcode: p?.code_value || null,
      };
    }

    // Mock check-in
    const reg = mockDb.registrations.find(
      (r) => r.event_id === eventId && r.student_id === cleanId
    );
    if (!reg) {
      return {
        success: false,
        message: `ไม่พบข้อมูลนักศึกษารหัส ${cleanId} ในกิจกรรมนี้`,
        error: 'STUDENT_NOT_FOUND',
      };
    }

    const p = mockDb.passcodes.find(
      (p) => p.event_id === eventId && p.assigned_to === cleanId
    );

    if (reg.is_attended) {
      return {
        success: true,
        message: `นักศึกษา ${reg.student_name} ได้เช็คอินไปแล้วเมื่อ ${new Date(reg.check_in_time!).toLocaleTimeString('th-TH')}`,
        alreadyCheckedIn: true,
        registration: reg,
        passcode: p?.code_value || null,
      };
    }

    reg.is_attended = true;
    reg.check_in_time = new Date().toISOString();
    reg.check_in_method = 'STAFF_SCAN';

    return {
      success: true,
      message: `เช็คอินสำเร็จ! ยินดีต้อนรับ ${reg.student_name}`,
      alreadyCheckedIn: false,
      registration: { ...reg },
      passcode: p?.code_value || null,
    };
  },

  /**
   * Hybrid Check-in Method 2: Dynamic QR Scan (TOTP)
   */
  async checkInDynamic(
    eventId: string,
    studentId: string,
    totpToken: string
  ): Promise<CheckInResponse> {
    const cleanId = studentId.trim();
    const event = await this.getEventById(eventId);

    if (!event) {
      return {
        success: false,
        message: 'ไม่พบกิจกรรมที่ระบุ',
        error: 'EVENT_NOT_FOUND',
      };
    }

    // Validate TOTP Token with Grace Period (accepts current & previous step)
    const { isValid, delta } = validateTotpToken(event.totp_secret, totpToken);
    if (!isValid) {
      return {
        success: false,
        message: 'QR Code หมดอายุหรือไม่ถูกต้อง กรุณาสแกนใหม่อีกครั้งจากหน้าจอโปรเจคเตอร์',
        error: 'INVALID_OR_EXPIRED_TOTP',
      };
    }

    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data: reg, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', cleanId)
        .maybeSingle();

      if (error || !reg) {
        return {
          success: false,
          message: `ไม่พบรายชื่อรหัสนักศึกษา ${cleanId} ในกิจกรรมนี้`,
          error: 'STUDENT_NOT_FOUND',
        };
      }

      if (reg.is_attended) {
        const { data: p } = await supabase
          .from('passcodes')
          .select('code_value')
          .eq('event_id', eventId)
          .eq('assigned_to', cleanId)
          .maybeSingle();

        return {
          success: true,
          message: `นักศึกษา ${reg.student_name} เช็คอินเรียบร้อยแล้ว`,
          alreadyCheckedIn: true,
          registration: reg,
          passcode: p?.code_value || null,
        };
      }

      const now = new Date().toISOString();
      const { data: updatedReg, error: updateError } = await supabase
        .from('registrations')
        .update({
          is_attended: true,
          check_in_time: now,
          check_in_method: 'DYNAMIC_QR',
        })
        .eq('id', reg.id)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะเช็คอิน',
          error: updateError.message,
        };
      }

      const { data: p } = await supabase
        .from('passcodes')
        .select('code_value')
        .eq('event_id', eventId)
        .eq('assigned_to', cleanId)
        .maybeSingle();

      return {
        success: true,
        message: `เช็คอินผ่าน Dynamic QR สำเร็จ! (รอบเวลา delta: ${delta}) ยินดีต้อนรับ ${reg.student_name}`,
        alreadyCheckedIn: false,
        registration: updatedReg,
        passcode: p?.code_value || null,
      };
    }

    // Mock check-in
    const reg = mockDb.registrations.find(
      (r) => r.event_id === eventId && r.student_id === cleanId
    );
    if (!reg) {
      return {
        success: false,
        message: `ไม่พบรายชื่อรหัสนักศึกษา ${cleanId} ในกิจกรรมนี้`,
        error: 'STUDENT_NOT_FOUND',
      };
    }

    const p = mockDb.passcodes.find(
      (p) => p.event_id === eventId && p.assigned_to === cleanId
    );

    if (reg.is_attended) {
      return {
        success: true,
        message: `นักศึกษา ${reg.student_name} เช็คอินเรียบร้อยแล้ว`,
        alreadyCheckedIn: true,
        registration: reg,
        passcode: p?.code_value || null,
      };
    }

    reg.is_attended = true;
    reg.check_in_time = new Date().toISOString();
    reg.check_in_method = 'DYNAMIC_QR';

    return {
      success: true,
      message: `เช็คอินผ่าน Dynamic QR สำเร็จ! ยินดีต้อนรับ ${reg.student_name}`,
      alreadyCheckedIn: false,
      registration: { ...reg },
      passcode: p?.code_value || null,
    };
  },

  /**
   * Student Status & Passcode Query (with hidden passcode protection)
   */
  async getStudentStatus(
    eventId: string,
    studentId: string
  ): Promise<{
    registration: Registration | null;
    passcode: string | null;
    eventName?: string;
  }> {
    const cleanId = studentId.trim();
    const event = await this.getEventById(eventId);
    const supabase = getServerSupabaseClient();

    if (supabase) {
      const { data: reg } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', cleanId)
        .maybeSingle();

      if (!reg) {
        return { registration: null, passcode: null, eventName: event?.name };
      }

      // Feature: Passcode is only revealed if is_attended is true!
      let passcode: string | null = null;
      if (reg.is_attended) {
        const { data: p } = await supabase
          .from('passcodes')
          .select('code_value')
          .eq('event_id', eventId)
          .eq('assigned_to', cleanId)
          .maybeSingle();
        passcode = p?.code_value || null;
      }

      return {
        registration: reg,
        passcode,
        eventName: event?.name,
      };
    }

    const reg = mockDb.registrations.find(
      (r) => r.event_id === eventId && r.student_id === cleanId
    );
    if (!reg) {
      return { registration: null, passcode: null, eventName: event?.name };
    }

    let passcode: string | null = null;
    if (reg.is_attended) {
      const p = mockDb.passcodes.find(
        (p) => p.event_id === eventId && p.assigned_to === cleanId
      );
      passcode = p?.code_value || null;
    }

    return {
      registration: { ...reg },
      passcode,
      eventName: event?.name,
    };
  },
};
