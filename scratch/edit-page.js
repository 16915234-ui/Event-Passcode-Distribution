const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf-8');

// 1. Add current GPS button in EventForm
code = code.replace(
  '<p className="mb-2 text-sm font-medium">กำหนดจุดเช็คอินบนแผนที่ (คลิกเพื่อเลือกพิกัด)</p>',
  `<div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">กำหนดจุดเช็คอินบนแผนที่ (คลิกเพื่อเลือกพิกัด)</p><Button type="button" variant="outline" size="sm" onClick={() => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition(pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); }, () => alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตการเข้าถึง GPS หรือเลือกบนแผนที่')); } }}><MapPin size={14} className="mr-1" /> ใช้ตำแหน่งปัจจุบัน</Button></div>`
);

// 2. Modify DatabaseUserSelector to include 'bulk' mode
code = code.replace(
  /function DatabaseUserSelector[\s\S]*?\}\s*function UserManagement/g,
  `function DatabaseUserSelector({ id, currentRegistrations, onDone, act, busy }: { id: string, currentRegistrations: string[], onDone: () => void, act: (fn: () => Promise<{message:string}>) => void, busy: boolean }) {
  const [mode, setMode] = useState<'search'|'bulk'>('search');
  const [query, setQuery] = useState('');
  const { data, error } = useResource<{users:Profile[]}>( \`/api/users?q=\${encodeURIComponent(query)}\`);
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
        <Input placeholder="ค้นหารหัสหรือชื่อ..." value={query} onChange={e => setQuery(e.target.value)} className="mb-4" />
        <div className="max-h-64 overflow-auto rounded border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <tr>
                <th className="p-2 w-8"><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(availableUsers.map(u => u.id)); else setSelectedIds([]); }} checked={availableUsers.length > 0 && selectedIds.length === availableUsers.length} /></th>
                <th className="p-2 font-medium">รหัสผู้ใช้</th>
                <th className="p-2 font-medium">ชื่อ-นามสกุล</th>
              </tr>
            </thead>
            <tbody>
              {availableUsers.map(u => <tr key={u.id} className="border-t border-border">
                <td className="p-2 text-center"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e => { if (e.target.checked) setSelectedIds(prev => [...prev, u.id]); else setSelectedIds(prev => prev.filter(id => id !== u.id)); }} /></td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.full_name}</td>
              </tr>)}
              {availableUsers.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">ไม่พบรายชื่อ (หรือทุกคนในระบบอยู่ในกิจกรรมนี้แล้ว)</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button disabled={busy || selectedIds.length === 0} onClick={() => { act(async () => { const r = await api<{message:string}>(\`/api/events/\${id}/allocate\`, { userIds: selectedIds }); onDone(); return r; }); }}>{busy ? 'กำลังเพิ่ม...' : \`เพิ่ม \${selectedIds.length} คนที่เลือก\`}</Button>
        </div>
      </>
    ) : (
      <>
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="วางรหัสนักศึกษาที่นี่ คั่นด้วยการขึ้นบรรทัดใหม่ คอมม่า หรือช่องว่าง" value={bulkIds} onChange={e => setBulkIds(e.target.value)} />
        <div className="mt-4 flex gap-2">
           <Button disabled={busy || !bulkIds.trim()} onClick={() => { 
             act(async () => { 
               const usernames = bulkIds.split(/[\\s,]+/).map(s => s.trim()).filter(Boolean);
               if (usernames.length === 0) return { message: 'กรุณากรอกรหัสนักศึกษา' };
               const r = await api<{message:string}>(\`/api/events/\${id}/allocate\`, { usernames }); 
               onDone(); 
               return r; 
             }); 
           }}>{busy ? 'กำลังเพิ่ม...' : \`เพิ่มจากรหัสที่กรอก\`}</Button>
        </div>
      </>
    )}
  </div>;
}
function UserManagement`
);

// 3. Modify UserManagement to use settings for Dropdowns
code = code.replace(
  'function UserManagement() {',
  `function UserManagement() {
  const { data: settingsData } = useResource<{settings:any}>('/api/settings');
  const faculties = settingsData?.settings?.faculties || [];
  const majors = settingsData?.settings?.majors || [];
`
);

