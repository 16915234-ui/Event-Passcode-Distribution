import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const measurements=[];
async function measure(name,fn){const start=performance.now();const result=await fn();if(result.error)throw new Error(`${name}: ${result.error.code}`);const row={name,ms:Math.round(performance.now()-start),rows:Array.isArray(result.data)?result.data.length:undefined,count:result.count??undefined,bytes:Buffer.byteLength(JSON.stringify(result.data??null))};measurements.push(row);console.log(row);return result;}
const events=await measure('events',()=>db.from('events').select('id,name,latitude,longitude,radius_meters,created_at').order('created_at',{ascending:false}));
await measure('users-100-safe-columns',()=>db.from('users').select('id,username,full_name,role,faculty,major,academic_year').order('username').limit(100));
await measure('users-count',()=>db.from('users').select('id',{count:'exact',head:true}));
if(events.data?.[0]){
 const id=events.data[0].id;
 for(let i=0;i<3;i++){
  const start=performance.now();
  await measure(`event-${i+1}`,()=>db.from('events').select('id,name,latitude,longitude,radius_meters,created_at').eq('id',id).single());
  await measure(`roster-${i+1}`,()=>db.from('event_registrations').select('*,users!student_id(id,username,full_name,role)').eq('event_id',id).order('created_at'));
  await measure(`passcodes-${i+1}`,()=>db.from('passcodes').select('id,event_id,assigned_to').eq('event_id',id));
  console.log({name:`sequential-round-${i+1}`,ms:Math.round(performance.now()-start)});
 }
 for(let i=0;i<3;i++){
  const start=performance.now();
  await Promise.all([
   measure(`parallel-event-${i+1}`,()=>db.from('events').select('id,name,latitude,longitude,radius_meters,created_at').eq('id',id).single()),
   measure(`parallel-roster-${i+1}`,()=>db.from('event_registrations').select('id,event_id,student_id,is_attended,check_in_time,check_in_method,users!student_id!inner(id,username,full_name,role)',{count:'exact'}).eq('event_id',id).order('created_at').order('id').range(0,49)),
   measure(`parallel-total-${i+1}`,()=>db.from('event_registrations').select('id',{count:'exact',head:true}).eq('event_id',id)),
   measure(`parallel-attended-${i+1}`,()=>db.from('event_registrations').select('id',{count:'exact',head:true}).eq('event_id',id).eq('is_attended',true)),
   measure(`parallel-available-${i+1}`,()=>db.from('passcodes').select('id',{count:'exact',head:true}).eq('event_id',id).is('assigned_to',null)),
  ]);
  const round={name:`parallel-round-${i+1}`,ms:Math.round(performance.now()-start)};measurements.push(round);console.log(round);
 }
 await measure('picker-excludes-registered',()=>db.from('users').select('id,registrations:event_registrations!student_id(event_id)',{count:'exact'}).eq('role','STUDENT').eq('registrations.event_id',id).is('registrations',null).range(0,49));
 await measure('passcode-user-join',()=>db.from('passcodes').select('id,users!assigned_to(username)',{count:'exact'}).eq('event_id',id).order('created_at').order('id').range(0,49));
 await measure('roster-name-search',()=>db.from('event_registrations').select('id,users!student_id!inner(username,full_name)',{count:'exact'}).eq('event_id',id).or('username.ilike.%a%,full_name.ilike.%a%',{referencedTable:'users'}).range(0,49));
 const student=await db.from('users').select('id').eq('role','STUDENT').limit(1).maybeSingle();
 if(student.data)await measure('student-events-join',()=>db.from('events').select('id,event_registrations!inner(student_id)').eq('event_registrations.student_id',student.data.id));
}
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/data-benchmark.json',JSON.stringify({location:'developer machine; includes network latency, not isolated SQL execution',measurements},null,2));
