const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf-8');

// Replace UserManagement
const umStart = code.indexOf('function UserManagement() {');
const sysStart = code.indexOf('function SystemSettings() {');

const beforeUM = code.slice(0, umStart);

const newUserManagement = `
function UserManagement() {
  const [query,setQuery]=useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const {data,error,refresh}=useResource<{users:Profile[]}>(\`/api/users?q=\${encodeURIComponent(query)}\`);
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const [busy,setBusy]=useState(false);
  const [reset,setReset]=useState<Profile|null>(null);

  const { data: settingsData } = useResource<{settings:any}>('/api/settings');
  const orgs = settingsData?.settings?.organization || [];
  const faculties = orgs.map((o: any) => o.name).filter(Boolean);
  const allMajors = Array.from(new Set(orgs.flatMap((o: any) => o.majors))).filter(Boolean);

  const [selectedFaculty, setSelectedFaculty] = useState('');
  const availableMajors = orgs.find((o: any) => o.name === selectedFaculty)?.majors || [];

  const filteredUsers = (data?.users || []).filter(u => {
    if (facultyFilter && u.faculty !== facultyFilter) return false;
    if (majorFilter && u.major !== majorFilter) return false;
    if (yearFilter && u.academic_year !== yearFilter) return false;
    return true;
  });

  return <div className="grid gap-6 lg:grid-cols-[1fr_350px]"><Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">บัญชีผู้ใช้</h2><Input placeholder="ค้นหารหัสผู้ใช้หรือชื่อ" aria-label="ค้นหาบัญชี" className="max-w-64" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="mb-4 flex gap-2"><select value={facultyFilter} onChange={e=>setFacultyFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกคณะ</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select><select value={majorFilter} onChange={e=>setMajorFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกสาขา</option>{allMajors.map((m:string)=><option key={m} value={m as string}>{m as string}</option>)}</select><Input placeholder="กรองชั้นปี" value={yearFilter} onChange={e=>setYearFilter(e.target.value)} className="w-24 text-xs h-8" /></div><p className="mb-4 text-xs text-muted-foreground">แสดงสูงสุด 100 บัญชี ใช้ช่องค้นหาเพื่อกรองข้อมูล</p><Notice text={error||failure}/><Notice text={message} success/><div className="divide-y divide-border">{filteredUsers.map(u=><div key={u.id} className="flex items-center justify-between gap-2 py-4"><div><p className="text-sm font-bold">{u.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{u.username} · {u.role}</p><p className="mt-1 text-[10px] text-muted-foreground">{u.faculty?\`คณะ\${u.faculty}\`:''} {u.major?\`สาขา\${u.major}\`:''} {u.academic_year?\`ปี \${u.academic_year}\`:''} {u.plaintext_password?\`| รหัสผ่าน: \${u.plaintext_password}\`:''}</p></div>{u.role!=='ADMIN'&&<Button variant="ghost" size="sm" onClick={()=>setReset(u)}><KeyRound/>รีเซ็ตรหัส</Button>}</div>)}{filteredUsers.length===0 && <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบบัญชี</p>}</div></Card><div><Card><h2 className="mb-5 flex items-center gap-2 font-bold"><Settings2 size={18}/>สร้างบัญชี</h2><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setFailure('');setMessage('');try{const r=await api<{message:string}>('/api/users',Object.fromEntries(f));setMessage(r.message);form.reset();setSelectedFaculty('');await refresh();}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผู้ใช้<Input name="username" required/></label><label>ชื่อ–นามสกุล<Input name="full_name" required maxLength={200}/></label><label>คณะ (ไม่บังคับ)<select name="faculty" value={selectedFaculty} onChange={e=>setSelectedFaculty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label><label>สาขา (ไม่บังคับ)<select name="major" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{availableMajors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label><label>ชั้นปี (ไม่บังคับ)<Input name="academic_year" /></label><label>สิทธิ์<select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><option value="STUDENT">นักศึกษา</option><option value="STAFF">ทีมงาน</option></select></label><label>รหัสผ่านเริ่มต้น<Input name="password" type="text" required autoComplete="new-password"/></label><Button disabled={busy} type="submit" className="w-full">{busy?'กำลังบันทึก...':'สร้างบัญชี'}</Button></form></Card>{reset&&<Card className="mt-5"><h2 className="font-bold">ตั้งรหัสผ่านใหม่</h2><p className="my-3 text-sm">{reset.full_name} ({reset.username})</p><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setFailure('');try{const r=await api<{message:string}>('/api/users',{id:reset.id,password:f.get('password')},'PATCH');setMessage(r.message);setReset(null);}catch(err){setFailure(errorText(err));}finally{setBusy(false);}}}><label>รหัสผ่านใหม่<Input type="text" name="password" required autoComplete="new-password"/></label><div className="mt-4 flex gap-2"><Button type="submit" disabled={busy}>บันทึก</Button><Button type="button" variant="ghost" onClick={()=>setReset(null)}>ยกเลิก</Button></div></form></Card>}</div></div>;
}

function SystemSettings() {
  const { data, error, refresh } = useResource<{settings:any}>('/api/settings');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  
  // Local state for organization structure
  const [orgs, setOrgs] = useState<{name:string, majors:string[]}[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (data && !loaded) {
    if (data.settings?.organization) {
      setOrgs(data.settings.organization);
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

  if (!data) return <Notice text={error || 'กำลังโหลดข้อมูล...'} />;
  
  return <Card>
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-bold text-lg">การตั้งค่าองค์กร (คณะและสาขา)</h2>
      <Button onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}</Button>
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
`;

fs.writeFileSync('src/app/admin/page.tsx', beforeUM + newUserManagement);
console.log('Done rewriting UserManagement and SystemSettings');
