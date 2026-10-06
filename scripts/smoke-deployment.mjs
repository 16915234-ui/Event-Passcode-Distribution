import assert from 'node:assert/strict';
const base=process.argv[2];
if(!base?.startsWith('https://'))throw new Error('Expected deployment HTTPS URL');
const login=await fetch(`${base}/login`);assert.equal(login.status,200);const html=await login.text();assert.ok(html.includes('ARU Event Pass'));assert.ok(html.includes('รหัสนักศึกษา'));
console.log('PASS: login page responds with ARU login form');
for(const path of ['/admin','/staff','/student','/display']){const r=await fetch(base+path,{redirect:'manual'});assert.ok([302,303,307,308].includes(r.status));assert.ok(r.headers.get('location')?.includes('/login'));console.log(`PASS: ${path} redirects anonymous users`);}
for(const path of ['/api/events','/api/users','/api/checkin/status?eventId=a0000000-0000-0000-0000-000000000001','/api/events/a0000000-0000-0000-0000-000000000001/totp']){const r=await fetch(base+path);assert.equal(r.status,401);console.log(`PASS: ${path} rejects anonymous access`);}
for(const path of ['/api/checkin/staff','/api/checkin/dynamic']){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401);console.log(`PASS: ${path} rejects anonymous writes`);}
for(const [path,magic] of [['/brand/aru-secondary.png','89504e47'],['/fonts/line-seed-regular.woff2','774f4632'],['/fonts/th-sarabun.ttf','00010000']]){const r=await fetch(base+path);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.subarray(0,4).toString('hex'),magic);console.log(`PASS: ${path} is a valid asset`);}
