# Real-time Event Check-in & Passcode System 🚀
**ระบบแจก Passcode กิจกรรม & Hybrid Check-in ระดับเสี้ยววินาที (Zero-Latency)**  
**ผู้พัฒนา:** อั๋น (จิรายุทธ บุตรชานนท์)  
**Tech Stack:** Next.js (App Router), Supabase (Database & Realtime WebSockets), Tailwind CSS, `html5-qrcode`, TOTP Algorithm (`otpauth`), Vercel.

---

## 📌 จุดเด่นและแนวคิดของระบบ (System Architecture)

ระบบถูกออกแบบมาเพื่ออุดช่องโหว่ **"คนลงชื่อแต่ไม่มาร่วมงาน"** โดยมีหัวใจสำคัญ 4 ประการ:

1. **Pre-registration & Pre-assigned Passcodes (ความเร็วสูงสุด):**  
   - เมื่อ Admin ทำการ Import รายชื่อนักศึกษา ระบบจะดึง Passcode ที่ว่างอยู่ในคลังมาผูก (`assigned_to = student_id`) ทันทีล่วงหน้า แต่กำหนดสถานะการเข้าถึงให้ถูกซ่อน/เบลอไว้
   - ในวันงาน ระบบเพียงแค่อัปเดตสถานะ `is_attended = true` โดยไม่ต้องเสียเวลา Query หา Passcode ว่าง ลดภาระ Server และทำงานได้ระดับเสี้ยววินาที

2. **Hybrid Check-in:**
   - **วิธีที่ 1 (Staff สแกน):** นักศึกษาเปิดหน้าเว็บโชว์ Static QR ประจำตัว -> Staff ใช้กล้องมือถือสแกน -> อัปเดตสถานะเข้างาน
   - **วิธีที่ 2 (นักศึกษาสแกนจอ):** นักศึกษาเปิดกล้องในเว็บแอปของตัวเอง -> สแกน Dynamic QR บนจอโปรเจคเตอร์หน้าเวที -> อัปเดตสถานะเข้างาน

3. **TOTP Dynamic QR (ป้องกันการถ่ายรูปส่งให้เพื่อน):**
   - จอโปรเจคเตอร์แสดง QR Code ที่สร้างจากอัลกอริทึม **TOTP (Time-based One-Time Password)**
   - QR Code รีเฟรชตัวเองอัตโนมัติทุกๆ **5 วินาที** (ไม่ต้องบันทึกลง Database ให้เปลืองทรัพยากร)
   - **Grace Period Logic:** ฝั่ง Backend Route Handlers ยอมรับ Token ของรอบปัจจุบัน และย้อนหลัง 1 รอบ (±5-10 วินาที) เพื่อรองรับความหน่วงของอินเทอร์เน็ต

4. **Real-time UI (Supabase Realtime / WebSockets):**
   - ทันทีที่สถานะ `is_attended` ถูกอัปเดตเป็น `true` จอมือถือของนักศึกษาจะเด้งปลดล็อคแสดง Passcode ประจำตัวพร้อมเอฟเฟกต์ Confetti ทันทีโดยไม่ต้องกด Refresh

---

## 🗄️ โครงสร้างฐานข้อมูล (Supabase Database Schema)

ระบบเตรียมไฟล์ `supabase-schema.sql` ไว้ให้พร้อมใช้งานใน Supabase SQL Editor:

1. **`events`**: เก็บข้อมูลกิจกรรมและคีย์ลับ TOTP
   - `id` (uuid, PK)
   - `name` (text)
   - `totp_secret` (text)
   - `created_at` (timestamptz)

2. **`passcodes`**: คลัง Passcode สำหรับแจกในกิจกรรม
   - `id` (uuid, PK)
   - `event_id` (uuid, FK -> events.id)
   - `code_value` (text)
   - `assigned_to` (text, nullable)
   - `created_at` (timestamptz)

3. **`registrations`**: รายชื่อนักศึกษาและสถานะการเช็คอิน
   - `id` (uuid, PK)
   - `event_id` (uuid, FK -> events.id)
   - `student_id` (text)
   - `student_name` (text)
   - `is_attended` (boolean, default: false)
   - `check_in_time` (timestamptz, nullable)
   - `check_in_method` (text, 'STAFF_SCAN' หรือ 'DYNAMIC_QR')
   - `created_at` (timestamptz)

