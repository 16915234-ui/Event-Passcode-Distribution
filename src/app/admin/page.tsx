'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  LayoutDashboard,
  Plus,
  Users,
  Key,
  CheckCircle2,
  Tv,
  ScanLine,
  Ticket,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  Copy,
  Check,
  Trash2,
  Database,
  Calendar,
} from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Event, Passcode, Registration } from '@/types';

function AdminDashboardContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [passcodes, setPasscodes] = useState<Passcode[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'students' | 'passcodes' | 'import'>('students');

  // Modals & Inputs
  const [newEventName, setNewEventName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'not_attended'>('all');

  // Import Forms
  const [csvInput, setCsvInput] = useState(
    '65010010, ประยุทธ์ มั่นคง\n65010011, อภิสิทธิ์ ก้าวหน้า\n65010012, ธีรภัทร ชาญวิทย์'
  );
  const [importResult, setImportResult] = useState<string | null>(null);

  // Passcode Generator
  const [passcodeCountToGen, setPasscodeCountToGen] = useState(10);
  const [passcodePrefix, setPasscodePrefix] = useState('PASS-TECH');

  const [copiedId, setCopiedId] = useState(false);

  // Load all events
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        if (data.events.length > 0 && !selectedEventId) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load details for selected event
  const loadEventDetails = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedEvent(data.event);
        setRegistrations(data.registrations || []);
        setPasscodes(data.passcodes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetails(selectedEventId);
    }
  }, [selectedEventId, loadEventDetails]);

  // Supabase Realtime Listener for registrations table
  useEffect(() => {
    if (!selectedEventId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`admin-registrations-${selectedEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `event_id=eq.${selectedEventId}`,
        },
        () => {
          loadEventDetails(selectedEventId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEventId, loadEventDetails]);

  // Create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEventName.trim() }),
      });
      const data = await res.json();
      if (data.success && data.event) {
        setNewEventName('');
        setIsCreateModalOpen(false);
        await loadEvents();
        setSelectedEventId(data.event.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Import Students & Auto-Bind Passcodes
  const handleImportStudents = async () => {
    if (!selectedEventId || !csvInput.trim()) return;

    setActionLoading(true);
    setImportResult(null);

    // Parse CSV / Line format: "student_id, student_name"
    const lines = csvInput.split('\n');
    const students: { student_id: string; student_name: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/,|\t/);
      if (parts.length >= 2) {
        students.push({
          student_id: parts[0].trim(),
          student_name: parts.slice(1).join(' ').trim(),
        });
      } else if (parts.length === 1) {
        students.push({
          student_id: parts[0].trim(),
          student_name: `นักศึกษา ${parts[0].trim()}`,
        });
      }
    }

    if (students.length === 0) {
      setImportResult('ไม่พบข้อมูลรายชื่อที่ถูกต้อง (รูปแบบ: รหัสนักศึกษา, ชื่อ-นามสกุล)');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${selectedEventId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();

      if (data.success) {
        setImportResult(
          `สำเร็จ: นำเข้า ${data.imported} คน | ผูก Passcode สำเร็จ ${data.assigned} คน ${
            data.missingPasscodes > 0
              ? `(Passcode ในคลังหมด ขาดอีก ${data.missingPasscodes} รหัส)`
              : ''
          }`
        );
        loadEventDetails(selectedEventId);
      } else {
        setImportResult(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err: any) {
      setImportResult(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Passcodes batch
  const handleGeneratePasscodes = async () => {
    if (!selectedEventId || passcodeCountToGen <= 0) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/passcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: passcodeCountToGen,
          prefix: passcodePrefix,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadEventDetails(selectedEventId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const totalStudents = registrations.length;
  const attendedCount = registrations.filter((r) => r.is_attended).length;
  const totalPasscodes = passcodes.length;
  const assignedPasscodes = passcodes.filter((p) => p.assigned_to !== null).length;
  const availablePasscodes = totalPasscodes - assignedPasscodes;
  const attendanceRate = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0;

  // Filtered registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchQuery =
      r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'attended') return matchQuery && r.is_attended;
    if (statusFilter === 'not_attended') return matchQuery && !r.is_attended;
    return matchQuery;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto p-4 sm:p-8 w-full space-y-8">
        {/* Header & Event Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Admin Management Panel
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                จัดการกิจกรรม, Pre-registration ผูก Passcode ล่วงหน้า และดูสถิติ Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 flex-1 md:w-64"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างกิจกรรม</span>
            </button>
          </div>
        </div>

        {/* Quick Launcher Ribbon */}
        {selectedEvent && (
          <div className="p-4 sm:p-5 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white text-base">{selectedEvent.name}</span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span>ID: {selectedEvent.id.slice(0, 8)}...</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedEvent.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="hover:text-white"
                  title="คัดลอก Event ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/display/${selectedEvent.id}`}
                target="_blank"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Tv className="w-4 h-4" />
                <span>เปิดจอโปรเจคเตอร์</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                href="/staff"
                target="_blank"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Staff Scanner</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                href={`/student?event=${selectedEvent.id}`}
                target="_blank"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                <span>Student Ticket</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              นักศึกษาลงทะเบียน
            </span>
            <div className="text-3xl font-black text-white">{totalStudents} คน</div>
            <p className="text-xs text-slate-500">Pre-registered ทั้งหมด</p>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              เช็คอินแล้ว
            </span>
            <div className="text-3xl font-black text-cyan-400">
              {attendedCount} <span className="text-sm font-normal text-slate-400">({attendanceRate}%)</span>
            </div>
            <p className="text-xs text-slate-500">สถานะ is_attended = true</p>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              Passcode ในคลัง
            </span>
            <div className="text-3xl font-black text-white">{totalPasscodes} ชุด</div>
            <p className="text-xs text-slate-500">พร้อมใช้งาน / มีในระบบ</p>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              ผูกรหัสแล้ว (Assigned)
            </span>
            <div className="text-3xl font-black text-purple-400">
              {assignedPasscodes} <span className="text-sm font-normal text-slate-400">/ ว่าง {availablePasscodes}</span>
            </div>
            <p className="text-xs text-slate-500">Pre-assigned Passcode</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อผู้ลงทะเบียน ({registrations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('passcodes')}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'passcodes'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>คลัง Passcode ({passcodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้ารายชื่อ (Pre-registration)</span>
          </button>
        </div>

        {/* Tab 1: Registrations Table */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือรหัสนักศึกษา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">ทั้งหมด ({registrations.length})</option>
                  <option value="attended">เช็คอินแล้ว ({attendedCount})</option>
                  <option value="not_attended">ยังไม่เช็คอิน ({totalStudents - attendedCount})</option>
                </select>

                <button
                  onClick={() => loadEventDetails(selectedEventId)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">รหัสนักศึกษา</th>
                      <th className="p-4">ชื่อ-นามสกุล</th>
                      <th className="p-4">สถานะเช็คอิน</th>
                      <th className="p-4">เวลา</th>
                      <th className="p-4">วิธีเช็คอิน</th>
                      <th className="p-4">Passcode ที่ผูกไว้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลนักศึกษา'}
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg) => {
                        const assignedP = passcodes.find((p) => p.assigned_to === reg.student_id);
                        return (
                          <tr
                            key={reg.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              reg.is_attended ? 'bg-emerald-950/10' : ''
                            }`}
                          >
                            <td className="p-4 font-mono text-emerald-400">{reg.student_id}</td>
                            <td className="p-4 text-white font-semibold">{reg.student_name}</td>
                            <td className="p-4">
                              {reg.is_attended ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" /> เช็คอินแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                  รอเช็คอิน
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-mono text-slate-400">
                              {reg.check_in_time
                                ? new Date(reg.check_in_time).toLocaleTimeString('th-TH')
                                : '-'}
                            </td>
                            <td className="p-4 font-mono text-slate-400">
                              {reg.check_in_method ? (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                  {reg.check_in_method}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-4 font-mono">
                              {assignedP ? (
                                <span className="text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                                  {assignedP.code_value}
                                </span>
                              ) : (
                                <span className="text-rose-400 text-[11px]">ยังไม่มี Passcode</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Passcode Inventory */}
        {activeTab === 'passcodes' && (
          <div className="space-y-6">
            {/* Batch Generator Form */}
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                เพิ่มชุด Passcode เข้าคลังกิจกรรม
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">คำนำหน้า (Prefix):</label>
                  <input
                    type="text"
                    value={passcodePrefix}
                    onChange={(e) => setPasscodePrefix(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">จำนวนที่ต้องการสร้าง:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passcodeCountToGen}
                    onChange={(e) => setPasscodeCountToGen(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGeneratePasscodes}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้าง Passcode ทันที</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Passcodes List Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Passcode ทั้งหมด ({passcodes.length} รายการ)</span>
                <span>ว่างอยู่: {availablePasscodes} | ผูกแล้ว: {assignedPasscodes}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">ลำดับ</th>
                      <th className="p-4">รหัส Passcode</th>
                      <th className="p-4">สถานะการผูก</th>
                      <th className="p-4">รหัสนักศึกษาที่ผูก</th>
                      <th className="p-4">วันที่เพิ่ม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {passcodes.map((p, index) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4 text-slate-500">{index + 1}</td>
                        <td className="p-4 text-amber-300 font-bold">{p.code_value}</td>
                        <td className="p-4">
                          {p.assigned_to ? (
                            <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/20 text-[10px]">
                              ผูกกับนักศึกษาแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px]">
                              ว่างอยู่ (Available)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-white">
                          {p.assigned_to || <span className="text-slate-500">-</span>}
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(p.created_at).toLocaleDateString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Pre-registration Import */}
        {activeTab === 'import' && (
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Pre-registration & Auto-assign Passcodes
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  เมื่อนำเข้ารายชื่อ ระบบจะดึง Passcode ที่ว่างอยู่ในคลังมาผูก (Bind) เข้ากับรหัสนักศึกษาแต่ละคนทันที
                  แต่จะล็อคการแสดงผลไว้จนกว่านักศึกษาจะเช็คอินจริงในวันงาน
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-slate-400">
                วางรายชื่อนักศึกษา (รูปแบบ: <code>รหัสนักศึกษา, ชื่อ-นามสกุล</code> บรรทัดละ 1 คน):
              </label>
              <textarea
                rows={8}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="65010001, สมชาย สายเทค&#10;65010002, สมหญิง รักเรียน"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
              <button
                onClick={() =>
                  setCsvInput(
                    '65010020, วีรยุทธ ชัยชนะ\n65010021, ณัฐพงษ์ สว่างวงศ์\n65010022, พิชญา สุขใจ\n65010023, ธนกฤต วิเศษ\n65010024, กัลยา รุ่งเรือง'
                  )
                }
                className="text-xs text-emerald-400 hover:underline"
              >
                + ใส่ตัวอย่าง 5 รายชื่อทดสอบ
              </button>

              <button
                onClick={handleImportStudents}
                disabled={actionLoading || !csvInput.trim()}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{actionLoading ? 'กำลังนำเข้าและผูก Passcode...' : 'ยืนยันการนำเข้ารายชื่อ'}</span>
              </button>
            </div>

            {importResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                {importResult}
              </div>
            )}
          </div>
        )}

        {/* Modal: Create Event */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">สร้างกิจกรรมใหม่</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">ชื่อกิจกรรม:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Workshop Next.js & Supabase 2026"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ระบบจะสร้าง TOTP Secret สำหรับ Dynamic QR อัตโนมัติ
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    {actionLoading ? 'กำลังสร้าง...' : 'สร้างกิจกรรม'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 text-center">กำลังโหลด...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
