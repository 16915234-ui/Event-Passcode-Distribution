'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import QrScannerModal from '@/components/QrScannerModal';
import {
  ScanLine,
  Camera,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Key,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { playSuccessChime, playErrorBuzz } from '@/lib/audio';
import { Event, CheckInResponse } from '@/types';

export default function StaffScannerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
    studentName?: string;
    studentId?: string;
    passcode?: string | null;
  } | null>(null);
  const [history, setHistory] = useState<
    { id: string; name: string; time: string; method: string }[]
  >([]);

  // Fetch events
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events && data.events.length > 0) {
          setEvents(data.events);
          setSelectedEventId(data.events[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleProcessCheckIn = async (studentId: string) => {
    const cleanId = studentId.trim();
    if (!cleanId || !selectedEventId) {
      setResultMsg({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาเลือกกิจกรรมและระบุรหัสนักศึกษา',
      });
      playErrorBuzz();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/checkin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          studentId: cleanId,
        }),
      });

      const data: CheckInResponse = await res.json();

      if (data.success && data.registration) {
        playSuccessChime();
        setResultMsg({
          type: 'success',
          title: data.alreadyCheckedIn ? 'เคยเช็คอินแล้ว' : 'เช็คอินสำเร็จ!',
          description: data.message,
          studentName: data.registration.student_name,
          studentId: data.registration.student_id,
          passcode: data.passcode,
        });

        // Add to local scan history
        setHistory((prev) => [
          {
            id: data.registration!.student_id,
            name: data.registration!.student_name,
            time: new Date().toLocaleTimeString('th-TH'),
            method: 'STAFF_SCAN',
          },
          ...prev,
        ]);
        setManualStudentId('');
      } else {
        playErrorBuzz();
        setResultMsg({
          type: 'error',
          title: 'เช็คอินไม่สำเร็จ',
          description: data.message || data.error || 'ไม่พบข้อมูลในระบบ',
        });
      }
    } catch (err: any) {
      playErrorBuzz();
      setResultMsg({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        description: err.message || 'โปรดลองใหม่อีกครั้ง',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);

    let studentId = decodedText.trim();
    // In case QR contains JSON payload like { type: 'student_ticket', studentId: '...' }
    try {
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        if (parsed.studentId) studentId = parsed.studentId;
        else if (parsed.id) studentId = parsed.id;
      }
    } catch (e) {
      // plain text student id
    }

    handleProcessCheckIn(studentId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto p-4 sm:p-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Staff Check-in Scanner</h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                เจ้าหน้าที่สแกนบัตร Static QR ของนักศึกษา หรือพิมพ์รหัสเพื่อเช็คอิน
              </p>
            </div>
          </div>

          {/* Event Selector */}
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              เลือกกิจกรรมที่ต้องการสแกน:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-64 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scan Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Camera Scanner */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">เปิดกล้องสแกน QR</h3>
              <p className="text-xs text-slate-400 mt-1">
                สแกน Static QR บนจอมือถือของนักศึกษาด้วยกล้องหลัง
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>เปิดกล้องสแกนทันที</span>
            </button>
          </div>

          {/* Action 2: Manual Input */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">พิมพ์รหัสนักศึกษา (Manual)</h3>
                <p className="text-xs text-slate-400">กรณีกล้องมีปัญหา หรือสแกนไม่ติด</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessCheckIn(manualStudentId);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="เช่น 65010001"
                value={manualStudentId}
                onChange={(e) => setManualStudentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-base"
              />
              <button
                type="submit"
                disabled={isLoading || !manualStudentId.trim()}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'กำลังประมวลผล...' : 'ยืนยันเช็คอิน'}
              </button>
            </form>
          </div>
        </div>

        {/* Check-in Result Card */}
        {resultMsg && (
          <div
            className={`p-6 rounded-3xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
              resultMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  resultMsg.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {resultMsg.type === 'success' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <AlertCircle className="w-7 h-7" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white">{resultMsg.title}</h4>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date().toLocaleTimeString('th-TH')}
                  </span>
                </div>
                <p className="text-sm">{resultMsg.description}</p>

                {resultMsg.studentName && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>
                        ชื่อ: <strong>{resultMsg.studentName}</strong> ({resultMsg.studentId})
                      </span>
                    </div>
                    {resultMsg.passcode && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>
                          Passcode: <code className="text-amber-300 font-mono font-bold">{resultMsg.passcode}</code>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Scan History */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              ประวัติการสแกนในเซสชันนี้ ({history.length} คน)
            </h3>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                ล้างประวัติ
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              ยังไม่มีประวัติการสแกนในรอบนี้
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
                      {history.length - idx}
                    </span>
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-slate-400 font-mono">{item.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{item.time}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                      {item.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        title="สแกน Static QR นักศึกษา"
        description="ส่องกล้องไปที่ QR Code บนหน้าจอมือถือของนักศึกษา"
        onScanSuccess={handleQrScanSuccess}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
