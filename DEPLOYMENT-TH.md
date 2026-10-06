# ติดตั้ง ARU Event Pass

## 1. อัปเกรดฐานข้อมูล

เปิด Supabase ของโปรเจค → SQL Editor → New query แล้วคัดลอกไฟล์ `supabase-schema.sql` ทั้งหมดไปรันด้วยบัญชีเจ้าของโปรเจค

สคริปต์ทำงานใน transaction และรันซ้ำได้ โดยย้ายตาราง `registrations` และ `passcodes` แบบเก่าไปเก็บใน schema `aru_legacy` ซึ่งผู้ใช้งานเว็บอ่านไม่ได้ กิจกรรมเดิมยังอยู่ แต่ต้องตั้งพิกัดจริงใหม่ก่อนใช้งาน GPS

**ข้อมูลเก่ายังไม่ถูกย้ายเข้าระบบบัญชีใหม่อัตโนมัติ** เพราะเดิมใช้รหัสนักศึกษาเป็นข้อความ ไม่มีบัญชี Supabase Auth และไม่มีรหัสผ่าน ต้องสร้างบัญชีและจัดสรรรายชื่อในระบบใหม่ ข้อมูลการเช็คอินและรหัสเดิมยังเก็บครบใน `aru_legacy` สำหรับตรวจสอบ/ย้ายด้วย UUID หลังสร้างบัญชีแล้ว หากมีข้อมูลใช้งานจริง ให้สำรองและวางแผนย้ายข้อมูลก่อนเปิดรับเช็คอิน

ตารางใช้งานใหม่: `users`, `events`, `event_registrations`, `passcodes` พร้อม RLS และ Realtime เฉพาะข้อมูลที่ผู้ใช้มีสิทธิ์อ่าน รหัสผ่านจัดเก็บโดย Supabase Auth ไม่เก็บ hash ซ้ำในตาราง public

## 2. สร้างบัญชีผู้ดูแลคนแรก

วิธีใช้ SQL Editor หลังสร้างบัญชีใน Supabase:

1. Authentication → Users → Add user → Create new user
2. กำหนด email เช่น `admin@accounts.aru.invalid` และรหัสผ่านที่ปลอดภัย เปิด Auto Confirm User (อีเมลนี้เป็นตัวระบุภายใน ไม่ใช้รับอีเมล)
3. คัดลอก User UID แล้วรัน SQL นี้โดยแทน UUID และชื่อ:

```sql
insert into public.users (id, username, role, full_name)
values ('USER-UUID-จาก-Auth', 'admin', 'ADMIN', 'ชื่อผู้ดูแลระบบ');
```

เข้าสู่หน้าเว็บด้วย username `admin` และรหัสผ่านที่ตั้งไว้ ห้ามใส่รหัสผ่านลง SQL ตาราง public

หรือกำหนด `ARU_ADMIN_USERNAME`, `ARU_ADMIN_NAME`, `ARU_ADMIN_PASSWORD` (12 ตัวอักษรขึ้นไป) ใน `.env.local` แล้วรัน `npm run bootstrap:admin` สคริปต์จะสร้าง Auth และ profile พร้อมกัน ไม่เปลี่ยนบัญชีเดิม

## 3. ค่าตั้งค่าบน Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (ห้ามใช้ NEXT_PUBLIC)
- `QR_SIGNING_SECRET` (ค่าสุ่มอย่างน้อย 32 ตัวอักษร ใช้ค่าเดียวกันทุก instance)

ตั้ง Supabase Authentication → URL Configuration → Site URL เป็น URL เว็บ และปิด Allow new users to sign up เพื่อให้แอดมินเป็นผู้สร้างบัญชี ใช้ HTTPS สำหรับกล้องและ GPS

## 4. ขั้นตอนใช้งาน

1. Admin: สร้างกิจกรรมและพิกัดจริง → เพิ่ม Passcode ให้พอ → นำเข้า CSV (`public/templates/students.csv`)
2. CSV ต้องมี `username,full_name,password` ตามลำดับ ใช้ UTF-8 ครั้งละไม่เกิน 100 คน รหัสผ่านอย่างน้อย 10 ตัวอักษร รหัสนักศึกษารักษาเลขศูนย์นำหน้า
3. ยืนยันรายการตัวอย่างเพื่อสร้างบัญชี/จองรหัส บัญชีเดิมจะไม่ถูกรีเซ็ตรหัสผ่าน หากรหัสไม่พอ รายชื่อทั้งชุดจะไม่ถูกเพิ่ม บัญชีที่สร้างแล้วสามารถใช้ในการนำเข้าซ้ำ
4. Admin สร้างบัญชี Staff ในเมนูจัดการบัญชี → เปิดจอโปรเจคเตอร์
5. Student ล็อกอินเพื่อดูกิจกรรมของตนเอง → GPS + สแกนจอ หรือแสดง QR ให้ Staff
6. Staff ตรวจตัวตนก่อนสแกน หรือค้นหารหัสแล้วกดยืนยันเช็คอินด้วยมือ

TOTP ยอมรับรอบปัจจุบันและก่อนหน้าเท่านั้น อายุจริงอยู่ระหว่าง 5–10 วินาทีตามจังหวะในรอบ ไม่รับรหัสอนาคต GPS จากเบราว์เซอร์สามารถปลอมได้ จึงเป็นการลดความเสี่ยง ไม่ใช่หลักฐานการอยู่หน้างานที่ป้องกันการปลอมได้ทั้งหมด

## 5. ตรวจสอบ

`npm test` ทดสอบ TOTP, Haversine/GPS, QR signature, CSV, PostgreSQL RLS, transaction rollback, เช็คอินซ้ำ และ migration จากโครงสร้างเดิมใน PGlite

`npm run lint` และ `npm run build` ตรวจซอร์สและ production build การทดสอบกล้อง/GPS จริงและ WebSocket ข้ามอุปกรณ์ต้องทำหลังเชื่อม Supabase และรัน migration

หากต้องย้อนกลับ คงข้อมูลใน `aru_legacy` ไว้และสำรองข้อมูลใหม่ก่อนดำเนินการ อย่านำ SQL demo แบบเปิดสาธารณะจากเวอร์ชันเก่ามารันทับ