พร้อมเปิด **Supabase Realtime WebSockets** บนตาราง `registrations`

---

## 🛠️ ขั้นตอนการติดตั้งและการเชื่อมต่อ Supabase

### 1. ติดตั้ง Dependencies และรัน Local
```bash
npm install
npm run dev
```
เปิดบราวเซอร์ที่ `http://localhost:3000`  
*(หมายเหตุ: หากยังไม่ได้ใส่ Supabase keys ระบบจะมี In-Memory Demo Mode ให้ทดสอบฟังก์ชันทั้งหมดได้ทันที)*

### 2. ตั้งค่า Supabase
1. เข้าไปที่ [supabase.com](https://supabase.com) และสร้างโปรเจกต์ใหม่
2. ไปที่เมนู **SQL Editor** -> กด **New query**
3. คัดลอกโค้ดจากไฟล์ `supabase-schema.sql` ไปวางแล้วกด **Run**
4. ไปที่เมนู **Project Settings** -> **API** คัดลอกค่าต่อไปนี้:
   - Project URL
   - anon / public key
   - service_role key (optional แต่แนะนำสำหรับ API หลังบ้าน)
5. สร้างไฟล์ `.env.local` ในโฟลเดอร์โปรเจกต์:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## 🚀 ขั้นตอนการ Deploy ขึ้น Vercel

1. สร้าง GitHub Repository และ Push โค้ดขึ้นไป:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Real-time Event Passcode system"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. ไปที่ [vercel.com](https://vercel.com) -> กด **Add New Project** -> เลือก GitHub Repository นี้
3. ในส่วน **Environment Variables** ให้ใส่ค่าจาก `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. กดปุ่ม **Deploy** ระบบจะ Build และพร้อมใช้งานระดับ Production ทันที!

---

## 📱 หน้าระบบและการใช้งาน (Routes)

| หน้าจอ | เส้นทาง (Route) | รายละเอียด |
|---|---|---|
| **หน้าแรก** | `/` | ศูนย์รวมเมนู, แนะนำสถาปัตยกรรมระบบ และวิธีตั้งค่า |
| **Admin Panel** | `/admin` | สร้างกิจกรรม, Import รายชื่อนักศึกษา, สร้าง Passcode, มอนิเตอร์สถิติ |
| **จอแสดงผลโปรเจคเตอร์** | `/display` & `/display/[eventId]` | แสดง Dynamic TOTP QR รีเฟรชทุก 5s, กราฟคนเข้างาน Real-time, Live Stream ผู้เข้างาน |
| **Staff Scanner** | `/staff` | สแกนกล้องหลังมือถืออ่านบัตร Static QR ของนักศึกษา พร้อมระบบพิมพ์รหัส Manual |
| **Student Ticket** | `/student` | บัตรนักศึกษา, แสดง Static QR, กล้องสแกนจอเวที, และการ์ดปลดล็อค Passcode อัตโนมัติ |

---

## 🎯 Route Handlers API (Backend)

- `GET /api/events` - ดึงรายการกิจกรรมทั้งหมด
- `POST /api/events` - สร้างกิจกรรมใหม่ (พร้อมสร้าง TOTP Secret อัตโนมัติ)
- `GET /api/events/[id]` - ดึงสถิติ, ผู้ลงทะเบียน และ Passcode ของกิจกรรม
- `POST /api/events/[id]/import` - นำเข้ารายชื่อนักศึกษาและผูก Passcode อัตโนมัติ
- `POST /api/events/[id]/passcodes` - เพิ่มชุด Passcode เข้าคลัง
- `GET /api/events/[id]/totp` - ดึง TOTP Token ปัจจุบันและรอบเวลานับถอยหลัง
- `POST /api/checkin/staff` - เช็คอินผ่าน Staff Scan หรือ Manual Input
- `POST /api/checkin/dynamic` - เช็คอินผ่าน Dynamic QR (ตรวจสอบ TOTP พร้อม Grace Period)
- `GET /api/checkin/status` - ตรวจสอบสถานะการเช็คอินและการแสดงผล Passcode
