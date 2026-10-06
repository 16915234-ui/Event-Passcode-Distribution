'use client';
import Link from 'next/link';
import AruLogo from './AruLogo';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ScanLine, Ticket, Tv, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import type { Profile } from '@/types';
import { api } from '@/lib/client-api';
export default function Navbar({ user }: { user: Profile }) {
  const path = usePathname();
  const router = useRouter();
  const items = user.role === 'ADMIN' ? [{ href:'/admin',label:'จัดการกิจกรรม',icon:LayoutDashboard },{href:'/staff',label:'เช็คอินหน้างาน',icon:ScanLine},{href:'/display',label:'จอโปรเจคเตอร์',icon:Tv}] : user.role === 'STAFF' ? [{href:'/staff',label:'เช็คอินหน้างาน',icon:ScanLine}] : [{href:'/student',label:'กิจกรรมของฉัน',icon:Ticket}];
  return <header className="border-b border-border bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8"><Link href={`/${user.role.toLowerCase()}`} className="flex items-center gap-3"><AruLogo/><div className="border-l border-border pl-3"><p className="text-base font-bold">Event Pass</p><p className="text-[10px] text-muted-foreground">มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา</p></div></Link><nav className="order-3 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto" aria-label="เมนูหลัก">{items.map(item => <Link key={item.href} href={item.href} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${path.startsWith(item.href) ? 'bg-primary/7 font-bold text-primary' : 'text-muted-foreground hover:bg-muted'}`}><item.icon size={16}/>{item.label}</Link>)}</nav><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-bold">{user.full_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{user.username} · {user.role}</p></div><Button variant="ghost" size="icon" aria-label="ออกจากระบบ" onClick={async()=>{ try { await api('/api/auth/logout', {}); router.replace('/login'); router.refresh(); } catch { window.alert('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่'); } }}><LogOut/></Button></div></div></header>;
}
