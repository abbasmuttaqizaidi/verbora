-- ==============================================================================
-- VERBORA Supabase Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Demo Bookings Table
CREATE TABLE IF NOT EXISTS public.demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  course TEXT NOT NULL,
  time_slot TEXT,
  source TEXT DEFAULT 'website-demo-form',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled'))
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created_at ON public.demo_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON public.demo_bookings(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous visitors on website to insert new demo booking requests
DROP POLICY IF EXISTS "Allow public anon insert to demo_bookings" ON public.demo_bookings;
CREATE POLICY "Allow public anon insert to demo_bookings"
  ON public.demo_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users (Admins / Staff) to view and manage demo bookings
DROP POLICY IF EXISTS "Allow authenticated read and manage demo_bookings" ON public.demo_bookings;
CREATE POLICY "Allow authenticated read and manage demo_bookings"
  ON public.demo_bookings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 2. Create Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  course TEXT,
  goal TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived'))
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous visitors to submit contact messages
DROP POLICY IF EXISTS "Allow public anon insert to contact_messages" ON public.contact_messages;
CREATE POLICY "Allow public anon insert to contact_messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to view and update contact messages
DROP POLICY IF EXISTS "Allow authenticated read and manage contact_messages" ON public.contact_messages;
CREATE POLICY "Allow authenticated read and manage contact_messages"
  ON public.contact_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 3. Create Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed'))
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insertion
DROP POLICY IF EXISTS "Allow public anon insert to newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Allow public anon insert to newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated management
DROP POLICY IF EXISTS "Allow authenticated read and manage newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Allow authenticated read and manage newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 4. Create Testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT NOT NULL,
  video TEXT,
  video_size_bytes BIGINT DEFAULT 0,
  image_size_bytes BIGINT DEFAULT 0,
  text TEXT NOT NULL,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_testimonials_display_order ON public.testimonials(display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_active ON public.testimonials(is_active);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous read
DROP POLICY IF EXISTS "Allow public read testimonials" ON public.testimonials;
CREATE POLICY "Allow public read testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous & authenticated insert/update/delete for admin operations
DROP POLICY IF EXISTS "Allow anon and auth manage testimonials" ON public.testimonials;
CREATE POLICY "Allow anon and auth manage testimonials"
  ON public.testimonials
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 5. Create Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  short TEXT NOT NULL,
  summary TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 4999,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  display_order INT DEFAULT 0
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_courses_display_order ON public.courses(display_order);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous read
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses"
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous & authenticated insert/update/delete for admin operations
DROP POLICY IF EXISTS "Allow anon and auth manage courses" ON public.courses;
CREATE POLICY "Allow anon and auth manage courses"
  ON public.courses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Seed the 5 official VERBORA courses (idempotent)
INSERT INTO public.courses (id, title, tagline, short, summary, fee_amount, discount_percent, display_order)
VALUES
  (
    'spoken-english',
    'Spoken English',
    'Speak fluently. Connect naturally.',
    'Speak fluently. Be confident.',
    'Build the confidence to express yourself clearly in everyday conversations, discussions, and new situations.',
    4999,
    20,
    1
  ),
  (
    'business-english',
    'Business English',
    'Sound clear. Work confidently.',
    'Excel professionally.',
    'Communicate with clarity at work, from professional emails and meetings to presenting your ideas with confidence.',
    6999,
    25,
    2
  ),
  (
    'public-speaking',
    'Public Speaking',
    'Find your voice. Own the room.',
    'Speak with impact.',
    'Learn to organize your thoughts, speak with presence, and deliver a message that people remember.',
    5999,
    15,
    3
  ),
  (
    'interview-preparation',
    'Interview Preparation',
    'Show your strengths. Get ready.',
    'Get Hired.',
    'Practice answering questions, communicating your strengths, and approaching important interviews with greater confidence.',
    4499,
    20,
    4
  ),
  (
    'personality-development',
    'Personality Development',
    'Unlock your potential. Be your best.',
    'Be Your Best.',
    'Develop personal presence, emotional intelligence, body language, and the mindset to succeed in personal and professional life.',
    5499,
    30,
    5
  )
ON CONFLICT (id) DO NOTHING;


-- 6. Schema-level grants for anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.demo_bookings TO anon, authenticated;
GRANT ALL ON TABLE public.contact_messages TO anon, authenticated;
GRANT ALL ON TABLE public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON TABLE public.testimonials TO anon, authenticated;
GRANT ALL ON TABLE public.courses TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 7. Reload PostgREST schema cache so /rest/v1/courses is immediately available
NOTIFY pgrst, 'reload schema';
