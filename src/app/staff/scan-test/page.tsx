'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/feedback';
import { Play, Pause, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function ScanTestPage() {
  const [active, setActive] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [speed, setSpeed] = useState(2000);
  const [staticTest, setStaticTest] = useState(false);

  const generateCodes = () => {
    if (staticTest) {
      setCodes(['ARUTEST:SUCCESS']);
      return;
    }
    const newCodes = Array.from({ length: 6 }).map(() => {
      // Generate a mock QR payload similar to real ones: aru:eventid:studentid:signature
      const rnd = Math.random().toString(36).substring(2, 10);
      return `aru:test-event:test-student-${rnd}:mock-signature`;
    });
    setCodes(newCodes);
  };

  useEffect(() => {
    generateCodes();
  }, [staticTest]);

  useEffect(() => {
    if (!active || staticTest) return;
    const interval = setInterval(() => {
      generateCodes();
    }, speed);
    return () => clearInterval(interval);
  }, [active, speed, staticTest]);

  return (
    <>
      <PageHeading eyebrow="Staff Testing" title="ทดสอบความเร็วเครื่องสแกน" description="หน้าสำหรับทดสอบประสิทธิภาพและมุมรับภาพของเครื่องสแกน QR Code ทีมงาน" />
      
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
        <Button onClick={() => { setStaticTest(false); setActive(!active); }} variant={active && !staticTest ? 'outline' : 'default'} disabled={staticTest}>
          {active && !staticTest ? <><Pause className="mr-2 h-4 w-4" /> หยุดสุ่มอัตโนมัติ</> : <><Play className="mr-2 h-4 w-4" /> เริ่มสุ่มอัตโนมัติ</>}
        </Button>
        
        <Button onClick={() => { setStaticTest(false); setActive(false); setTimeout(generateCodes, 0); }} variant="outline" disabled={active && !staticTest}>
          <RefreshCw className="mr-2 h-4 w-4" /> สุ่มรหัสใหม่เดี๋ยวนี้
        </Button>

        <Button onClick={() => { setStaticTest(true); setActive(false); }} variant={staticTest ? 'default' : 'secondary'}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> แสดง QR ทดสอบสแกนสำเร็จ
        </Button>
        
        <div className="flex items-center gap-2 border-l pl-4">
          <label className="text-sm font-medium">ความเร็ว (ms):</label>
          <select 
            value={speed} 
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-md border p-1 text-sm"
            disabled={active}
          >
            <option value={1000}>1000 ms (เร็วมาก)</option>
            <option value={2000}>2000 ms (เร็ว)</option>
            <option value={3000}>3000 ms (ปานกลาง)</option>
            <option value={5000}>5000 ms (ช้า)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {codes.map((code, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center rounded-xl border bg-white p-6 shadow-sm">
            <QRCodeSVG value={code} size={150} level="M" />
            <p className="mt-4 break-all text-center text-[10px] text-muted-foreground">{code}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>เปิดหน้านี้บนคอมพิวเตอร์หรือแท็บเล็ต แล้วใช้โทรศัพท์ของทีมงานในหน้า "เช็คอินหน้างาน" สแกนรหัสที่ปรากฏ</p>
        <p>หากเครื่องสแกนอ่านได้ จะมีเสียงแจ้งเตือน (รหัสทดสอบจะแจ้งว่า "ไม่พบรายชื่อในกิจกรรมนี้" หรือ "รหัสไม่ถูกต้อง" ซึ่งถือว่าสแกนติดแล้ว)</p>
      </div>
    </>
  );
}