// Replace Inputs with Selects in UserManagement filtering
code = code.replace(
  '<Input placeholder="กรองคณะ" value={facultyFilter} onChange={e=>setFacultyFilter(e.target.value)} className="w-32 text-xs h-8" />',
  `<select value={facultyFilter} onChange={e=>setFacultyFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกคณะ</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select>`
);
code = code.replace(
  '<Input placeholder="กรองสาขา" value={majorFilter} onChange={e=>setMajorFilter(e.target.value)} className="w-32 text-xs h-8" />',
  `<select value={majorFilter} onChange={e=>setMajorFilter(e.target.value)} className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs"><option value="">ทุกสาขา</option>{majors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select>`
);

// Replace Inputs with Selects in creating user form
code = code.replace(
  '<label>คณะ (ไม่บังคับ)<Input name="faculty" /></label>',
  `<label>คณะ (ไม่บังคับ)<select name="faculty" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกคณะ --</option>{faculties.map((f:string)=><option key={f} value={f}>{f}</option>)}</select></label>`
);
code = code.replace(
  '<label>สาขา (ไม่บังคับ)<Input name="major" /></label>',
  `<label>สาขา (ไม่บังคับ)<select name="major" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- เลือกสาขา --</option>{majors.map((m:string)=><option key={m} value={m}>{m}</option>)}</select></label>`
);

// 4. Add the Settings Component
code = code.replace(
  `export default function AdminPage() {
  const {data,error,refresh}=useResource<{events:Event[]}>('/api/events');const [selected,setSelected]=useState('');const [creating,setCreating]=useState(false);const [tab,setTab]=useState<'events'|'users'>('events');`,
  `export default function AdminPage() {
  const {data,error,refresh}=useResource<{events:Event[]}>('/api/events');const [selected,setSelected]=useState('');const [creating,setCreating]=useState(false);const [tab,setTab]=useState<'events'|'users'|'settings'>('events');`
);

code = code.replace(
  `<Button variant={tab==='users'?'default':'ghost'} size="sm" onClick={()=>setTab('users')}><Users/>จัดการบัญชีผู้ใช้</Button>`,
  `<Button variant={tab==='users'?'default':'ghost'} size="sm" onClick={()=>setTab('users')}><Users/>จัดการบัญชีผู้ใช้</Button><Button variant={tab==='settings'?'default':'ghost'} size="sm" onClick={()=>setTab('settings')}><Settings2/>การตั้งค่าระบบ</Button>`
);

code = code.replace(
  `{tab==='users'?<UserManagement/>:<>{creating&&<EventForm onSaved={async event=>{await refresh();setSelected(event.id);setCreating(false);}}/>}`,
  `{tab==='users'?<UserManagement/>:tab==='settings'?<SystemSettings/>:<>{creating&&<EventForm onSaved={async event=>{await refresh();setSelected(event.id);setCreating(false);}}/>}`
);

// Append SystemSettings component at the end
code += `
function SystemSettings() {
  const { data, error, refresh } = useResource<{settings:any}>('/api/settings');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  
  if (!data) return <Notice text={error || 'กำลังโหลดข้อมูล...'} />;
  
  const faculties = data.settings?.faculties || [];
  const majors = data.settings?.majors || [];
  
  return <Card>
    <h2 className="mb-5 font-bold">การตั้งค่าองค์กร</h2>
    <Notice text={message} success />
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      const f = new FormData(e.currentTarget);
      const fs = f.get('faculties')?.toString().split(',').map(s=>s.trim()).filter(Boolean) || [];
      const ms = f.get('majors')?.toString().split(',').map(s=>s.trim()).filter(Boolean) || [];
      try {
        const r = await api<{message:string}>('/api/settings', { faculties: fs, majors: ms }, 'POST');
        setMessage(r.message);
        await refresh();
      } catch (err) {
        alert(err);
      } finally { setBusy(false); }
    }}>
      <div className="grid gap-4">
        <label>รายการคณะ (คั่นด้วยลูกน้ำ)<textarea name="faculties" defaultValue={faculties.join(', ')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24" placeholder="เช่น คณะวิทยาศาสตร์, คณะครุศาสตร์" /></label>
        <label>รายการสาขา (คั่นด้วยลูกน้ำ)<textarea name="majors" defaultValue={majors.join(', ')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24" placeholder="เช่น สาขาวิทยาการคอมพิวเตอร์, สาขาคณิตศาสตร์" /></label>
        <Button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</Button>
      </div>
    </form>
  </Card>;
}
`;

fs.writeFileSync('src/app/admin/page.tsx', code);
console.log('Updated page.tsx');
