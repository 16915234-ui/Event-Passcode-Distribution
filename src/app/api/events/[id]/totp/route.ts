import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';
import { generateTotpToken, getTotpCycleInfo, TOTP_STEP_SECONDS } from '@/lib/totp';

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

    const token = generateTotpToken(event.totp_secret);
    const cycle = getTotpCycleInfo();

    return NextResponse.json({
      success: true,
      token,
      stepSeconds: TOTP_STEP_SECONDS,
      ...cycle,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate TOTP' },
      { status: 500 }
    );
  }
}
