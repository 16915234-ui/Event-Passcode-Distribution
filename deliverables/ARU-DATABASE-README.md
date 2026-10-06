# วิธีรันฐานข้อมูล ARU Event Pass

ใช้ไฟล์ **ARU-DATABASE-FULL.sql** ไฟล์เดียวสำหรับโครงสร้างฐานข้อมูลทั้งหมด

1. เปิดโปรเจค Supabase → **SQL Editor → New query**
2. เปิด `ARU-DATABASE-FULL.sql` คัดลอกเนื้อหาทั้งหมด วางแล้วกด **Run** โดยใช้ role `postgres`
3. ผลลัพธ์จะแสดง `ARU database ready` และสถานะบัญชี Admin
4. ถ้าแสดง `Admin ready` ให้เข้าสู่เว็บด้วย **16915234** หรือ **admin16915234@aru.ac.th** และรหัสผ่านเดิมที่ตั้งใน Supabase
5. ถ้ายังไม่มีบัญชีนี้ ให้สร้างใน **Authentication → Users → Add user** ด้วยอีเมล `admin16915234@aru.ac.th` ตั้งรหัสผ่าน เปิด Auto Confirm User แล้วรัน SQL ไฟล์เดิมอีกครั้ง

ไฟล์รวมตาราง users, events, event_registrations, passcodes, ระบบจำกัดความถี่, indexes, RLS, Auth profile trigger, RPC จองรหัสและเช็คอิน, Supabase Realtime และการผูกบัญชี Admin ไม่ต้องรันไฟล์ CREATE-ADMIN.sql รุ่นเก่าเพิ่ม

## ข้อมูลเดิม

ไฟล์นี้เป็นการติดตั้ง/อัปเกรดแบบรันซ้ำได้ **ไม่ใช่สคริปต์ล้างข้อมูล** และไม่เปลี่ยนอีเมลหรือรหัสผ่าน Auth ข้อมูลใหม่ที่มีอยู่แล้วจะยังอยู่

ตาราง `registrations` และ `passcodes` รุ่นเก่าที่ใช้รหัสนักศึกษาแบบข้อความจะถูกเก็บใน schema `aru_legacy` แบบปิดสิทธิ์ ส่วนการเข้าร่วมในระบบใหม่ใช้ UUID จาก Supabase Auth ข้อมูลเก่าไม่ได้แปลงเป็นบัญชี Auth หรือย้ายประวัติเข้าระบบใหม่อัตโนมัติ

ถ้ารหัสผู้ใช้ `16915234` ถูกผูกกับ Auth อีกบัญชีอยู่ SQL จะยกเลิก transaction ทั้งชุดและแจ้งให้ตรวจบัญชีเดิม เพื่อไม่เปลี่ยนเจ้าของบัญชีโดยไม่ตั้งใจ

## หากใช้กับ Supabase โปรเจคใหม่

ตั้งค่า NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY และ SUPABASE_SERVICE_ROLE_KEY ของโปรเจคใหม่บน Vercel แล้ว redeploy; คง QR_SIGNING_SECRET ฝั่ง server ไว้ ค่า service role และ QR secret ห้ามใส่ในตัวแปร NEXT_PUBLIC

ตั้ง Auth Site URL เป็น URL เว็บจริง และปิด Allow new users to sign up เพื่อให้ผู้ดูแลเป็นผู้จัดการบัญชี รหัสผ่านเก็บผ่าน Supabase Auth เท่านั้น ไม่มี password_hash ใน public.users
