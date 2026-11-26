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
CREATE POLICY "Allow public anon insert to demo_bookings"
  ON public.demo_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users (Admins / Staff) to view and manage demo bookings
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
CREATE POLICY "Allow public anon insert to contact_messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to view and update contact messages
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
CREATE POLICY "Allow public anon insert to newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated management
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
CREATE POLICY "Allow public read testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous & authenticated insert/update/delete for admin operations
CREATE POLICY "Allow anon and auth manage testimonials"
  ON public.testimonials
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 5. Schema-level grants for anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.demo_bookings TO anon, authenticated;
GRANT ALL ON TABLE public.contact_messages TO anon, authenticated;
GRANT ALL ON TABLE public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON TABLE public.testimonials TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
