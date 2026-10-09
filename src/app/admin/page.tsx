'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Ticket, CheckCircle2, MapPin, Upload, Download, Tv, Settings2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeading, Notice, LiveStatus } from '@/components/feedback';
import { api, errorText, useResource, useAttendanceRealtime, useDebouncedValue } from '@/lib/client-api';
import { parseStudentCsv, type CsvStudent } from '@/lib/csv';
import type { Event, EventDetail, Profile, UserList, Settings, Organization } from '@/types';
import { DataSkeleton, LoadingStatus, RefreshStatus, RetryLoad, Pagination } from '@/components/loading';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full rounded-xl border bg-muted"><LoadingStatus label="กำลังโหลดแผนที่…"/></div>
});
export default function AdminPage() {
  const {data,error,refresh,isLoading,isRefreshing}=useResource<{events:Event[]}>('/api/events');const [selected,setSelected]=useState('');const [creating,setCreating]=useState(false);const [tab,setTab]=useState<'events'|'users'|'settings'>('events');
  const id=selected||data?.events[0]?.id;
  return <><PageHeading eyebrow="Administration" title="จัดการกิจกรรม" description="เตรียมกิจกรรม จัดสรรรายชื่อ และติดตามการเข้าร่วมในที่เดียว"><Button onClick={()=>{setCreating(!creating);setTab('events');}}><Plus/>{creating?'ปิดแบบฟอร์ม':'สร้างกิจกรรม'}</Button></PageHeading><div className="mb-6 flex gap-2 border-b border-border pb-3"><Button variant={tab==='events'?'default':'ghost'} size="sm" onClick={()=>setTab('events')}>กิจกรรมและรายชื่อ</Button><Button variant={tab==='users'?'default':'ghost'} size="sm" onClick={()=>setTab('users')}><Users/>จัดการบัญชีผู้ใช้</Button><Button variant={tab==='settings'?'default':'ghost'} size="sm" onClick={()=>setTab('settings')}><Settings2/>การตั้งค่าระบบ</Button></div><Notice text={error}/><RefreshStatus active={isRefreshing}/>{tab==='users'?<UserManagement/>:tab==='settings'?<SystemSettings/>:<>{creating&&<EventForm onSaved={async event=>{await refresh();setSelected(event.id);setCreating(false);}}/>}<div className="grid gap-6 lg:grid-cols-[260px_1fr]"><aside><p className="mb-3 text-xs font-bold text-muted-foreground">กิจกรรมทั้งหมด · {data ? data.events.length : '…'}</p><div className="space-y-2">{isLoading && <LoadingStatus label="กำลังโหลดกิจกรรม…" compact/>}{data?.events.map(event=><button key={event.id} onClick={()=>setSelected(event.id)} className={`w-full rounded-xl border p-4 text-left ${id===event.id?'border-primary/30 bg-white shadow-sm':'border-transparent hover:bg-white'}`}><p className={`text-sm font-bold ${id===event.id?'text-primary':''}`}>{event.name}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin size={12}/>{event.latitude===null?'ยังไม่ได้ตั้งค่าพิกัด':`รัศมี ${event.radius_meters} เมตร`}</p></button>)}</div></aside>{id?<EventWorkspace key={id} id={id} onChanged={refresh}/>:isLoading?<DataSkeleton label="กำลังโหลดกิจกรรม…" cards/>:error?<RetryLoad message={error} retry={refresh}/>:<Card className="py-20 text-center"><Ticket className="mx-auto mb-4 text-gold"/><h2 className="font-bold">{data?'เริ่มต้นกิจกรรมแรกของคุณ':'กำลังโหลดกิจกรรม...'}</h2><p className="mt-2 text-sm text-muted-foreground">สร้างกิจกรรม แล้วเพิ่ม Passcode ก่อนนำเข้ารายชื่อ</p></Card>}</div></>}</>;
}
function EventForm({event,onSaved}:{event?:Event;onSaved:(event:Event)=>Promise<void>}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [locating,setLocating]=useState(false);
  const [lat, setLat] = useState<number | null>(event?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(event?.longitude ?? null);
  const [radius, setRadius] = useState<number>(event?.radius_meters ?? 100);
  return <Card className="mb-6"><h2 className="mb-5 font-bold">{event?'แก้ไขกิจกรรมและพื้นที่เช็คอิน':'สร้างกิจกรรมใหม่'}</h2><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const result=await api<{event:Event}>(event?`/api/events/${event.id}`:'/api/events',{name:f.get('name'),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),radius_meters:Number(f.get('radius_meters'))},event?'PATCH':'POST');await onSaved(result.event);}catch(err){setError(errorText(err));}finally{setBusy(false);}}}><div className="grid gap-4"><label className="sm:col-span-3">ชื่อกิจกรรม<Input name="name" defaultValue={event?.name} required maxLength={200} placeholder="เช่น ปฐมนิเทศนักศึกษาใหม่"/></label><div className="sm:col-span-3"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">กำหนดจุดเช็คอินบนแผนที่ (คลิกเพื่อเลือกพิกัด)</p><Button type="button" variant="outline" size="sm" loading={locating} onClick={() => { if (!navigator.geolocation) { setError('เบราว์เซอร์ไม่รองรับ GPS กรุณาเลือกบนแผนที่'); return; } setLocating(true);setError('');navigator.geolocation.getCurrentPosition(pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude);setLocating(false); }, () => {setLocating(false);setError('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต GPS หรือเลือกบนแผนที่');},{enableHighAccuracy:true,timeout:15000,maximumAge:0}); }}><MapPin size={14} className="mr-1" /> ใช้ตำแหน่งปัจจุบัน</Button></div><MapPicker lat={lat} lng={lng} radius={radius} onLocationChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} /></div><div className="grid gap-4 sm:grid-cols-3"><label>ละติจูด<Input name="latitude" type="number" step="any" min={-90} max={90} value={lat ?? ''} onChange={e => setLat(parseFloat(e.target.value))} required placeholder="เช่น 14.34"/></label><label>ลองจิจูด<Input name="longitude" type="number" step="any" min={-180} max={180} value={lng ?? ''} onChange={e => setLng(parseFloat(e.target.value))} required placeholder="เช่น 100.57"/></label><label>รัศมี (เมตร)<Input name="radius_meters" type="number" min={10} max={5000} value={radius} onChange={e => setRadius(parseInt(e.target.value))} required/></label></div></div><p className="mt-3 text-xs text-muted-foreground">ใช้พิกัดจริงของจุดจัดงาน ทีมงานยังเช็คอินให้ได้เมื่อ GPS ใช้งานไม่ได้</p><Notice text={error}/><div className="mt-5 flex items-center justify-between"><Button type="submit" loading={busy} disabled={busy}>{busy?'กำลังบันทึก...':'บันทึกกิจกรรม'}</Button>{event && <Button type="button" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" disabled={busy} onClick={async () => { if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้? ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้')) { setBusy(true); try { await api(`/api/events/${event.id}`, {}, 'DELETE'); window.location.reload(); } catch (err) { setError(errorText(err)); setBusy(false); } } }}>ลบกิจกรรม</Button>}</div></form></Card>;
}
function EventWorkspace({id,onChanged}:{id:string;onChanged:()=>Promise<void>}) {

  const [tab,setTab]=useState<'roster'|'codes'|'settings'>('roster');const [message,setMessage]=useState('');const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);const [students,setStudents]=useState<CsvStudent[]>([]);const [filename,setFilename]=useState('');const [codes,setCodes]=useState('');const [query,setQuery]=useState('');const [showDbSelect,setShowDbSelect]=useState(false);
  const [page,setPage]=useState(1);
  const debouncedQuery=useDebouncedValue(query);
  const {data,error,refresh,isLoading,isRefreshing}=useResource<EventDetail>(`/api/events/${id}?view=${tab==='settings'?'summary':tab}&page=${page}&q=${encodeURIComponent(debouncedQuery)}`, {keepPreviousData:true});
  const live=useAttendanceRealtime(`event_id=eq.${id}`,refresh);
  const act=async(fn:()=>Promise<{message:string}>)=>{setBusy(true);setMessage('');setFailure('');try{const result=await fn();setMessage(result.message);await refresh();}catch(e){setFailure(errorText(e));}finally{setBusy(false);}};
  if(!data)return error?<RetryLoad message={error} retry={refresh}/>:<DataSkeleton label="กำลังโหลดรายละเอียดกิจกรรม…" cards/>;
  const rows=data.registrations;
  return <div className="min-w-0"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{data.event.name}</h2><Button asChild variant="outline" size="sm"><Link href={`/display/${id}`}><Tv/>เปิดจอโปรเจคเตอร์</Link></Button></div><div className="mb-5 grid grid-cols-3 gap-3">{[{label:'รายชื่อทั้งหมด',value:data.stats.totalStudents,icon:Users},{label:'เช็คอินแล้ว',value:data.stats.attendedCount,icon:CheckCircle2},{label:'Passcode ว่าง',value:data.stats.availablePasscodes,icon:Ticket}].map(item=><Card key={item.label} className="p-4"><item.icon className="mb-3 size-5 text-gold"/><p className="text-2xl font-bold">{item.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.label}</p></Card>)}</div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1">{[{key:'roster',label:'รายชื่อ'},{key:'codes',label:'คลัง Passcode'},{key:'settings',label:'ตั้งค่า'}].map(t=><Button key={t.key} size="sm" variant={tab===t.key?'default':'ghost'} onClick={()=>{setTab(t.key as typeof tab);setPage(1);}}>{t.label}</Button>)}</div><div className="flex flex-wrap gap-3"><RefreshStatus active={isRefreshing}/><LiveStatus connected={live}/></div></div><Notice text={failure||error}/>{busy&&<LoadingStatus label="กำลังบันทึกข้อมูล กรุณารอสักครู่…" compact/>}<Notice text={message} success/>{tab==='settings'?<EventForm event={data.event} onSaved={async()=>{await refresh();await onChanged();setMessage('บันทึกการตั้งค่าแล้ว');}}/>:tab==='codes'?<Card><h3 className="font-bold">เพิ่ม Passcode เข้าคลัง</h3><p className="my-3 text-xs leading-6 text-muted-foreground">วางรหัสหนึ่งรหัสต่อบรรทัด รหัสที่มีอยู่แล้วจะไม่ถูกเพิ่มซ้ำ<br/>เติมรหัสให้เพียงพอก่อนนำเข้ารายชื่อ</p><label>รายการ Passcode<textarea rows={5} value={codes} onChange={e=>setCodes(e.target.value)} placeholder="ARU-2026-0001&#10;ARU-2026-0002"/></label><Button className="mt-4" loading={busy} disabled={busy||!codes.trim()} onClick={()=>void act(async()=>{const r=await api<{message:string}>(`/api/events/${id}/passcodes`,{codes:codes.split(/\r?\n/).map(c=>c.trim()).filter(Boolean)});setCodes('');return r;})}><Plus/>{busy?'กำลังเพิ่ม...':'เพิ่มรหัส'}</Button><div className="mt-6 max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3">Passcode</th><th className="p-3">การจัดสรร</th></tr></thead><tbody>{(!isLoading?data.passcodes:[])?.map(p=><tr key={p.id} className="border-b border-border"><td className="break-all p-3 font-mono">{p.code_value}</td><td className="p-3">{p.assigned_to?p.users?.username||'จองแล้ว':'พร้อมจัดสรร'}</td></tr>)}</tbody></table>{isLoading&&<DataSkeleton label="กำลังโหลด Passcode…"/>}<Pagination page={page} pageSize={50} total={data.pagination.total} onChange={setPage} loading={isLoading}/></div></Card>:<><Card><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-bold"><Upload size={18} className="text-gold"/>นำเข้าหรือเพิ่มรายชื่อนักศึกษา</h3><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={()=>setShowDbSelect(!showDbSelect)}><Users size={14} className="mr-1"/>เลือกจากระบบ</Button><Button variant="outline" size="sm" onClick={()=>setStudents([{username:'',full_name:''},...students])}><Plus size={14} className="mr-1"/>เพิ่ม 1 รายการ</Button><a download href="/templates/students.csv" className="flex items-center gap-1 text-xs text-primary"><Download size={14}/>ไฟล์ตัวอย่าง CSV</a></div></div><p className="my-3 text-xs leading-6 text-muted-foreground">หัวตาราง: username,full_name · เพิ่มผ่านฟอร์มหรืออัปโหลดไฟล์ (รองรับ UTF-8 และ Windows-874)</p>{showDbSelect && <DatabaseUserSelector id={id} currentRegistrations={data.registrations.map(r=>r.student_id)} onDone={()=>setShowDbSelect(false)} act={act} busy={busy} />}<Input type="file" accept=".csv,text/csv" aria-label="เลือกไฟล์รายชื่อ CSV" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];setFailure('');if(!f)return;try{if(f.size>250000)throw new Error('ไฟล์ใหญ่เกิน 250 KB');const buf=await f.arrayBuffer();let text='';try{text=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch{text=new TextDecoder('windows-874').decode(buf);}const parsed=parseStudentCsv(text);setStudents(p=>[...p,...parsed]);setFilename(f.name);}catch(err){setFailure(errorText(err));}e.target.value='';}}/>{students.length>0&&<div className="mt-4 rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">{filename?`${filename} และรายการที่เพิ่ม`:'รายการที่เพิ่ม'} · {students.length} คน</p><Button variant="ghost" size="sm" onClick={()=>{setStudents([]);setFilename('');}}>ล้างทั้งหมด</Button></div><div className="my-3 max-h-64 overflow-auto rounded border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-muted/90 backdrop-blur z-10"><tr><th className="p-2 font-medium">รหัสผู้ใช้</th><th className="p-2 font-medium">ชื่อ-นามสกุล</th><th className="p-2"></th></tr></thead><tbody>{students.map((s,i)=><tr key={i} className="border-t border-border"><td className="p-1"><Input className="h-8 text-xs" value={s.username} onChange={e=>setStudents(st=>st.map((x,idx)=>idx===i?{...x,username:e.target.value}:x))}/></td><td className="p-1"><Input className="h-8 text-xs" value={s.full_name} onChange={e=>setStudents(st=>st.map((x,idx)=>idx===i?{...x,full_name:e.target.value}:x))}/></td><td className="p-1 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={()=>setStudents(st=>st.filter((_,idx)=>idx!==i))}>✕</Button></td></tr>)}</tbody></table></div><Button loading={busy} disabled={busy||students.some(s=>!s.username||!s.full_name)} onClick={()=>void act(async()=>{const r=await api<{message:string}>(`/api/events/${id}/import`,{students});setStudents([]);setFilename('');return r;})}>{busy?'กำลังสร้างบัญชีและจองรหัส...':'ยืนยันนำเข้าและจอง Passcode'}</Button></div>}</Card><Card className="mt-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">ผู้มีสิทธิ์เข้าร่วม</h3><Input className="max-w-64" aria-label="ค้นหารายชื่อ" placeholder="ค้นหารหัสหรือชื่อ" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3">รหัสนักศึกษา / ชื่อ</th><th className="p-3">สถานะ</th><th className="p-3">เวลา / วิธี</th></tr></thead><tbody>{(!isLoading?rows:[]).map(r=><tr key={r.id} className="border-b border-border"><td className="p-3"><p className="font-bold">{r.users?.full_name}</p><p className="mt-1 text-muted-foreground">{r.users?.username}</p></td><td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 ${r.is_attended?'bg-green-50 text-green-700':'bg-muted text-muted-foreground'}`}>{r.is_attended?'เช็คอินแล้ว':'รอเข้าร่วม'}</span></td><td className="p-3">{r.check_in_time?new Date(r.check_in_time).toLocaleTimeString('th-TH'):'—'}<p className="mt-1 text-[10px] text-muted-foreground">{r.check_in_method}</p></td></tr>)}</tbody></table>{!isLoading&&rows.length===0&&<p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีรายชื่อที่ตรงกับการค้นหา</p>}{isLoading&&<DataSkeleton label="กำลังโหลดรายชื่อ…"/>}<Pagination page={page} pageSize={50} total={data.pagination.total} onChange={setPage} loading={isLoading}/></div></Card></>}</div>;
}
function DatabaseUserSelector({ id, currentRegistrations, onDone, act, busy }: { id: string, currentRegistrations: string[], onDone: () => void, act: (fn: () => Promise<{message:string}>) => void, busy: boolean }) {
  const [mode, setMode] = useState<'search'|'bulk'>('search');
  const [query, setQuery] = useState('');
  const [page,setPage]=useState(1);
  const search=useDebouncedValue(query);
  const { data, error, isLoading, refresh } = useResource<UserList>(mode==='search'?`/api/users?picker=1&role=STUDENT&excludeEvent=${id}&page=${page}&q=${encodeURIComponent(search)}`:null, {keepPreviousData:true});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkIds, setBulkIds] = useState('');
  const availableUsers = (data?.users || []).filter(u => u.role === 'STUDENT' && !currentRegistrations.includes(u.id));

  return <div className="mt-4 rounded-xl border p-4 bg-muted/30">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button variant={mode==='search'?'default':'outline'} size="sm" onClick={() => setMode('search')}>เลือกจากรายชื่อ</Button>
        <Button variant={mode==='bulk'?'default':'outline'} size="sm" onClick={() => setMode('bulk')}>กรอกรหัสนักศึกษา (หลายคน)</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onDone}>ปิด</Button>
    </div>

    {mode === 'search' ? (
      <>
        <Input placeholder="ค้นหารหัสหรือชื่อ..." value={query} onChange={e => {setQuery(e.target.value);setPage(1);}} className="mb-4" />
        <div className="max-h-64 overflow-auto rounded border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <tr>
                <th className="p-2 w-8"><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(prev => [...new Set([...prev,...availableUsers.map(u => u.id)])]); else setSelectedIds(prev => prev.filter(id => !availableUsers.some(u => u.id === id))); }} checked={availableUsers.length > 0 && availableUsers.every(u => selectedIds.includes(u.id))} /></th>
                <th className="p-2 font-medium">รหัสผู้ใช้</th>
                <th className="p-2 font-medium">ชื่อ-นามสกุล</th>
              </tr>
            </thead>
            <tbody>
              {(!isLoading?availableUsers:[]).map(u => <tr key={u.id} className="border-t border-border">
                <td className="p-2 text-center"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e => { if (e.target.checked) setSelectedIds(prev => [...prev, u.id]); else setSelectedIds(prev => prev.filter(id => id !== u.id)); }} /></td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.full_name}</td>
              </tr>)}
              {!isLoading && availableUsers.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">ไม่พบรายชื่อ (หรือทุกคนในระบบอยู่ในกิจกรรมนี้แล้ว)</td></tr>}
            </tbody>
          </table>
        </div>
        {isLoading && <DataSkeleton label="กำลังค้นหานักศึกษา…"/>}
        {error && <RetryLoad message={error} retry={refresh}/>}
        {data && <Pagination page={page} pageSize={50} total={data.pagination.total} onChange={setPage} loading={isLoading}/>}
        <div className="mt-4">
          <Button loading={busy} disabled={busy || selectedIds.length === 0} onClick={() => { act(async () => { const r = await api<{message:string}>(`/api/events/${id}/allocate`, { userIds: selectedIds }); onDone(); return r; }); }}>{busy ? 'กำลังเพิ่ม...' : `เพิ่ม ${selectedIds.length} คนที่เลือก`}</Button>
        </div>
      </>
    ) : (
      <>
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="วางรหัสนักศึกษาที่นี่ คั่นด้วยการขึ้นบรรทัดใหม่ คอมม่า หรือช่องว่าง" value={bulkIds} onChange={e => setBulkIds(e.target.value)} />
        <div className="mt-4 flex gap-2">
           <Button loading={busy} disabled={busy || !bulkIds.trim()} onClick={() => {
             act(async () => {
               const usernames = bulkIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
               if (usernames.length === 0) return { message: 'กรุณากรอกรหัสนักศึกษา' };
               const r = await api<{message:string}>(`/api/events/${id}/allocate`, { usernames });
               onDone();
               return r;
             });
           }}>{busy ? 'กำลังเพิ่ม...' : `เพิ่มจากรหัสที่กรอก`}</Button>
        </div>
      </>
    )}
  </div>;
}

