'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Tv, ExternalLink, Calendar, Users, QrCode } from 'lucide-react';
import { Event } from '@/types';

export default function DisplayIndexPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events) {
          setEvents(data.events);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto p-6 sm:p-10 w-full space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                จอโปรเจคเตอร์แสดงผล (Projector Display)
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                เลือกกิจกรรมเพื่อเปิดหน้าจอ Dynamic TOTP QR สำหรับฉายขึ้นหน้าเวทีหรือโปรเจคเตอร์
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm animate-pulse">
            กำลังโหลดรายการกิจกรรม...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400">ยังไม่มีกิจกรรมในระบบ</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
            >
              ไปสร้างกิจกรรมใน Admin Panel
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-6 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-3xl transition-all shadow-xl flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      พร้อมเปิดจอ
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(evt.created_at).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {evt.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {evt.id}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Dynamic TOTP 5s
                  </span>
                  <Link
                    href={`/display/${evt.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <span>เปิดจอโปรเจคเตอร์</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
