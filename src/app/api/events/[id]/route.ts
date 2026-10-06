import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await DataService.getEventById(id);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const registrations = await DataService.getRegistrations(id);
    const passcodes = await DataService.getPasscodes(id);

    const totalStudents = registrations.length;
    const attendedCount = registrations.filter((r) => r.is_attended).length;
    const totalPasscodes = passcodes.length;
    const assignedPasscodes = passcodes.filter((p) => p.assigned_to !== null).length;
    const availablePasscodes = totalPasscodes - assignedPasscodes;

    return NextResponse.json({
      success: true,
      event,
      stats: {
        totalStudents,
        attendedCount,
        attendanceRate: totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0,
        totalPasscodes,
        assignedPasscodes,
        availablePasscodes,
      },
      registrations,
      passcodes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch event details' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await DataService.deleteEvent(id);
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}
