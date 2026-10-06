import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {generateTotpToken,validateTotpToken} from '../src/lib/totp';
import {haversineMeters,locationError} from '../src/lib/validation';
import {studentQr,verifyStudentQr} from '../src/lib/static-qr';
import {parseStudentCsv} from '../src/lib/csv';
import {normalizeLoginIdentifier,resolveLoginEmail} from '../src/lib/login-identifier';
test('login accepts actual Auth emails and keeps imported username accounts working',async()=>{
 assert.equal(normalizeLoginIdentifier('  Admin16915234@ARU.ac.th '),'admin16915234@aru.ac.th');
 assert.equal(normalizeLoginIdentifier('00123'),'00123');
 for(const invalid of [null,{},'', 'abc@', '@aru.ac.th','a b@aru.ac.th','a@@aru.ac.th','a'.repeat(255)])assert.equal(normalizeLoginIdentifier(invalid),null);
 let lookedUp=false;
 assert.equal(await resolveLoginEmail('admin16915234@aru.ac.th',async()=>{lookedUp=true;return null;}),'admin16915234@aru.ac.th');
 assert.equal(lookedUp,false);
 assert.equal(await resolveLoginEmail('16915234',async name=>name==='16915234'?'admin16915234@aru.ac.th':null),'admin16915234@aru.ac.th');
 assert.equal(await resolveLoginEmail('00123',async()=>null),'00123@accounts.aru.invalid');
});
const secret='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
test('TOTP accepts current and previous only, including exact time boundaries',()=>{
 const now=1791288000000;
 for(const offset of [0,4999]) {const time=now+offset;assert.equal(validateTotpToken(secret,generateTotpToken(secret,time),time).isValid,true);assert.equal(validateTotpToken(secret,generateTotpToken(secret,time-5000),time).isValid,true);assert.equal(validateTotpToken(secret,generateTotpToken(secret,time+5000),time).isValid,false);assert.equal(validateTotpToken(secret,generateTotpToken(secret,time-10000),time).isValid,false);}
 assert.equal(validateTotpToken(secret,'abcdef',now).isValid,false);
});
test('GPS rejects outside, stale, inaccurate, missing and malformed locations',()=>{
 const now=Date.now(),event={latitude:14.35,longitude:100.57,radius_meters:100};const p={latitude:14.35,longitude:100.57,accuracy:5,timestamp:now};
 assert.equal(haversineMeters(0,0,0,0),0);assert.ok(Math.abs(haversineMeters(0,0,0,1)-111195)<1);assert.equal(locationError(p,event,now),null);
 for(const bad of [{...p,latitude:14.36},{...p,latitude:NaN},{...p,longitude:181},{...p,timestamp:now-30001},{...p,timestamp:now+5001},{...p,accuracy:101},{...p,accuracy:-1}])assert.ok(locationError(bad,event,now));
 assert.ok(locationError(p,{...event,latitude:null},now));
});
test('signed static QR cannot be changed or used in another event',()=>{
 process.env.QR_SIGNING_SECRET='test-only-012345678901234567890123456789';
 const event='a0000000-0000-0000-0000-000000000001',student='b0000000-0000-0000-0000-000000000001';const qr=studentQr(event,student);
 assert.equal(verifyStudentQr(qr,event),student);assert.equal(verifyStudentQr(qr.replace(student,'b0000000-0000-0000-0000-000000000002'),event),null);assert.equal(verifyStudentQr(qr,'a0000000-0000-0000-0000-000000000002'),null);assert.equal(verifyStudentQr(student,event),null);
});
test('CSV preserves leading zeros, quoted commas and newlines and rejects invalid input',()=>{
 const rows=parseStudentCsv('\uFEFFusername,full_name,password\r\n00123,"นักศึกษา, ทดสอบ",password12345\r\n00124,"ชื่อ ""ทดสอบ""\nนามสกุล",password12345');
 assert.equal(rows[0].username,'00123');assert.equal(rows[0].full_name,'นักศึกษา, ทดสอบ');assert.equal(rows[1].full_name,'ชื่อ "ทดสอบ"\nนามสกุล');
 assert.throws(()=>parseStudentCsv('username,full_name,password\n00123,ชื่อ,short'));
 assert.throws(()=>parseStudentCsv('username,full_name,password\n00123,ชื่อ,password12345\n00123,ซ้ำ,password12345'));
 assert.throws(()=>parseStudentCsv('username,full_name,password\n00123,"ชื่อ,password12345'));
});
const setup=`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;`;
const admin='10000000-0000-0000-0000-000000000001',staff='10000000-0000-0000-0000-000000000002',s1='10000000-0000-0000-0000-000000000003',s2='10000000-0000-0000-0000-000000000004',s3='10000000-0000-0000-0000-000000000005',ev='20000000-0000-0000-0000-000000000001',ev2='20000000-0000-0000-0000-000000000002';
test('PostgreSQL: RLS, atomic allocation, attendance idempotency and service-only RPCs',async()=>{
 const db=new PGlite();try{await db.exec(setup);const migration=await readFile('supabase/migrations/202610060001_secure_portals.sql','utf8');await db.exec(migration);await db.exec(migration);
 for(const [id,role,username] of [[admin,'ADMIN','admin'],[staff,'STAFF','staff'],[s1,'STUDENT','00123'],[s2,'STUDENT','00124'],[s3,'STUDENT','00125']])await db.query('INSERT INTO auth.users VALUES($1,$2,null)',[id,JSON.stringify({aru_provisioned:true,role,username,full_name:username})]);
 // Untrusted signup metadata cannot grant a role.
 await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',['10000000-0000-0000-0000-000000000099','{}',JSON.stringify({aru_provisioned:true,role:'ADMIN',username:'evil'})]);
 assert.equal((await db.query('SELECT * FROM public.users')).rows.length,5);
 await db.query('INSERT INTO events(id,name,totp_secret,latitude,longitude) VALUES($1,$2,$3,14.35,100.57),($4,$5,$3,14.35,100.57)',[ev,'Test',secret,ev2,'Unassigned event']);
 await db.query('INSERT INTO passcodes(event_id,code_value) VALUES($1,$2),($1,$3)',[ev,'CODE-A','CODE-B']);
 await db.query('SELECT allocate_students($1,$2)',[ev,[s1,s2]]);
 await db.query('SELECT allocate_students($1,$2)',[ev,[s1,s2]]);
 assert.equal((await db.query('SELECT * FROM event_registrations')).rows.length,2);
 assert.equal((await db.query('SELECT * FROM passcodes WHERE assigned_to IS NOT NULL')).rows.length,2);
 await assert.rejects(db.query('SELECT allocate_students($1,$2)',[ev,[s3]]),/INSUFFICIENT_PASSCODES/);
 assert.equal((await db.query('SELECT * FROM event_registrations WHERE student_id=$1',[s3])).rows.length,0);
 // Simultaneous requests serialize on the event lock; assignments stay unique.
 await Promise.all([db.query('SELECT allocate_students($1,$2)',[ev,[s1,s2]]),db.query('SELECT allocate_students($1,$2)',[ev,[s2,s1]])]);
 await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${s1}';`);
 assert.equal((await db.query('SELECT id,name FROM events')).rows.length,1);
 assert.equal((await db.query('SELECT * FROM event_registrations')).rows.length,1);
 assert.equal((await db.query('SELECT * FROM passcodes')).rows.length,0);
 await assert.rejects(db.query('SELECT totp_secret FROM events'),/permission denied/);
 await assert.rejects(db.query('UPDATE event_registrations SET is_attended=true'),/permission denied/);
 await assert.rejects(db.query('UPDATE users SET role=\'ADMIN\''),/permission denied/);
 await assert.rejects(db.query('SELECT check_in_student($1,$2,$3,$4)',[ev,s1,'DYNAMIC_QR',s1]),/permission denied/);
 await db.exec('RESET ROLE;');
 await assert.rejects(db.query('SELECT check_in_student($1,$2,$3,$4)',[ev,s1,'MANUAL',s1]),/FORBIDDEN/);
 await assert.rejects(db.query('SELECT check_in_student($1,$2,$3,$4)',[ev,s1,'DYNAMIC_QR',s2]),/FORBIDDEN/);
 const first=await db.query<{result:{registration:{check_in_method:string;check_in_time:string};alreadyCheckedIn:boolean}}>('SELECT check_in_student($1,$2,$3,$4) AS result',[ev,s1,'MANUAL',staff]);
 const second=await db.query<{result:{registration:{check_in_method:string;check_in_time:string};alreadyCheckedIn:boolean}}>('SELECT check_in_student($1,$2,$3,$4) AS result',[ev,s1,'STAFF_SCAN',staff]);
 assert.equal(first.rows[0].result.alreadyCheckedIn,false);assert.equal(second.rows[0].result.alreadyCheckedIn,true);assert.equal(second.rows[0].result.registration.check_in_method,'MANUAL');assert.equal(second.rows[0].result.registration.check_in_time,first.rows[0].result.registration.check_in_time);
 await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${s1}';`);assert.equal((await db.query('SELECT * FROM passcodes')).rows.length,1);
 await db.exec(`SET request.jwt.claim.sub='${s2}';`);assert.equal((await db.query('SELECT * FROM passcodes')).rows.length,0);
 await db.exec(`SET request.jwt.claim.sub='${staff}';`);assert.equal((await db.query('SELECT * FROM event_registrations')).rows.length,2);assert.equal((await db.query('SELECT * FROM passcodes')).rows.length,0);
 await db.exec('RESET ROLE; SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM passcodes'),/permission denied/);await assert.rejects(db.query('SELECT id,name FROM events'),/permission denied/);
 await db.exec('RESET ROLE; SET ROLE service_role;');for(let i=0;i<10;i++)assert.equal((await db.query<{ok:boolean}>("SELECT consume_rate_limit('test',10,30) AS ok")).rows[0].ok,true);assert.equal((await db.query<{ok:boolean}>("SELECT consume_rate_limit('test',10,30) AS ok")).rows[0].ok,false);
 }finally{await db.close();}
});
test('upgrade archives legacy rows and removes all public demo policies',async()=>{
 const db=new PGlite();try{await db.exec(setup);await db.exec(`CREATE TABLE public.events(id uuid PRIMARY KEY,name text NOT NULL,totp_secret text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());CREATE TABLE public.registrations(id uuid PRIMARY KEY,event_id uuid REFERENCES events(id),student_id text,student_name text,is_attended boolean);CREATE TABLE public.passcodes(id uuid PRIMARY KEY,event_id uuid REFERENCES events(id),assigned_to text,code_value text);ALTER TABLE events ENABLE ROW LEVEL SECURITY;CREATE POLICY "Public read events" ON events FOR SELECT USING(true);GRANT ALL ON events,passcodes,registrations TO anon,authenticated;INSERT INTO events VALUES('${ev}','Legacy','secret',now());INSERT INTO registrations VALUES('${s1}','${ev}','00123','Student',true);INSERT INTO passcodes VALUES('${s2}','${ev}','00123','OLD-CODE');`);
 await db.exec(await readFile('supabase/migrations/202610060001_secure_portals.sql','utf8'));
 assert.equal((await db.query('SELECT * FROM aru_legacy.registrations')).rows.length,1);assert.equal((await db.query('SELECT * FROM aru_legacy.passcodes')).rows.length,1);
 assert.equal((await db.query("SELECT * FROM pg_policies WHERE policyname='Public read events'")).rows.length,0);
 await db.exec('SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM aru_legacy.passcodes'),/permission denied/);await assert.rejects(db.query('SELECT * FROM events'),/permission denied/);
 }finally{await db.close();}
});
