import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET() {
  try {
    const events = await DataService.getEvents();
    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Event name is required' },
        { status: 400 }
      );
    }

    const event = await DataService.createEvent(name.trim());
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}
