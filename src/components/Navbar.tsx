'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  QrCode,
  LayoutDashboard,
  ScanLine,
  Ticket,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const [hasSupabase, setHasSupabase] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHasSupabase(isSupabaseConfigured());
  }, []);

  const navItems = [
    { href: '/', label: 'หน้าแรก (Home)', icon: QrCode },
    { href: '/admin', label: 'Admin Panel', icon: LayoutDashboard },
    { href: '/display', label: 'จอแสดงผล (Projector)', icon: Tv },
    { href: '/staff', label: 'Staff Scanner', icon: ScanLine },
    { href: '/student', label: 'Student Ticket', icon: Ticket },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                EventPass
              </span>
              <span className="text-[10px] block text-emerald-400 font-mono tracking-wider -mt-1 uppercase">
                Zero-Latency Check-in
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-3">
            {hasSupabase ? (
              <div
                title="เชื่อมต่อฐานข้อมูล Supabase สำเร็จ"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Supabase Live</span>
              </div>
            ) : (
              <div
                title="กำลังทำงานในโหมด In-Memory Demo (ตั้งค่า .env.local เพื่อเชื่อม Supabase)"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Demo Mode</span>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2">
            {hasSupabase ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 px-3 py-1.5 bg-emerald-950/40 rounded-lg">
                <CheckCircle2 className="w-4 h-4" /> Supabase Database Live
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-300 px-3 py-1.5 bg-amber-950/40 rounded-lg">
                <AlertTriangle className="w-4 h-4" /> Demo Mode (ตั้งค่า .env.local เพื่อเชื่อม Supabase)
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
