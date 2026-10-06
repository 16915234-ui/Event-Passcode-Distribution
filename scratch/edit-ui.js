const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf-8');

// 1. Add Trash icon import
if(!code.includes('Trash')) code = code.replace('lucide-react\';', 'Trash } from \'lucide-react\';');

// 2. Add Delete Event button in EventWorkspace
code = code.replace(
  '<Button variant={tab===\'settings\'?\'default\':\'ghost\'} size="sm" onClick={()=>setTab(\'settings\')}>ตั้งค่ากิจกรรม</Button>',
  '<Button variant={tab===\'settings\'?\'default\':\'ghost\'} size="sm" onClick={()=>setTab(\'settings\')}>ตั้งค่ากิจกรรม</Button><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async () => { if(confirm("ยืนยันการลบกิจกรรมนี้? ข้อมูลการเช็คอินทั้งหมดจะหายไปและไม่สามารถกู้คืนได้")) { await api(`/api/events/${id}`, {}, "DELETE"); window.location.reload(); } }}><Trash size={16} className="mr-1"/>ลบกิจกรรม</Button>'
);

// 3. Add Remove Student from Event button
code = code.replace(
  '{s.is_attended?<span className="text-xs font-bold text-green-700">เช็คอินแล้ว</span>:<span className="text-xs text-muted-foreground">รอเช็คอิน</span>}',
  '{s.is_attended?<span className="text-xs font-bold text-green-700">เช็คอินแล้ว</span>:<span className="text-xs text-muted-foreground">รอเช็คอิน</span>}<Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50" onClick={async () => { if(confirm("ลบนักศึกษาออกจากกิจกรรมนี้?")) { await api(`/api/events/${id}/registrations/${s.users?.id}`, {}, "DELETE"); refresh(); } }}>ลบออก</Button>'
);

// 4. Update UserManagement to include Edit and Delete actions
// Let's replace the whole UserManagement function since it's getting complex
const umStart = code.indexOf('function UserManagement() {');
const sysStart = code.indexOf('function SystemSettings() {');
const beforeUM = code.slice(0, umStart);
const afterUM = code.slice(sysStart);