function UserManagement() {
  const [query,setQuery]=useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page,setPage]=useState(1);
  const debouncedQuery=useDebouncedValue(query);
  const debouncedYear=useDebouncedValue(yearFilter);
  const {data,error,refresh,isLoading,isRefreshing}=useResource<UserList>(`/api/users?q=${encodeURIComponent(debouncedQuery)}&page=${page}&faculty=${encodeURIComponent(facultyFilter)}&major=${encodeURIComponent(majorFilter)}&academic_year=${encodeURIComponent(debouncedYear)}`, {keepPreviousData:true});
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const [busy,setBusy]=useState(false);
  const [reset,setReset]=useState<Profile|null>(null);
  const [editUser,setEditUser]=useState<Profile|null>(null);

  const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useResource<{settings:Settings}>('/api/settings');
  const orgs = settingsData?.settings?.organization || [];
  const faculties = orgs.map((o: Organization) => o.name).filter(Boolean) as string[];
  const allMajors = Array.from(new Set(orgs.flatMap((o: Organization) => o.majors))).filter(Boolean) as string[];

  const [selectedFaculty, setSelectedFaculty] = useState('');
  const availableMajors = (orgs.find((o: Organization) => o.name === selectedFaculty)?.majors || []) as string[];

  const [editFaculty, setEditFaculty] = useState('');
  const editAvailableMajors = (orgs.find((o: Organization) => o.name === editFaculty)?.majors || []) as string[];

  const filteredUsers = data?.users || [];

  return <div className="grid gap-6 lg:grid-cols-[1fr_350px]"><Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">บัญชีผู้ใช้</h2><Input placeholder="ค้นหารหัสผู้ใช้หรือชื่อ" aria-label="ค้นหาบัญชี" className="max-w-64" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></div><div className="mb-4 flex flex-wrap gap-2"><select value={facultyFilter} onChange={e=>{setFacultyFilter(e.target.value);setPage(1);}} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกคณะ</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select><select value={majorFilter} onChange={e=>{setMajorFilter(e.target.value);setPage(1);}} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกสาขา</option>{allMajors.map((m:string)=><option key={m} value={m as string}>{m as string}</option>)}</select><Input placeholder="กรองชั้นปี" value={yearFilter} onChange={e=>{setYearFilter(e.target.value);setPage(1);}} className="w-24 text-xs h-8" /></div><p className="mb-4 text-xs text-muted-foreground">แสดงหน้าละ 50 บัญชี ค้นหาและกรองจากผู้ใช้ทั้งหมด</p><RefreshStatus active={isRefreshing}/><Notice text={error||failure}/><Notice text={message} success/>{busy&&<LoadingStatus label="กำลังบันทึกข้อมูลบัญชี…" compact/>}<div className="divide-y divide-border">{(!isLoading?filteredUsers:[]).map(u=><div key={u.id} className="flex items-center justify-between gap-2 py-4"><div><p className="text-sm font-bold">{u.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{u.username} · {u.role}</p><p className="mt-1 text-[10px] text-muted-foreground">{u.faculty?`คณะ${u.faculty}`:''} {u.major?`สาขา${u.major}`:''} {u.academic_year?`ปี ${u.academic_year}`:''} {u.plaintext_password?`| รหัสผ่าน: ${u.plaintext_password}`:''}</p></div>{u.role!=='ADMIN'&&<div className="flex flex-wrap gap-1"><Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={()=>{setEditUser(u);setEditFaculty(u.faculty||'');}}>แก้ไข</Button><Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={()=>setReset(u)}><KeyRound size={12} className="mr-1"/>เปลี่ยนรหัส</Button><Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async()=>{if(confirm("ยืนยันการลบบัญชีผู้ใช้นี้?")) { setBusy(true); try { await api(`/api/users?id=${u.id}`, {}, "DELETE"); await refresh(); } catch(e) { setFailure(errorText(e)); } setBusy(false); }}}>ลบ</Button></div>}</div>)}{!isLoading&&!error&&filteredUsers.length===0 && <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบบัญชี</p>}{isLoading&&<DataSkeleton label="กำลังโหลดบัญชีผู้ใช้…"/>}</div>{data&&<Pagination page={page} pageSize={50} total={data.pagination.total} onChange={setPage} loading={isLoading}/>}</Card><div><Card><h2 className="mb-5 flex items-center gap-2 font-bold"><Settings2 size={18}/>สร้างบัญชี</h2>{settingsLoading&&<LoadingStatus label="กำลังโหลดคณะและสาขา…" compact/>}<Notice text={settingsError}/><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setFailure('');setMessage('');try{const r=await api<{message:string}>('/api/users',Object.fromEntries(f));setMessage(r.message);form.reset();setSelectedFaculty('');await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผู้ใช้<Input name="username" required/></label><label>ชื่อ–นามสกุล<Input name="full_name" required maxLength={200}/></label><label>คณะ (ไม่บังคับ)<select name="faculty" value={selectedFaculty} onChange={e=>setSelectedFaculty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label><label>สาขา (ไม่บังคับ)<select name="major" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{availableMajors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label><label>ชั้นปี (ไม่บังคับ)<Input name="academic_year" /></label><label>สิทธิ์<select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><option value="STUDENT">นักศึกษา</option><option value="STAFF">ทีมงาน</option></select></label><label>รหัสผ่านเริ่มต้น<Input name="password" type="text" required autoComplete="new-password"/></label><Button loading={busy} disabled={busy} type="submit" className="w-full">{busy?'กำลังบันทึก...':'สร้างบัญชี'}</Button></form></Card>

  {editUser&&<Card className="mt-5"><h2 className="font-bold mb-3">แก้ไขข้อมูล {editUser.username}</h2><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setFailure('');try{const r=await api<{message:string}>('/api/users',{id:editUser.id,username:f.get('username'),password:f.get('password'),full_name:f.get('full_name'),faculty:f.get('faculty'),major:f.get('major'),academic_year:f.get('academic_year')},'PUT');setMessage(r.message);setEditUser(null);await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผู้ใช้<Input name="username" defaultValue={editUser.username} required /></label><label>ชื่อ–นามสกุล<Input name="full_name" defaultValue={editUser.full_name} required maxLength={200}/></label><label>คณะ<select name="faculty" value={editFaculty} onChange={e=>setEditFaculty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label><label>สาขา<select name="major" defaultValue={editUser.major||''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{editAvailableMajors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label><label>ชั้นปี<Input name="academic_year" defaultValue={editUser.academic_year||''}/></label><label>รหัสผ่าน (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)<Input name="password" placeholder="ตั้งรหัสผ่านใหม่..." /></label><div className="mt-4 flex gap-2"><Button type="submit" loading={busy} disabled={busy}>บันทึกแก้ไข</Button><Button type="button" variant="ghost" onClick={()=>setEditUser(null)}>ยกเลิก</Button></div></form></Card>}

  {reset&&<Card className="mt-5"><h2 className="font-bold">ตั้งรหัสผ่านใหม่</h2><p className="my-3 text-sm">{reset.full_name} ({reset.username})</p><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setFailure('');try{const r=await api<{message:string}>('/api/users',{id:reset.id,password:f.get('password')},'PATCH');setMessage(r.message);setReset(null);await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผ่านใหม่<Input type="text" name="password" required autoComplete="new-password"/></label><div className="mt-4 flex gap-2"><Button type="submit" loading={busy} disabled={busy}>เปลี่ยนรหัส</Button><Button type="button" variant="ghost" onClick={()=>setReset(null)}>ยกเลิก</Button></div></form></Card>}</div></div>;
}

function SystemSettings() {
  const { data, error, refresh } = useResource<{settings:Settings}>('/api/settings');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Local state for organization structure
  const [orgs, setOrgs] = useState<{name:string, majors:string[]}[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (data && !loaded) {
    if (data.settings?.organization) {
      setOrgs(structuredClone(data.settings.organization));
    } else if (data.settings?.faculties) {
      // Migrate from old flat structure
      setOrgs(data.settings.faculties.map((f: string) => ({ name: f, majors: [] })));
    }
    setLoaded(true);
  }

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const r = await api<{message:string}>('/api/settings', { organization: orgs }, 'POST');
      setMessage(r.message);
      await refresh();
    } catch (err) {
      alert(err);
    } finally { setBusy(false); }
  };

  if (!data) return error?<RetryLoad message={error} retry={refresh}/>:<DataSkeleton label="กำลังโหลดการตั้งค่า…"/>;

  return <Card>
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-bold text-lg">การตั้งค่าองค์กร (คณะและสาขา)</h2>
      <Button onClick={save} loading={busy} disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}</Button>
    </div>
    <Notice text={message} success />

    <div className="space-y-4">
      {orgs.map((org, i) => (
        <div key={i} className="border p-4 rounded-xl bg-slate-50/50">
          <div className="flex items-center justify-between mb-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold w-12">คณะ:</span>
              <Input value={org.name} onChange={e => { const n = [...orgs]; n[i].name = e.target.value; setOrgs(n); }} placeholder="ชื่อคณะ..." className="w-[300px] font-bold bg-white" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOrgs(orgs.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-600 hover:bg-red-50">ลบคณะนี้</Button>
          </div>
          <div className="pl-14 space-y-2">
            {org.majors.map((m, j) => (
              <div key={j} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10">สาขา:</span>
                <Input value={m} onChange={e => { const n = [...orgs]; n[i].majors[j] = e.target.value; setOrgs(n); }} placeholder="ชื่อสาขา..." className="h-8 w-[250px] text-sm bg-white" />
                <Button variant="ghost" size="sm" onClick={() => { const n = [...orgs]; n[i].majors.splice(j, 1); setOrgs(n); }} className="h-8 text-xs text-muted-foreground">ลบ</Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-10"></span>
              <Button variant="outline" size="sm" className="h-8 text-xs border-dashed" onClick={() => { const n = [...orgs]; n[i].majors.push(''); setOrgs(n); }}>+ เพิ่มสาขา</Button>
            </div>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <Button variant="outline" className="w-full border-dashed" onClick={() => setOrgs([...orgs, { name: '', majors: [] }])}>+ เพิ่มคณะใหม่</Button>
      </div>
    </div>
  </Card>;
}
