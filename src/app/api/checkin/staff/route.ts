import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, studentId } = body;

    if (!eventId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'eventId และ studentId จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const result = await DataService.checkInStaff(eventId, studentId);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Staff check-in failed' },
      { status: 500 }
    );
  }
}
