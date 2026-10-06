import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const studentId = searchParams.get('studentId');

    if (!eventId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'eventId และ studentId จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const data = await DataService.getStudentStatus(eventId, studentId);
    if (!data.registration) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสนักศึกษานี้ในกิจกรรม' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Status query failed' },
      { status: 500 }
    );
  }
}
