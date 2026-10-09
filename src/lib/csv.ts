export interface CsvStudent {username:string;full_name:string;password?:string;faculty?:string;major?:string;academic_year?:string}
// RFC 4180 quoting, escaped quotes, BOM and CRLF; keep identifiers as strings.
export function parseStudentCsv(text:string):CsvStudent[] {
  text=text.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;let closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c==='"'){if(cell||closed)throw new Error('รูปแบบเครื่องหมายคำพูดใน CSV ไม่ถูกต้อง');quoted=true;}else if(c===','){row.push(cell);cell='';closed=false;}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}else{if(closed&&c.trim())throw new Error('ข้อมูลหลังเครื่องหมายคำพูดไม่ถูกต้อง');if(!closed)cell+=c;}}
  if(quoted)throw new Error('CSV มีเครื่องหมายคำพูดที่ยังไม่ปิด');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  const header=rows.shift()?.map(x=>x.trim().toLowerCase());
  if(!header||header[0]!=='username'||header[1]!=='full_name')throw new Error('2 คอลัมน์แรกต้องเป็น username,full_name ตามลำดับ');
  const hFac = header.indexOf('faculty'); const hMaj = header.indexOf('major'); const hYr = header.indexOf('academic_year');
  if(!rows.length||rows.length>100)throw new Error('นำเข้าครั้งละ 1–100 คน');
  const seen=new Set<string>();return rows.map((r,i)=>{
    const username=r[0]?.trim().toLowerCase();
    if(!username||!r[1]?.trim())throw new Error(`แถว ${i+2}: ตรวจสอบรหัส และชื่อให้ครบถ้วน`);
    if(seen.has(username))throw new Error(`รหัส ${username} ซ้ำในไฟล์`);seen.add(username);
    return{username,full_name:r[1].trim(),password:r[2]?.trim()||'',faculty:hFac>-1?r[hFac]?.trim():'',major:hMaj>-1?r[hMaj]?.trim():'',academic_year:hYr>-1?r[hYr]?.trim():''};
  });
}
