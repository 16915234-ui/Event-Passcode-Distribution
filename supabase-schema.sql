-- =====================================================================
-- Real-time Event Check-in & Passcode System
-- Database Schema for Supabase (PostgreSQL)
-- Author: อั๋น (จิรายุทธ บุตรชานนท์)
-- =====================================================================

-- 1. Create 'events' table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    totp_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create 'passcodes' table
CREATE TABLE IF NOT EXISTS public.passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    code_value TEXT NOT NULL,
    assigned_to TEXT NULL, -- student_id pre-assigned during student import
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create 'registrations' table
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    is_attended BOOLEAN DEFAULT false NOT NULL,
    check_in_time TIMESTAMPTZ NULL,
    check_in_method TEXT NULL, -- 'STAFF_SCAN' or 'DYNAMIC_QR'
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_event_student UNIQUE (event_id, student_id)
);

-- Indexes for high-performance zero-latency lookups
CREATE INDEX IF NOT EXISTS idx_registrations_event_student ON public.registrations(event_id, student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_attended ON public.registrations(event_id, is_attended);
CREATE INDEX IF NOT EXISTS idx_passcodes_event_assigned ON public.passcodes(event_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_passcodes_event_available ON public.passcodes(event_id) WHERE assigned_to IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for Anon & Service Role
-- In production, adjust policies according to authentication needs.
DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert events" ON public.events;
CREATE POLICY "Public insert events" ON public.events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete events" ON public.events;
CREATE POLICY "Public delete events" ON public.events FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read passcodes" ON public.passcodes;
CREATE POLICY "Public read passcodes" ON public.passcodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert passcodes" ON public.passcodes;
CREATE POLICY "Public insert passcodes" ON public.passcodes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update passcodes" ON public.passcodes;
CREATE POLICY "Public update passcodes" ON public.passcodes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public read registrations" ON public.registrations;
CREATE POLICY "Public read registrations" ON public.registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert registrations" ON public.registrations;
CREATE POLICY "Public insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update registrations" ON public.registrations;
CREATE POLICY "Public update registrations" ON public.registrations FOR UPDATE USING (true);

-- Enable Supabase Realtime Replication for the tables
-- This ensures WebSockets trigger instant UI updates on client screens!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'passcodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.passcodes;
  END IF;
END $$;

-- =====================================================================
-- Optional Sample Demo Seed Data
-- =====================================================================
INSERT INTO public.events (id, name, totp_secret)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Tech & Innovation Day 2026',
    'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
)
ON CONFLICT (id) DO NOTHING;

-- Seed passcodes for the demo event
INSERT INTO public.passcodes (event_id, code_value, assigned_to)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-9821', '65010001'),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-4712', '65010002'),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-6304', '65010003'),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-1159', '65010004'),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-8823', '65010005'),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-5541', NULL),
    ('a0000000-0000-0000-0000-000000000001', 'PASS-TECH-7790', NULL)
ON CONFLICT DO NOTHING;

-- Seed registrations with pre-assigned students
INSERT INTO public.registrations (event_id, student_id, student_name, is_attended)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '65010001', 'สมชาย สายเทค', false),
    ('a0000000-0000-0000-0000-000000000001', '65010002', 'สมหญิง รักเรียน', false),
    ('a0000000-0000-0000-0000-000000000001', '65010003', 'กิตติภูมิ พัฒนกิจ', false),
    ('a0000000-0000-0000-0000-000000000001', '65010004', 'วรัญญา โค้ดเก่ง', false),
    ('a0000000-0000-0000-0000-000000000001', '65010005', 'อั๋น จิรายุทธ', false)
ON CONFLICT DO NOTHING;
