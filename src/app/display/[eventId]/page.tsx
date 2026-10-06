'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import QrCodeDisplay from '@/components/QrCodeDisplay';
import { generateTotpToken, getTotpCycleInfo, TOTP_STEP_SECONDS } from '@/lib/totp';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { playSuccessChime } from '@/lib/audio';
import { Event, Registration } from '@/types';

export default function DisplayEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [token, setToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(TOTP_STEP_SECONDS);
  const [progress, setProgress] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Stats & Recent attendees
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [attendedCount, setAttendedCount] = useState<number>(0);
  const [recentAttendees, setRecentAttendees] = useState<Registration[]>([]);
  const [lastCheckInAlert, setLastCheckInAlert] = useState<{
    name: string;
    id: string;
    time: string;
  } | null>(null);

  // Fetch Event Data
  const fetchEventData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setTotalStudents(data.stats.totalStudents);
        setAttendedCount(data.stats.attendedCount);
        if (data.registrations) {
          const checkedIn = data.registrations
            .filter((r: Registration) => r.is_attended)
            .sort(
              (a: Registration, b: Registration) =>
                new Date(b.check_in_time || 0).getTime() -
                new Date(a.check_in_time || 0).getTime()
            );
          setRecentAttendees(checkedIn.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  // Dynamic QR Ticker & Generation every frame/second
  useEffect(() => {
    if (!event) return;

    const updateTokenAndCycle = () => {
      const currentToken = generateTotpToken(event.totp_secret);
      setToken(currentToken);

      const cycle = getTotpCycleInfo();
      setCountdown(cycle.remainingSeconds);
      setProgress(cycle.progressPercent);
    };

    updateTokenAndCycle();
    const interval = setInterval(updateTokenAndCycle, 200); // 5Hz smooth progress tick

    return () => clearInterval(interval);
  }, [event]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // In demo mode, fallback to polling every 3 seconds for updates
      const pollTimer = setInterval(fetchEventData, 3000);
      return () => clearInterval(pollTimer);
    }

    const channel = supabase
      .channel(`display-realtime-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registrations',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as Registration;
          if (updated && updated.is_attended) {
            // Trigger celebration
            if (soundEnabled) {
              playSuccessChime();
            }

            setAttendedCount((prev) => prev + 1);
            setRecentAttendees((prev) => [updated, ...prev.slice(0, 4)]);
            setLastCheckInAlert({
              name: updated.student_name,
              id: updated.student_id,
              time: new Date().toLocaleTimeString('th-TH'),
            });

            // Dismiss popup after 4 seconds
            setTimeout(() => {
              setLastCheckInAlert(null);
            }, 4000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, soundEnabled]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Build the Dynamic QR payload JSON string
  const qrPayload = JSON.stringify({
    e: eventId,
    c: token,
    t: Math.floor(Date.now() / 1000),
  });

  const attendancePercent =
    totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Banner / Navigation */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/display"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-sm transition-colors border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้ารายการ</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold">
                PROJECTOR LIVE CHECK-IN
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {event?.name || 'กำลังโหลดกิจกรรม...'}
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'โหมดเต็มจอ'}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 lg:gap-16 max-w-7xl mx-auto w-full">
        {/* Dynamic QR Section */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative group">
            {/* Ambient Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl opacity-25 blur-2xl group-hover:opacity-40 transition-opacity" />

            {/* QR Code Container */}
            <div className="relative p-6 sm:p-8 bg-slate-900/90 border-2 border-emerald-500/30 rounded-3xl shadow-2xl flex flex-col items-center">
              {token ? (
                <QrCodeDisplay
                  value={qrPayload}
                  size={280}
                  level="H"
                  className="shadow-2xl border-4 border-white"
                />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center bg-slate-800 rounded-2xl text-slate-400">
                  กำลังสร้าง Dynamic QR...
                </div>
              )}

              {/* Progress Countdown Bar */}
              <div className="w-full mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    รีเฟรชทุก {TOTP_STEP_SECONDS} วินาที
                  </span>
                  <span>{countdown}s</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>TOTP Token: {token}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-slate-400 text-sm max-w-sm">
            เปิดเว็บแอปในมือถือ เลือกเมนู <strong>&quot;สแกนหน้าจอ&quot;</strong> เพื่อเช็คอินรับ Passcode ทันที
          </p>
        </div>

        {/* Real-time Dashboard & Attendee Feed */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Attendance Stats Card */}
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              ยอดเข้าร่วมกิจกรรม Real-time
            </h3>

            <div className="flex items-baseline justify-between">
              <span className="text-5xl font-black tracking-tight text-white">
                {attendedCount}
              </span>
              <span className="text-xl text-slate-400 font-mono">
                / {totalStudents} คน
              </span>
            </div>

            {/* Attendance Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>อัตราการมางาน</span>
                <span className="font-bold text-emerald-400">{attendancePercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${attendancePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Live Check-in Feed */}
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-3xl shadow-xl flex-1 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              ผู้เข้าร่วมล่าสุด (Live Stream)
            </h3>

            <div className="space-y-2.5">
              {recentAttendees.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  รอรับการเช็คอินคนแรก...
                </div>
              ) : (
                recentAttendees.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 animate-in fade-in slide-in-from-left duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">{reg.student_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{reg.student_id}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/20">
                      {reg.check_in_time
                        ? new Date(reg.check_in_time).toLocaleTimeString('th-TH')
                        : 'เพิ่งเข้า'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Check-in Banner Notification */}
      {lastCheckInAlert && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 font-bold border-2 border-emerald-300">
          <Sparkles className="w-5 h-5 text-slate-950" />
          <span>
            ยินดีต้อนรับคุณ {lastCheckInAlert.name} ({lastCheckInAlert.id}) เช็คอินสำเร็จ!
          </span>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 font-mono">
        Real-time Hybrid Check-in & Passcode • พัฒนาโดย อั๋น (จิรายุทธ บุตรชานนท์)
      </footer>
    </div>
  );
}