const newUserManagement = `function UserManagement() {
  const [query,setQuery]=useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const {data,error,refresh}=useResource<{users:Profile[]}>(\`/api/users?q=\${encodeURIComponent(query)}\`);
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const [busy,setBusy]=useState(false);
  const [reset,setReset]=useState<Profile|null>(null);
  const [editUser,setEditUser]=useState<Profile|null>(null);

  const { data: settingsData } = useResource<{settings:any}>('/api/settings');
  const orgs = settingsData?.settings?.organization || [];
  const faculties = orgs.map((o: any) => o.name).filter(Boolean) as string[];
  const allMajors = Array.from(new Set(orgs.flatMap((o: any) => o.majors))).filter(Boolean) as string[];

  const [selectedFaculty, setSelectedFaculty] = useState('');
  const availableMajors = (orgs.find((o: any) => o.name === selectedFaculty)?.majors || []) as string[];
  
  const [editFaculty, setEditFaculty] = useState('');
  const editAvailableMajors = (orgs.find((o: any) => o.name === editFaculty)?.majors || []) as string[];

  const filteredUsers = (data?.users || []).filter(u => {
    if (facultyFilter && u.faculty !== facultyFilter) return false;
    if (majorFilter && u.major !== majorFilter) return false;
    if (yearFilter && u.academic_year !== yearFilter) return false;
    return true;
  });

  return <div className="grid gap-6 lg:grid-cols-[1fr_350px]"><Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">บัญชีผู้ใช้</h2><Input placeholder="ค้นหารหัสผู้ใช้หรือชื่อ" aria-label="ค้นหาบัญชี" className="max-w-64" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="mb-4 flex gap-2"><select value={facultyFilter} onChange={e=>setFacultyFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกคณะ</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select><select value={majorFilter} onChange={e=>setMajorFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกสาขา</option>{allMajors.map((m:string)=><option key={m} value={m as string}>{m as string}</option>)}</select><Input placeholder="กรองชั้นปี" value={yearFilter} onChange={e=>setYearFilter(e.target.value)} className="w-24 text-xs h-8" /></div><p className="mb-4 text-xs text-muted-foreground">แสดงสูงสุด 100 บัญชี ใช้ช่องค้นหาเพื่อกรองข้อมูล</p><Notice text={error||failure}/><Notice text={message} success/><div className="divide-y divide-border">{filteredUsers.map(u=><div key={u.id} className="flex items-center justify-between gap-2 py-4"><div><p className="text-sm font-bold">{u.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{u.username} · {u.role}</p><p className="mt-1 text-[10px] text-muted-foreground">{u.faculty?\`คณะ\${u.faculty}\`:''} {u.major?\`สาขา\${u.major}\`:''} {u.academic_year?\`ปี \${u.academic_year}\`:''} {u.plaintext_password?\`| รหัสผ่าน: \${u.plaintext_password}\`:''}</p></div>{u.role!=='ADMIN'&&<div className="flex flex-wrap gap-1"><Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={()=>{setEditUser(u);setEditFaculty(u.faculty||'');}}>แก้ไข</Button><Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={()=>setReset(u)}><KeyRound size={12} className="mr-1"/>เปลี่ยนรหัส</Button><Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async()=>{if(confirm("ยืนยันการลบบัญชีผู้ใช้นี้?")) { setBusy(true); try { await api(\`/api/users?id=\${u.id}\`, {}, "DELETE"); await refresh(); } catch(e) { setFailure(errorText(e)); } setBusy(false); }}}>ลบ</Button></div>}</div>)}{filteredUsers.length===0 && <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบบัญชี</p>}</div></Card><div><Card><h2 className="mb-5 flex items-center gap-2 font-bold"><Settings2 size={18}/>สร้างบัญชี</h2><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setFailure('');setMessage('');try{const r=await api<{message:string}>('/api/users',Object.fromEntries(f));setMessage(r.message);form.reset();setSelectedFaculty('');await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผู้ใช้<Input name="username" required/></label><label>ชื่อ–นามสกุล<Input name="full_name" required maxLength={200}/></label><label>คณะ (ไม่บังคับ)<select name="faculty" value={selectedFaculty} onChange={e=>setSelectedFaculty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label><label>สาขา (ไม่บังคับ)<select name="major" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{availableMajors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label><label>ชั้นปี (ไม่บังคับ)<Input name="academic_year" /></label><label>สิทธิ์<select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><option value="STUDENT">นักศึกษา</option><option value="STAFF">ทีมงาน</option></select></label><label>รหัสผ่านเริ่มต้น<Input name="password" type="text" required autoComplete="new-password"/></label><Button disabled={busy} type="submit" className="w-full">{busy?'กำลังบันทึก...':'สร้างบัญชี'}</Button></form></Card>
  
  {editUser&&<Card className="mt-5"><h2 className="font-bold mb-3">แก้ไขข้อมูล {editUser.username}</h2><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setFailure('');try{const r=await api<{message:string}>('/api/users',{id:editUser.id,full_name:f.get('full_name'),faculty:f.get('faculty'),major:f.get('major'),academic_year:f.get('academic_year')},'PUT');setMessage(r.message);setEditUser(null);await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>ชื่อ–นามสกุล<Input name="full_name" defaultValue={editUser.full_name} required maxLength={200}/></label><label>คณะ<select name="faculty" value={editFaculty} onChange={e=>setEditFaculty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label><label>สาขา<select name="major" defaultValue={editUser.major||''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{editAvailableMajors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label><label>ชั้นปี<Input name="academic_year" defaultValue={editUser.academic_year||''}/></label><div className="mt-4 flex gap-2"><Button type="submit" disabled={busy}>บันทึกแก้ไข</Button><Button type="button" variant="ghost" onClick={()=>setEditUser(null)}>ยกเลิก</Button></div></form></Card>}
  
  {reset&&<Card className="mt-5"><h2 className="font-bold">ตั้งรหัสผ่านใหม่</h2><p className="my-3 text-sm">{reset.full_name} ({reset.username})</p><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setFailure('');try{const r=await api<{message:string}>('/api/users',{id:reset.id,password:f.get('password')},'PATCH');setMessage(r.message);setReset(null);await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผ่านใหม่<Input type="text" name="password" required autoComplete="new-password"/></label><div className="mt-4 flex gap-2"><Button type="submit" disabled={busy}>เปลี่ยนรหัส</Button><Button type="button" variant="ghost" onClick={()=>setReset(null)}>ยกเลิก</Button></div></form></Card>}</div></div>;
}

`;

fs.writeFileSync('src/app/admin/page.tsx', beforeUM + newUserManagement + afterUM);
console.log('UI updated');
