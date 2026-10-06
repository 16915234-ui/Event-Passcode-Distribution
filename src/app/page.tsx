'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Tv,
  ScanLine,
  Ticket,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function HomePage() {
  const [hasSupabase, setHasSupabase] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    setHasSupabase(isSupabaseConfigured());
  }, []);

  const roles = [
    {
      title: '1. Admin Panel',
      subtitle: 'จัดการกิจกรรม & คลัง Passcode',
      description:
        'สร้างกิจกรรม, นำเข้ารายชื่อนักศึกษา (Pre-registration) พร้อมผูก Passcode ให้อัตโนมัติ, มอนิเตอร์ยอดเข้างานแบบ Real-time',
      href: '/admin',
      icon: LayoutDashboard,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
      btnText: 'เข้าสู่ Admin Panel',
    },
    {
      title: '2. Projector Display',
      subtitle: 'จอฉาย Dynamic TOTP QR (5s)',
      description:
        'จอโปรเจคเตอร์หน้าเวที รีเฟรช QR Code ทุก 5 วินาทีด้วยอัลกอริทึม TOTP ป้องกันการถ่ายรูปส่งต่อ พร้อม Ticker ผู้เข้าร่วมงานล่าสุด Real-time',
      href: '/display',
      icon: Tv,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      btnText: 'เปิดจอโปรเจคเตอร์',
    },
    {
      title: '3. Staff Scanner App',
      subtitle: 'สแกน Static QR นักศึกษา',
      description:
        'เปิดกล้องหลังมือถือสแกนบัตรนักศึกษา มีเสียง Chime ยืนยันการเข้างาน พร้อมระบบ Manual พิมพ์รหัสกรณีกล้องมีปัญหา',
      href: '/staff',
      icon: ScanLine,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
      btnText: 'เปิดเครื่องสแกน Staff',
    },
    {
      title: '4. Student Ticket App',
      subtitle: 'บัตรกิจกรรม & Passcode รับสิทธิ์',
      description:
        'โชว์ Static QR ประจำตัวให้นักศึกษา หรือเปิดกล้องสแกนจอเวที เมื่อสถานะ is_attended เปลี่ยนเป็น true ปลดล็อค Passcode ทันทีแบบ Zero-Latency',
      href: '/student',
      icon: Ticket,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
      btnText: 'เปิดบัตรนักศึกษา',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-emerald-500 selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Latency Realtime Hybrid Check-in</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
            Real-time Event Check-in & Passcode System
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            ระบบแจก Passcode กิจกรรมระดับเสี้ยววินาที อุดช่องโหว่ &quot;ลงชื่อแต่ไม่มาร่วมงาน&quot;
            ด้วยระบบ Pre-assigned Passcode, Dynamic TOTP QR และ Supabase Realtime WebSockets
          </p>

          <div className="text-xs font-mono text-slate-400">
            พัฒนาโดย: <strong className="text-white">อั๋น (จิรายุทธ บุตรชานนท์)</strong> • Tech Stack:{' '}
            <span className="text-emerald-400">Next.js + Supabase + Vercel</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/admin"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>เริ่มต้นใช้งาน Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/display"
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm border border-slate-800 transition-colors flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-emerald-400" />
              <span>ดูหน้าจอโปรเจคเตอร์</span>
            </Link>
          </div>
        </div>

        {/* 4 System Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className={`p-7 rounded-3xl bg-gradient-to-br ${role.color} border shadow-2xl flex flex-col justify-between group hover:border-white/30 transition-all`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      {role.subtitle}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                      {role.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <Link
                    href={role.href}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs border border-slate-800 transition-transform active:scale-95"
                  >
                    <span>{role.btnText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Core Architecture Highlights */}
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">4 เสาหลักของสถาปัตยกรรมระบบ</h2>
            <p className="text-slate-400 text-sm">
              ออกแบบมาเพื่อรองรับผู้เข้าร่วมจำนวนมากพร้อมกัน โดยไม่เกิดคอขวด (Zero-Latency Check-in)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white">1. Pre-assigned Passcodes</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                ผูกรหัส Passcode ล่วงหน้าตั้งแต่ขั้นตอน Admin Import วันงานแค่อัปเดต <code>is_attended = true</code> ไม่เสียเวลาค้นหา
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white">2. TOTP Dynamic QR (5s)</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                สร้าง Dynamic QR บนโปรเจคเตอร์ด้วย TOTP หมุนรอบทุก 5 วินาที ไม่ต้องเขียน DB ป้องกันการถ่ายรูปส่งให้เพื่อน
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white">3. Grace Period Backend</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                API ตรวจสอบยอมรับ Token รอบปัจจุบันและย้อนหลัง 1 รอบ (±5s) ป้องกันปัญหาสัญญาณเน็ตหน่วง
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white">4. Supabase Realtime UI</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                WebSockets แจ้งเตือนจอมือถือนักศึกษาทันทีที่เช็คอิน ปลดล็อคแสดง Passcode ทันทีโดยไม่ต้องกด Refresh
              </p>
            </div>
          </div>
        </div>

        {/* Supabase & Vercel Quick Setup Helper */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  การเชื่อมต่อ Supabase & การ Deploy บน Vercel
                </h3>
                <p className="text-xs text-slate-400">
                  {hasSupabase
                    ? 'เชื่อมต่อ Supabase สำเร็จแล้ว ข้อมูลจะถูกบันทึกจริงลง PostgreSQL'
                    : 'กำลังรันในโหมด Demo Preview คุณสามารถทดสอบทุกฟีเจอร์ได้ทันที หรือใส่คีย์ใน .env.local เพื่อต่อ Supabase'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700"
              >
                <span>Supabase Console</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs text-slate-950 font-bold"
              >
                <span>Deploy on Vercel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-emerald-400">วิธีเชื่อมต่อฐานข้อมูล Supabase:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>สร้าง Project ใหม่ใน Supabase Dashboard</li>
              <li>
                เปิดแท็บ <strong>SQL Editor</strong> แล้วรันโค้ดจากไฟล์{' '}
                <code className="text-amber-300">supabase-schema.sql</code> (สร้างตาราง events, passcodes, registrations และเปิด Realtime)
              </li>
              <li>
                คัดลอก <strong>Project URL</strong> และ <strong>anon public API Key</strong> ใส่ใน{' '}
                <code className="text-amber-300">.env.local</code>
              </li>
              <li>รีสตาร์ทเซิร์ฟเวอร์ ระบบจะเชื่อมต่อและทำงานร่วมกับ Supabase แบบสมบูรณ์ 100%</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p>Real-time Event Check-in & Passcode System • ออกแบบและพัฒนาโดย อั๋น (จิรายุทธ บุตรชานนท์)</p>
        <p className="font-mono text-[11px] text-slate-600">Built with Next.js App Router, Supabase, Tailwind CSS, html5-qrcode & TOTP</p>
      </footer>
    </div>
  );
}
