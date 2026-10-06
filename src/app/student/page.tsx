'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import QrCodeDisplay from '@/components/QrCodeDisplay';
import QrScannerModal from '@/components/QrScannerModal';
import {
  Ticket,
  Camera,
  Lock,
  Unlock,
  Copy,
  Check,
  Sparkles,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { playSuccessChime, playErrorBuzz } from '@/lib/audio';
import { Event, Registration } from '@/types';

function StudentTicketContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get('event') || '';
  const urlStudentId = searchParams.get('id') || '';

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId);
  const [studentIdInput, setStudentIdInput] = useState<string>(urlStudentId || '65010001');
  const [activeStudentId, setActiveStudentId] = useState<string>(urlStudentId || '65010001');

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all events on load
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events && data.events.length > 0) {
          setEvents(data.events);
          if (!selectedEventId) {
            setSelectedEventId(data.events[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [selectedEventId]);

  // Fetch Student Status & Passcode
  const fetchStudentStatus = useCallback(async (eventId: string, sId: string) => {
    if (!eventId || !sId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkin/status?eventId=${eventId}&studentId=${sId}`);
      const data = await res.json();
      if (data.success && data.registration) {
        setRegistration(data.registration);
        setPasscode(data.passcode || null);
        if (data.eventName) setEventName(data.eventName);
      } else {
        setRegistration(null);
        setPasscode(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId && activeStudentId) {
      fetchStudentStatus(selectedEventId, activeStudentId);
    }
  }, [selectedEventId, activeStudentId, fetchStudentStatus]);

  // Supabase Realtime Subscription for instant unlock!
  useEffect(() => {
    if (!selectedEventId || !activeStudentId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // In demo mode without Supabase credentials, fallback to polling every 2.5s
      const pollTimer = setInterval(() => {
        fetchStudentStatus(selectedEventId, activeStudentId);
      }, 2500);
      return () => clearInterval(pollTimer);
    }

    const channel = supabase
      .channel(`student-ticket-${selectedEventId}-${activeStudentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registrations',
          filter: `student_id=eq.${activeStudentId}`,
        },
        async (payload) => {
          const updated = payload.new as Registration;
          if (updated && updated.event_id === selectedEventId) {
            setRegistration(updated);

            if (updated.is_attended && !registration?.is_attended) {
              // Trigger celebration effects!
              playSuccessChime();
              confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
              });

              // Re-fetch to reveal the unlocked passcode from DB
              const res = await fetch(
                `/api/checkin/status?eventId=${selectedEventId}&studentId=${activeStudentId}`
              );
              const data = await res.json();
              if (data.passcode) {
                setPasscode(data.passcode);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEventId, activeStudentId, registration?.is_attended, fetchStudentStatus]);

  // Handle Scanning Dynamic QR on Projector Screen
  const handleDynamicQrScanned = async (decodedText: string) => {
    setIsScannerOpen(false);
    setScanMessage(null);

    let token = '';
    let eventId = selectedEventId;

    try {
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const payload = JSON.parse(decodedText);
        if (payload.c) token = payload.c;
        if (payload.e) eventId = payload.e;
      } else {
        token = decodedText.trim();
      }
    } catch {
      token = decodedText.trim();
    }

    if (!token) {
      playErrorBuzz();
      setScanMessage({
        type: 'error',
        text: 'ไม่พบ TOTP Token ใน QR Code ที่สแกน',
      });
      return;
    }

    try {
      const res = await fetch('/api/checkin/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          studentId: activeStudentId,
          token,
        }),
      });

      const data = await res.json();

      if (data.success) {
        playSuccessChime();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });

        setScanMessage({
          type: 'success',
          text: data.message || 'เช็คอินสำเร็จ! ระบบปลดล็อค Passcode ให้แล้ว',
        });

        if (data.passcode) {
          setPasscode(data.passcode);
        }
        if (data.registration) {
          setRegistration(data.registration);
        }
      } else {
        playErrorBuzz();
        setScanMessage({
          type: 'error',
          text: data.message || data.error || 'QR Code หมดอายุหรือไม่ถูกต้อง กรุณาสแกนใหม่',
        });
      }
    } catch (err: any) {
      playErrorBuzz();
      setScanMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ QR Code',
      });
    }
  };

  const handleCopyPasscode = () => {
    if (!passcode) return;
    navigator.clipboard.writeText(passcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-xl mx-auto p-4 sm:p-6 w-full space-y-6">
        {/* Ticket Lookup / Select Student */}
        <div className="p-4 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              ค้นหาบัตรเข้าร่วมงาน
            </h2>
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Real-time Sync
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">กิจกรรม:</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">รหัสนักศึกษา:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น 65010001"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 text-white"
                />
                <button
                  onClick={() => setActiveStudentId(studentIdInput.trim())}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  ค้นหา
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Student Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-400">
            <span>รหัสตัวอย่าง:</span>
            {['65010001', '65010002', '65010003', '65010005'].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setStudentIdInput(id);
                  setActiveStudentId(id);
                }}
                className={`px-2 py-0.5 rounded font-mono transition-colors ${
                  activeStudentId === id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Result Alert */}
        {scanMessage && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between animate-in fade-in duration-200 ${
              scanMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
            }`}
          >
            <span>{scanMessage.text}</span>
            <button
              onClick={() => setScanMessage(null)}
              className="text-xs underline ml-2 opacity-80"
            >
              ปิด
            </button>
          </div>
        )}

        {/* The Digital Event Ticket */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
            กำลังโหลดข้อมูลบัตรกิจกรรม...
          </div>
        ) : !registration ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <User className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white">ไม่พบข้อมูลนักศึกษา</h3>
            <p className="text-slate-400 text-xs">
              ไม่พบรหัสนักศึกษา <strong>{activeStudentId}</strong> ในกิจกรรมนี้
              กรุณาตรวจสอบรหัสหรือติดต่อ Admin
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ticket Card Container */}
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Ticket Top Notch Header */}
              <div className="p-6 border-b border-dashed border-slate-800 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {eventName || 'กิจกรรมพิเศษ'}
                  </span>
                  {registration.is_attended ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      เช็คอินแล้ว
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5" />
                      รอเช็คอิน
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">{registration.student_name}</h3>
                  <p className="text-sm font-mono text-slate-400 mt-0.5">
                    รหัสนักศึกษา: <span className="text-emerald-400 font-bold">{registration.student_id}</span>
                  </p>
                </div>

                {registration.is_attended && (
                  <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                    <span>
                      เวลาเช็คอิน:{' '}
                      {registration.check_in_time
                        ? new Date(registration.check_in_time).toLocaleTimeString('th-TH')
                        : '-'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      {registration.check_in_method || 'HYBRID'}
                    </span>
                  </div>
                )}
              </div>

              {/* Ticket Middle: Static QR & Student Camera Scanner */}
              <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
                {/* Method 1: Static QR for Staff */}
                <div className="space-y-3 flex flex-col items-center">
                  <p className="text-xs text-slate-400 font-medium">
                    วิธีที่ 1: แสดง QR นี้ให้ Staff สแกน
                  </p>
                  <QrCodeDisplay
                    value={registration.student_id}
                    size={180}
                    className="border-2 border-slate-700"
                  />
                  <p className="text-[11px] font-mono text-slate-500">
                    Static ID: {registration.student_id}
                  </p>
                </div>

                <div className="w-full flex items-center gap-3">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-xs font-mono text-slate-500">หรือ</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                {/* Method 2: Student Scans Projector Dynamic QR */}
                <div className="w-full">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span>วิธีที่ 2: สแกน Dynamic QR บนจอโปรเจคเตอร์</span>
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2">
                    กล้องจะอ่าน Dynamic QR บนจอเวทีเพื่อเช็คอินอัตโนมัติ
                  </p>
                </div>
              </div>

              {/* Ticket Bottom: Passcode Card (Blurred vs Revealed) */}
              <div className="p-6 border-t border-slate-800 bg-slate-950/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    รหัส Passcode รับสิทธิพิเศษ
                  </span>
                  {registration.is_attended ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Unlock className="w-3.5 h-3.5" /> ปลดล็อคแล้ว
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> ล็อคอยู่
                    </span>
                  )}
                </div>

                {/* Dynamic Passcode Box */}
                {registration.is_attended ? (
                  /* UNLOCKED STATE */
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-slate-900 border-2 border-amber-500/50 shadow-2xl space-y-3 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Passcode ประจำตัวคุณ:
                      </span>
                      <button
                        onClick={handleCopyPasscode}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>คัดลอกแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>คัดลอกรหัส</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="py-2 text-center">
                      <div className="text-3xl font-black font-mono tracking-widest text-white selection:bg-amber-400 selection:text-black">
                        {passcode || 'กำลังดึงรหัส...'}
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-200/80 text-center">
                      นำรหัส Passcode นี้ไปกรอกรับคะแนนหรือของรางวัลในกิจกรรม
                    </p>
                  </div>
                ) : (
                  /* LOCKED STATE (BLURRED) */
                  <div className="relative p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden text-center">
                    {/* Blurred Background Dummy Text */}
                    <div className="filter blur-md select-none opacity-40 py-2">
                      <div className="text-3xl font-black font-mono tracking-widest text-slate-400">
                        PASS-XXXX-8823
                      </div>
                    </div>

                    {/* Centered Lock Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                      <div className="w-9 h-9 rounded-full bg-slate-800/80 text-amber-400 flex items-center justify-center mb-1.5 shadow">
                        <Lock className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">
                        Passcode ถูกซ่อนไว้
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        จะปลดล็อคและแสดงรหัสทันทีเมื่อคุณเช็คอินเข้างานสำเร็จ (Real-time)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Scanner Modal for Projector Screen Scan */}
      <QrScannerModal
        isOpen={isScannerOpen}
        title="สแกน Dynamic QR บนจอ"
        description="หันกล้องไปที่หน้าจอโปรเจคเตอร์หน้าเวทีเพื่อเช็คอิน"
        onScanSuccess={handleDynamicQrScanned}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}

export default function StudentTicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 text-center">กำลังโหลด...</div>}>
      <StudentTicketContent />
    </Suspense>
  );
}
