import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide an array of students' },
        { status: 400 }
      );
    }

    const event = await DataService.getEventById(id);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const result = await DataService.importStudents(id, students);

    return NextResponse.json({
      success: true,
      message: `นำเข้าสำเร็จ ${result.imported} คน (ผูก Passcode สำเร็จ ${result.assigned} คน)`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to import students' },
      { status: 500 }
    );
  }
}
