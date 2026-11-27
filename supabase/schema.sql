-- ==============================================================================
-- VERBORA Supabase Database Schema (Unified 3-Table Architecture)
-- Tables: public.leads, public.testimonials, public.courses
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Unified Leads Table (Demo Bookings + Contact Enquiries)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  lead_type TEXT NOT NULL DEFAULT 'demo-booking' CHECK (lead_type IN ('demo-booking', 'contact-enquiry')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  course TEXT NOT NULL DEFAULT 'General Coaching',
  time_slot TEXT,
  goal TEXT,
  message TEXT,
  source TEXT DEFAULT 'website',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON public.leads(lead_type);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public anon insert to leads" ON public.leads;
CREATE POLICY "Allow public anon insert to leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth manage leads" ON public.leads;
CREATE POLICY "Allow anon and auth manage leads"
  ON public.leads
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 2. Migrate any existing rows from legacy tables & drop unused/duplicate tables
DO $$
BEGIN
  IF to_regclass('public.contact_messages') IS NOT NULL THEN
    INSERT INTO public.leads (
      id, created_at, lead_type, name, email, phone, course, goal, message, source, status
    )
    SELECT
      c.id,
      c.created_at,
      'contact-enquiry',
      c.name,
      c.email,
      c.phone,
      COALESCE(c.course, 'General Coaching'),
      c.goal,
      c.message,
      'contact-page',
      CASE c.status
        WHEN 'unread' THEN 'new'
        WHEN 'replied' THEN 'contacted'
        WHEN 'read' THEN 'completed'
        WHEN 'archived' THEN 'cancelled'
        ELSE 'new'
      END
    FROM public.contact_messages c
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.demo_bookings') IS NOT NULL THEN
    INSERT INTO public.leads (
      id, created_at, lead_type, name, email, phone, course, time_slot, source, notes, status
    )
    SELECT
      b.id,
      b.created_at,
      'demo-booking',
      b.name,
      b.email,
      b.phone,
      b.course,
      b.time_slot,
      b.source,
      b.notes,
      b.status
    FROM public.demo_bookings b
    WHERE NOT (
      b.source = 'direct-enquiry-diagnostic-form'
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.lead_type = 'contact-enquiry'
          AND (
            (b.email IS NOT NULL AND l.email IS NOT NULL AND lower(trim(b.email)) = lower(trim(l.email)))
            OR (b.phone IS NOT NULL AND l.phone IS NOT NULL AND regexp_replace(b.phone, '\D', '', 'g') = regexp_replace(l.phone, '\D', '', 'g'))
          )
          AND abs(extract(epoch FROM (b.created_at - l.created_at))) <= 120
      )
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS public.demo_bookings CASCADE;
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers CASCADE;


-- 3. Create Testimonials Table
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
  is_spotlight BOOLEAN NOT NULL DEFAULT false,
  display_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_testimonials_display_order ON public.testimonials(display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_active ON public.testimonials(is_active);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read testimonials" ON public.testimonials;
CREATE POLICY "Allow public read testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and auth manage testimonials" ON public.testimonials;
CREATE POLICY "Allow anon and auth manage testimonials"
  ON public.testimonials
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 4. Create Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  short TEXT NOT NULL,
  summary TEXT NOT NULL,
  cover TEXT,
  cover_size_bytes BIGINT DEFAULT 0,
  fee_amount NUMERIC NOT NULL DEFAULT 4999,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  display_order INT DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_upcoming BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_courses_display_order ON public.courses(display_order);
CREATE INDEX IF NOT EXISTS idx_courses_is_visible ON public.courses(is_visible);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses"
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and auth manage courses" ON public.courses;
CREATE POLICY "Allow anon and auth manage courses"
  ON public.courses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Seed the 6 official VERBORA courses (idempotent)
INSERT INTO public.courses (id, title, tagline, short, summary, cover, cover_size_bytes, fee_amount, discount_percent, display_order, is_visible, is_upcoming)
VALUES
  (
    'spoken-english',
    'Spoken English',
    'Speak fluently. Connect naturally.',
    'Speak fluently. Be confident.',
    'Build the confidence to express yourself clearly in everyday conversations, discussions, and new situations.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809123/verbora/courses/spoken-english.png',
    1951266,
    4999,
    20,
    1,
    true,
    false
  ),
  (
    'business-english',
    'Business English',
    'Sound clear. Work confidently.',
    'Excel professionally.',
    'Communicate with clarity at work, from professional emails and meetings to presenting your ideas with confidence.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809124/verbora/courses/business-english.png',
    1772573,
    6999,
    25,
    2,
    true,
    false
  ),
  (
    'public-speaking',
    'Public Speaking',
    'Find your voice. Own the room.',
    'Speak with impact.',
    'Learn to organize your thoughts, speak with presence, and deliver a message that people remember.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809125/verbora/courses/public-speaking.png',
    1959697,
    5999,
    15,
    3,
    true,
    false
  ),
  (
    'interview-preparation',
    'Interview Preparation',
    'Show your strengths. Get ready.',
    'Get Hired.',
    'Practice answering questions, communicating your strengths, and approaching important interviews with greater confidence.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809126/verbora/courses/interview-preparation.png',
    2007908,
    4499,
    20,
    4,
    true,
    false
  ),
  (
    'personality-development',
    'Personality Development',
    'Unlock your potential. Be your best.',
    'Be Your Best.',
    'Develop personal presence, emotional intelligence, body language, and the mindset to succeed in personal and professional life.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809128/verbora/courses/personality-development.png',
    1853331,
    5499,
    30,
    5,
    true,
    false
  ),
  (
    'executive-communication',
    'Executive Communication',
    'Lead conversations. Influence rooms.',
    'Lead with presence.',
    'Master high-stakes stakeholder conversations, strategic persuasion, leadership presence, and crisp executive storytelling.',
    'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809129/verbora/courses/executive-communication.png',
    1499167,
    7999,
    20,
    6,
    true,
    false
  )
ON CONFLICT (id) DO NOTHING;


-- 5. Create Trainer Profile Table (single-row config)
CREATE TABLE IF NOT EXISTS public.trainer_profile (
  id TEXT PRIMARY KEY DEFAULT 'master-trainer',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  hero_kicker TEXT NOT NULL DEFAULT 'Meet Your Master Coach',
  name TEXT NOT NULL DEFAULT 'Bijay Adhikari',
  role_title TEXT NOT NULL DEFAULT 'Founder & Lead Communication Coach at VERBORA',
  quote TEXT NOT NULL DEFAULT 'Fluency isn’t about using complex, difficult words. It’s about calming your mind, organizing your thoughts with clarity, and speaking with unwavering confidence.',
  bio TEXT NOT NULL DEFAULT 'With over 10 years of intensive speech mentorship and 12,000+ students coached, Bijay Adhikari has helped engineers, managers, founders, and students break through English anxiety, master executive presence, and unlock their full career potential.',
  photo_url TEXT,
  photo_size_bytes BIGINT DEFAULT 0,
  credential_label TEXT NOT NULL DEFAULT 'Certified TESOL Coach',
  experience_label TEXT NOT NULL DEFAULT '10+ Yrs Mentorship',
  learners_label TEXT NOT NULL DEFAULT '12,000+ Alumni',
  rating_label TEXT NOT NULL DEFAULT '4.9★ Rated',
  story_heading TEXT NOT NULL DEFAULT '“I saw brilliant minds silenced by communication fear.”',
  story_body TEXT NOT NULL DEFAULT '',
  stats JSONB
);

ALTER TABLE public.trainer_profile
  ADD COLUMN IF NOT EXISTS hero_kicker TEXT NOT NULL DEFAULT 'Meet Your Master Coach',
  ADD COLUMN IF NOT EXISTS stats JSONB;

ALTER TABLE public.trainer_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read trainer_profile" ON public.trainer_profile;
CREATE POLICY "Allow public read trainer_profile"
  ON public.trainer_profile
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and auth manage trainer_profile" ON public.trainer_profile;
CREATE POLICY "Allow anon and auth manage trainer_profile"
  ON public.trainer_profile
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.trainer_profile (
  id, name, role_title, quote, bio, photo_url, photo_size_bytes,
  credential_label, experience_label, learners_label, rating_label,
  story_heading, story_body
)
VALUES (
  'master-trainer',
  'Bijay Adhikari',
  'Founder & Lead Communication Coach at VERBORA',
  'Fluency isn’t about using complex, difficult words. It’s about calming your mind, organizing your thoughts with clarity, and speaking with unwavering confidence.',
  'With over 10 years of intensive speech mentorship and 12,000+ students coached, Bijay Adhikari has helped engineers, managers, founders, and students break through English anxiety, master executive presence, and unlock their full career potential.',
  '/assets/trainer-profile.jpg',
  0,
  'Certified TESOL Coach',
  '10+ Yrs Mentorship',
  '12,000+ Alumni',
  '4.9★ Rated',
  '“I saw brilliant minds silenced by communication fear.”',
  E'Throughout my career coaching professionals across tech, banking, and creative industries, I noticed a heartbreaking pattern: deeply intelligent, hard-working individuals were consistently passed over for promotions, froze in client meetings, or remained quiet in discussions simply because they doubted their English fluency.\n\nTraditional institutes made it worse by treating spoken English like a textbook grammar exam. They forced memorization of tenses and complex vocabulary, which only increased overthinking and hesitation.\n\nI founded VERBORA to rewrite that script. We built a safe, empowering environment where communication is treated as a practical sport—where you speak 80% of the time, receive real-time positive feedback, and build emotional confidence that stays with you for life.'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Schema-level grants for anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.leads TO anon, authenticated;
GRANT ALL ON TABLE public.testimonials TO anon, authenticated;
GRANT ALL ON TABLE public.courses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.trainer_profile TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
