import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const passcodes = await DataService.getPasscodes(id);
    return NextResponse.json({ success: true, passcodes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch passcodes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { codes, count, prefix } = body;

    let codeList: string[] = [];

    if (Array.isArray(codes) && codes.length > 0) {
      codeList = codes.map((c: string) => c.trim()).filter(Boolean);
    } else if (typeof count === 'number' && count > 0) {
      // Auto-generate random passcodes
      const pfx = (prefix || 'PASS').toUpperCase();
      for (let i = 0; i < Math.min(count, 500); i++) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        codeList.push(`${pfx}-${rand}-${Date.now().toString().slice(-4)}`);
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide either codes array or count to generate' },
        { status: 400 }
      );
    }

    const added = await DataService.addPasscodes(id, codeList);
    return NextResponse.json({
      success: true,
      message: `เพิ่ม Passcode สำเร็จ ${added} รายการ`,
      count: added,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add passcodes' },
      { status: 500 }
    );
  }
}
