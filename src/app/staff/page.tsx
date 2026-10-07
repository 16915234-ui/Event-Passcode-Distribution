'use client';
import { useState, useRef } from 'react';
import { ScanLine, Search, Users, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeading, Notice, LiveStatus } from '@/components/feedback';
import QrScannerModal from '@/components/QrScannerModal';
import { api, errorText, useResource, useAttendanceRealtime, useDebouncedValue } from '@/lib/client-api';
import type { Event, EventDetail, Registration } from '@/types';
import { DataSkeleton, LoadingStatus, RefreshStatus, RetryLoad } from '@/components/loading';
export default function StaffPage() {
  const {data,error,isLoading,refresh}=useResource<{events:Event[]}>('/api/events');const [selected,setSelected]=useState('');const id=selected||data?.events[0]?.id;
  return <><PageHeading eyebrow="Staff portal" title="เช็คอินหน้างาน" description="ตรวจสอบตัวตนนักศึกษา แล้วสแกนบัตรหรือค้นหารหัสเพื่อยืนยันการเข้าร่วม"/><Notice text={error}/>{isLoading&&<DataSkeleton label="กำลังโหลดกิจกรรม…" cards/>}{!data&&error&&<RetryLoad message={error} retry={refresh}/>}<label className="mb-6 max-w-lg">กิจกรรมที่ปฏิบัติงาน<select value={id||''} onChange={e=>setSelected(e.target.value)}>{!data?.events.length&&<option value="">{isLoading?'กำลังโหลดกิจกรรม…':'ยังไม่มีกิจกรรม'}</option>}{data?.events.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select></label>{id&&<StaffEvent key={id} id={id}/>}</>;
}
function StaffEvent({id}:{id:string}) {

  const [scan,setScan]=useState(false);const [busy,setBusy]=useState(false);const [query,setQuery]=useState('');const [message,setMessage]=useState('');const [failure,setFailure]=useState('');const [candidate,setCandidate]=useState<Registration|null>(null);
  const search=useDebouncedValue(query.trim());
  const {data,error,refresh,isLoading,isRefreshing}=useResource<EventDetail>(`/api/events/${id}?view=${search?'roster':'summary'}&pageSize=20&q=${encodeURIComponent(search)}`, {keepPreviousData:true});
  const live=useAttendanceRealtime(`event_id=eq.${id}`,refresh);
  const inFlight=useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const playBeep = (success: boolean) => {
    try {
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext!)();
      const ctx = audioContext.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch { /* Audio is optional when browser playback is blocked. */ }
  };
  const checkIn=async(body:{method: 'STAFF_SCAN' | 'MANUAL';username?:string;qr?:string})=>{if(inFlight.current)return;inFlight.current=true;if(body.method!=='STAFF_SCAN')setScan(false);setBusy(true);setFailure('');setMessage('');try{const result=await api<{message:string}>('/api/checkin/staff',{eventId:id,...body});setMessage(result.message);setCandidate(null);await refresh();if(body.method==='STAFF_SCAN')playBeep(true);}catch(e){setFailure(errorText(e));if(body.method==='STAFF_SCAN')playBeep(false);}finally{setBusy(false);inFlight.current=false;}};
  const searching=isLoading||query.trim()!==search;
  const results=search&&!searching?data?.registrations||[]:[];
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm"><Users size={17} className="text-gold"/>เข้าร่วมแล้ว <strong>{data?.stats.attendedCount??'…'}</strong> / {data?.stats.totalStudents??'…'} คน</p><div className="flex gap-3"><RefreshStatus active={isRefreshing}/><LiveStatus connected={live}/></div></div><Notice text={failure||error}/><Notice text={message} success/>{isLoading&&!data&&<DataSkeleton label="กำลังโหลดสถานะกิจกรรม…" cards/>}{busy&&<LoadingStatus label="กำลังยืนยันการเช็คอิน…"/>}<div className="grid gap-6 lg:grid-cols-2"><Card className="flex flex-col items-center justify-center py-12 text-center"><div className="mb-6 rounded-2xl bg-primary/7 p-6 text-primary"><ScanLine size={52}/></div><h2 className="text-xl font-bold">สแกน QR ของนักศึกษา</h2><p className="my-4 max-w-sm text-sm leading-7 text-muted-foreground">ให้นักศึกษาเปิด “แสดง QR Code ของฉัน”<br/>ตรวจสอบตัวตนก่อนสแกนยืนยันการเข้าร่วม</p><Button loading={busy} disabled={busy} onClick={()=>setScan(true)}><ScanLine/>{busy?'กำลังเช็คอิน...':'เปิดกล้องสแกน'}</Button><p className="mt-6 flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck size={14}/>ทีมงานยืนยันตัวบุคคลได้โดยไม่ใช้ GPS</p></Card><Card><h2 className="flex items-center gap-2 text-lg font-bold"><Search size={20} className="text-gold"/>ค้นหาและเช็คอินด้วยมือ</h2><p className="my-3 text-xs leading-6 text-muted-foreground">สำหรับกรณีแบตเตอรี่หมด กล้องเสีย หรือไม่สามารถเปิดบัตรได้</p><Input aria-label="ค้นหานักศึกษา" placeholder="รหัสนักศึกษาหรือชื่อ–นามสกุล" value={query} onChange={e=>{setQuery(e.target.value);setCandidate(null);}}/><div className="mt-4 max-h-80 divide-y divide-border overflow-y-auto">{searching&&query&&<LoadingStatus label="กำลังค้นหารายชื่อ…"/>}{results.map(r=><div key={r.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{r.users?.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{r.users?.username}</p></div>{r.is_attended?<span className="text-xs text-green-700">เช็คอินแล้ว</span>:<Button size="sm" variant="outline" loading={busy} disabled={busy} onClick={()=>setCandidate(r)}>เลือก</Button>}</div>)}{query&&!searching&&!error&&!results.length&&<p className="py-8 text-center text-sm text-muted-foreground">ไม่พบรายชื่อในกิจกรรมนี้</p>}</div>{candidate&&<div className="mt-5 rounded-xl border border-[#ead9b7] bg-[#fcf6e8] p-4"><p className="text-sm font-bold">ยืนยันตัวตน: {candidate.users?.full_name}</p><p className="mt-2 text-xs leading-6">รหัส {candidate.users?.username}<br/>โปรดตรวจสอบบัตรนักศึกษาหรือเอกสารประจำตัวก่อนกดยืนยัน</p><Button className="mt-4 w-full" loading={busy} disabled={busy} onClick={()=>void checkIn({method:'MANUAL',username:candidate.users?.username})}><CheckCircle2/>{busy?'กำลังบันทึก...':'ยืนยันเช็คอินด้วยมือ'}</Button></div>}</Card></div><QrScannerModal isOpen={scan} processing={busy} feedback={failure||message} feedbackError={!!failure} onScanSuccess={qr=>void checkIn({method:'STAFF_SCAN',qr})} onClose={()=>setScan(false)}/></>;
}
