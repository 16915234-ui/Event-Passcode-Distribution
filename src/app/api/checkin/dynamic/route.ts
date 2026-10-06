import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, studentId, token } = body;

    if (!eventId || !studentId || !token) {
      return NextResponse.json(
        { success: false, error: 'eventId, studentId และ token จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const result = await DataService.checkInDynamic(eventId, studentId, String(token).trim());
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Dynamic check-in failed' },
      { status: 500 }
    );
  }
}
