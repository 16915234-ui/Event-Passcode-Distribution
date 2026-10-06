# ARU Event Pass

ระบบลงทะเบียนและแจก Passcode กิจกรรม มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา

ออกแบบและพัฒนาโดย **จิรายุทธ บุตรชานนท์**

Next.js 16 App Router, Supabase Auth/PostgreSQL/Realtime, Tailwind CSS 4, Shadcn-style UI primitives, HTML5-QRCode และ TOTP รอบละ 5 วินาที

## ติดตั้ง

อ่าน [คู่มือติดตั้งและดีพลอย](DEPLOYMENT-TH.md) แล้วรัน [SQL schema/migration](supabase-schema.sql) ใน Supabase SQL Editor ก่อนใช้งานจริง

```sh
npm install
npm run dev
```

คัดลอก `.env.example` เป็น `.env.local` และตั้งค่าของโปรเจค ไม่มีบัญชี demo หรือทางลัดข้ามการล็อกอิน

เข้าสู่ระบบได้ด้วยรหัสผู้ใช้หรืออีเมลจริงของ Supabase Auth บัญชีที่สร้างใน Auth โดยตรงต้องมีแถว `public.users` ที่ใช้ UUID เดียวกันและกำหนด role ก่อน รหัสผู้ใช้จะอ้างอีเมลจากบัญชี Auth นั้น ไม่กำหนดสิทธิ์อัตโนมัติจากโดเมนอีเมล

## ระบบ

- `/student`: เข้าระบบด้วยรหัสนักศึกษา แสดงเฉพาะกิจกรรมที่ได้รับสิทธิ์ บัตร QR แบบมีลายเซ็น GPS ก่อนเปิดกล้อง และแสดง Passcode หลังเช็คอินผ่าน Realtime
- `/admin`: สร้าง/แก้ไขกิจกรรม พิกัดและรัศมี คลังรหัส นำเข้า CSV พร้อมสร้างบัญชี จัดการ Staff และรีเซ็ตรหัสผ่าน
- `/staff`: สแกน QR นักศึกษา ค้นหาและยืนยันเช็คอินด้วยมือ บันทึกวิธีและผู้ดำเนินการ
- `/display`: จอโปรเจคเตอร์ สร้าง QR จากเซิร์ฟเวอร์ เปลี่ยนทุก 5 วินาที ยอดเข้าร่วมผ่าน WebSocket และซ่อน QR ที่หมดอายุเมื่อขาดการเชื่อมต่อ

Next.js 16 ใช้ `src/proxy.ts` แทนชื่อ middleware ตรวจสิทธิ์ซ้ำใน route handlers และ server layouts พร้อม RLS ในฐานข้อมูล ไม่เปิด secret หรือ passcode ที่ยังไม่ปลดล็อกให้ client

การจองรหัสใช้ PostgreSQL transaction และล็อกแถวกิจกรรม ป้องกันการจองซ้ำ เมื่อรหัสไม่พอจะ rollback การจัดสรรทั้งชุด บัญชี Auth ที่สร้างก่อนหน้าไม่ถูกลบหรือรีเซ็ต สามารถนำเข้าใหม่ได้

## ทดสอบ

```sh
npm test
npm run lint
npm run build
```

ชุดทดสอบ PostgreSQL ใช้ PGlite ภายในเครื่อง ไม่เขียนฐานข้อมูล Supabase จริง ครอบคลุมสิทธิ์ 3 บทบาท การซ่อนรหัส กฎ RPC การจองรหัส การเช็คอินซ้ำ และการย้ายตารางเดิม

## อัตลักษณ์และข้อจำกัด

- อ้างอิงอัตลักษณ์ [ARU](https://www.aru.ac.th/index.php/home/symbol) โทนแดง/ทอง พื้นขาว พร้อมเครดิตผู้พัฒนา
- LINE Seed TH จาก [LINE](https://seed.line.me/index_th.html) และ TH Sarabun New จาก [สำนักบริหารการศึกษา มหาวิทยาลัยเกษตรศาสตร์](https://registrar.ku.ac.th/it_thsarabun)
- ภาพตราสัญลักษณ์รองจากระบบเอกสารทางการ [ARU DMS](https://aru-dms.aru.ac.th/images/new2.png)
- GPS เบราว์เซอร์สามารถถูกปลอมได้และ static QR สามารถถ่ายภาพได้ ทีมงานต้องตรวจสอบตัวบุคคลควบคู่
- ต้องรัน migration และสร้าง Admin ก่อนใช้งานจริง กล้อง/GPS และ Realtime ข้ามอุปกรณ์ต้องทดสอบบน HTTPS กับ Supabase ที่ตั้งค่าแล้ว
- ข้อมูลระบบเก่าถูกเก็บใน `aru_legacy` และไม่ได้แปลงเป็นบัญชี Auth อัตโนมัติ ดูคู่มือติดตั้งก่อนย้ายข้อมูลจริง
