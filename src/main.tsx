import { useEffect, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, CirclePlay, Clock, GraduationCap, Handshake,
  Headphones, Mail, Menu, MessageCircle, Mic2, MonitorPlay, Phone,
  Rocket, Search, Sparkles, Star, TrendingUp, UsersRound,
  X, MoveRight, ChevronRight, Instagram, Youtube, Linkedin,
  Quote, HeartHandshake, Target, Award, BadgeCheck, ShieldCheck,
  MapPin, Send, Lock, KeyRound, RefreshCw, Trash2, Download, LogOut,
  Eye, EyeOff, Database, Inbox, Calendar, AlertCircle,
  Plus, Edit3, Image, Upload, Video, ExternalLink, ArrowLeft, HardDrive,
} from 'lucide-react'
import './styles.css'
import './adjustments.css'
import { api } from './api'
import { DemoBooking, ContactMessage, Testimonial } from './types/database'
import {
  uploadImageToCloudinary,
  deleteMediaFromCloudinary,
  getSavedUploadPreset,
  saveUploadPreset,
  CLOUDINARY_CLOUD_NAME,
  MAX_STORAGE_BYTES,
} from './lib/cloudinary'
import {
  startBackgroundVideoUpload,
  subscribeToVideoUpload,
  clearVideoUploadTask,
  VideoUploadTask,
} from './lib/videoUploadManager'

type CourseId = 'spoken-english' | 'business-english' | 'public-speaking' | 'interview-preparation' | 'personality-development'

const courses = [
  {
    id: 'spoken-english' as CourseId,
    title: 'Spoken English',
    tagline: 'Speak fluently. Connect naturally.',
    short: 'Speak fluently. Be confident.',
    summary: 'Build the confidence to express yourself clearly in everyday conversations, discussions, and new situations.',
    icon: MessageCircle,
    iconClass: 'aqua',
    cover: '/assets/courses-cover/spoken-english.png',
    topics: ['Everyday conversation practice', 'Pronunciation and clarity', 'Vocabulary in real situations', 'Building fluency without hesitation'],
  },
  {
    id: 'business-english' as CourseId,
    title: 'Business English',
    tagline: 'Sound clear. Work confidently.',
    short: 'Excel professionally.',
    summary: 'Communicate with clarity at work, from professional emails and meetings to presenting your ideas with confidence.',
    icon: BriefcaseBusiness,
    iconClass: 'purple',
    cover: '/assets/courses-cover/business-english.png',
    topics: ['Professional conversations', 'Meetings and workplace vocabulary', 'Email and written communication', 'Confident presentations'],
  },
  {
    id: 'public-speaking' as CourseId,
    title: 'Public Speaking',
    tagline: 'Find your voice. Own the room.',
    short: 'Speak with impact.',
    summary: 'Learn to organize your thoughts, speak with presence, and deliver a message that people remember.',
    icon: Mic2,
    iconClass: 'mint',
    cover: '/assets/courses-cover/public-speaking.png',
    topics: ['Structuring a compelling talk', 'Voice and body language', 'Handling nerves and questions', 'Storytelling and audience connection'],
  },
  {
    id: 'interview-preparation' as CourseId,
    title: 'Interview Preparation',
    tagline: 'Show your strengths. Get ready.',
    short: 'Get Hired.',
    summary: 'Practice answering questions, communicating your strengths, and approaching important interviews with greater confidence.',
    icon: UsersRound,
    iconClass: 'amber',
    cover: '/assets/courses-cover/interview-preparation.png',
    topics: ['Introducing yourself effectively', 'Common interview scenarios', 'Answer structure and delivery', 'Mock interviews and feedback'],
  },
  {
    id: 'personality-development' as CourseId,
    title: 'Personality Development',
    tagline: 'Unlock your potential. Be your best.',
    short: 'Be Your Best.',
    summary: 'Develop personal presence, emotional intelligence, body language, and the mindset to succeed in personal and professional life.',
    icon: Sparkles,
    iconClass: 'teal',
    cover: '/assets/courses-cover/personality-development.png',
    topics: ['Body language and self-presence', 'Active listening and emotional intelligence', 'Overcoming self-doubt and hesitation', 'Etiquette and professional demeanor'],
  },
]

/**
 * =========================================================================
 * WHATSAPP DEMO BOOKING & POPUP CONFIGURATION
 * =========================================================================
 */
export const WHATSAPP_PHONE_NUMBER = '919876543210'

// 48 Hours Cooldown: 48 * 60 * 60 * 1000 = 172,800,000 milliseconds
export const POPUP_COOLDOWN_MS = 48 * 60 * 60 * 1000
export const POPUP_STORAGE_KEY = 'verbora_demo_popup_last_dismissed'

export function isPopupOnCooldown(): boolean {
  try {
    const raw = localStorage.getItem(POPUP_STORAGE_KEY)
    if (!raw) return false
    const timestamp = parseInt(raw, 10)
    if (isNaN(timestamp)) return false
    return Date.now() - timestamp < POPUP_COOLDOWN_MS
  } catch {
    return false
  }
}

export function recordPopupDismissed(): void {
  try {
    localStorage.setItem(POPUP_STORAGE_KEY, Date.now().toString())
  } catch {
    // LocalStorage might be disabled in strict privacy modes
  }
}

type DemoValues = { name: string; email: string; phone: string; course: CourseId | '' }

function Brand({ light = false, compact = false, dark = false }: { light?: boolean; compact?: boolean; dark?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''} ${compact ? 'brand-compact' : ''} ${dark ? 'brand-dark' : ''}`} aria-label="VERBORA home">
      <img
        src="/assets/verbora-symbol-transparent.png"
        alt="VERBORA Logo"
        className="brand-symbol"
        width={compact ? 42 : 54}
        height={compact ? 42 : 54}
        loading="eager"
      />
      <span className="brand-copy">
        <strong>VERBORA</strong>
        <small>SPEAK · EXPRESS · GROW</small>
      </span>
    </Link>
  )
}

function DemoForm({ inModal = false, defaultCourse }: { inModal?: boolean; defaultCourse?: CourseId }) {
  const [values, setValues] = useState<DemoValues>(() => ({
    name: '',
    email: '',
    phone: '',
    course: defaultCourse || '',
  }))
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'idle' | 'done'>('idle')
  const [lastWaUrl, setLastWaUrl] = useState('')

  function update<K extends keyof DemoValues>(key: K, value: DemoValues[K]) {
    setValues(old => ({ ...old, [key]: value }))
    if (error) setError('')
    if (phase !== 'idle') setPhase('idle')
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (values.name.trim().length < 2) {
      return setError('Please enter your full name.')
    }
    if (!values.course) {
      return setError('Please select a course to continue.')
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return setError('Please enter a valid email address.')
    }
    if (values.phone.trim() && values.phone.replace(/\D/g, '').length < 10) {
      return setError('Please enter a valid 10-digit phone number.')
    }

    const selectedCourse = courses.find(c => c.id === values.course)?.title || values.course
    const messageLines = [
      `*New Free Demo Booking — VERBORA*`,
      ``,
      `👤 *Name:* ${values.name.trim()}`,
      `📚 *Course:* ${selectedCourse}`,
      values.phone.trim() ? `📞 *Phone:* ${values.phone.trim()}` : null,
      values.email.trim() ? `✉️ *Email:* ${values.email.trim()}` : null,
      ``,
      `Hi, I want to book my free demo session. Please share available timings!`,
    ].filter(Boolean).join('\n')

    const cleanNumber = WHATSAPP_PHONE_NUMBER.replace(/\D/g, '')
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageLines)}`

    // Save lead record into Supabase (non-blocking)
    api.bookings.createDemoBooking({
      name: values.name.trim(),
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      course: selectedCourse,
      source: inModal ? 'popup-modal' : 'floating-card',
    }).catch(err => {
      console.warn('[DemoForm] Non-blocking Supabase save notice:', err)
    })

    setLastWaUrl(waUrl)
    setPhase('done')
    recordPopupDismissed()

    // Open WhatsApp directly in a new tab/app
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`demo-card modern-demo-card ${inModal ? 'demo-card-modal' : ''}`} id={inModal ? undefined : 'demo-form'}>
      {/* Top Header */}
      <div className="modern-demo-header">
        <h2>Book Your Free <span>Demo Session</span></h2>
        <p>Experience our live spoken English coaching and get direct trainer feedback on WhatsApp.</p>
      </div>

      {phase === 'done' ? (
        <div className="modern-demo-success" role="status">
          <div className="success-icon-wrap">
            <CheckCircle2 size={44} />
          </div>
          <h3>Connecting to WhatsApp!</h3>
          <p>Your demo details have been prepared. If WhatsApp didn't open automatically, click below to chat:</p>
          <a
            href={lastWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button modern-wa-btn"
          >
            <MessageCircle size={18} />
            <span>Open WhatsApp Chat</span>
            <MoveRight size={16} />
          </a>
          <button
            type="button"
            className="modern-reset-btn"
            onClick={() => { setPhase('idle'); setValues({ name: '', email: '', phone: '', course: defaultCourse || '' }) }}
          >
            Book another demo
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="modern-demo-form">
          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Full Name <span className="req">*</span></label>
              <div className="modern-input-field">
                <UsersRound size={17} />
                <input
                  aria-label="Your full name"
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={values.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Select Program <span className="req">*</span></label>
              <div className="modern-input-field field-select">
                <GraduationCap size={18} />
                <select
                  aria-label="Select course"
                  value={values.course}
                  onChange={e => update('course', e.target.value as CourseId | '')}
                  required
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="select-arrow" />
              </div>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Number <span className="opt">(Optional)</span></label>
              <div className="modern-input-field">
                <Phone size={16} />
                <input
                  aria-label="Your phone number"
                  autoComplete="tel"
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={values.phone}
                  onChange={e => update('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Email Address <span className="opt">(Optional)</span></label>
              <div className="modern-input-field">
                <Mail size={16} />
                <input
                  aria-label="Your email"
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={e => update('email', e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p className="modern-form-error" role="alert">{error}</p>}

          <button className="primary-button modern-submit-btn" type="submit">
            <MessageCircle size={18} />
            <span>Book Free Demo on WhatsApp</span>
            <MoveRight size={16} />
          </button>
        </form>
      )}
    </div>
  )
}

function SiteHeader({ onDemo }: { onDemo: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useRouterState({ select: state => state.location.pathname })

  useEffect(() => { setMenuOpen(false); setCoursesOpen(false); setSearchOpen(false) }, [location])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setCoursesOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleMenu = () => {
    setMenuOpen(open => {
      const next = !open
      if (next) setSearchOpen(false)
      return next
    })
  }

  const toggleSearch = () => {
    setSearchOpen(open => {
      const next = !open
      if (next) setMenuOpen(false)
      return next
    })
  }

  const filtered = courses.filter(course => `${course.title} ${course.summary}`.toLowerCase().includes(search.toLowerCase()))
  const isHome = location === '/'
  const isAbout = location === '/about'
  const isTrainer = location === '/trainer' || location === '/trainers'
  const isStories = location === '/stories' || location === '/success-stories'
  const isContact = location === '/contact' || location === '/contact-us'
  const isCourses = location.startsWith('/courses')

  return (
    <header className={`site-header ${isHome ? 'site-header-home' : 'site-header-subpage'}`}>
      <div className="header-inner">
        <Brand compact dark={!isHome} />
        <nav className={`navigation ${menuOpen ? 'navigation-open' : ''}`} aria-label="Main navigation">
          <Link to="/" className={`nav-item ${isHome ? 'nav-active nav-home' : ''}`} onClick={() => setMenuOpen(false)}>
            <span>Home</span>
            <ChevronRight size={15} className="mobile-link-arrow" />
          </Link>
          <Link to="/about" className={`nav-item ${isAbout ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
            <span>About Us</span>
            <ChevronRight size={15} className="mobile-link-arrow" />
          </Link>
          <Link to="/trainer" className={`nav-item ${isTrainer ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
            <span>Trainer</span>
            <ChevronRight size={15} className="mobile-link-arrow" />
          </Link>
          <div className="courses-menu-wrap">
            <button
              className={`nav-dropdown ${coursesOpen ? 'courses-expanded' : ''} ${isCourses ? 'nav-active' : ''}`}
              aria-expanded={coursesOpen}
              onClick={() => setCoursesOpen(open => !open)}
            >
              <span>Courses</span>
              <ChevronDown size={14} className="dropdown-arrow" />
            </button>
            {coursesOpen && (
              <div className="course-dropdown">
                {courses.map(course => (
                  <Link
                    key={course.id}
                    to="/courses/$courseSlug"
                    params={{ courseSlug: course.id }}
                    className={location === `/courses/${course.id}` ? 'course-item-active' : ''}
                    onClick={() => { setCoursesOpen(false); setMenuOpen(false) }}
                  >
                    <course.icon size={18} />
                    <span>{course.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/stories" className={`nav-item ${isStories ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
            <span>Success Stories</span>
            <ChevronRight size={15} className="mobile-link-arrow" />
          </Link>
          <Link to="/contact" className={`nav-item ${isContact ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
            <span>Contact</span>
            <ChevronRight size={15} className="mobile-link-arrow" />
          </Link>
          <div className="mobile-menu-footer">
            <button className="primary-button mobile-menu-cta" onClick={() => { setMenuOpen(false); onDemo() }}>
              <span>Book Free Demo</span>
              <MoveRight size={15} />
            </button>
          </div>
        </nav>
        <div className="header-actions">
          <button className={`search-button ${searchOpen ? 'search-active' : ''}`} aria-label="Search courses" onClick={toggleSearch}><Search size={20} /></button>
          <button className="primary-button header-join" onClick={onDemo}>Join Now <MoveRight size={15} /></button>
          <button className={`mobile-menu ${menuOpen ? 'menu-active' : ''}`} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={toggleMenu}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {menuOpen && <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      {searchOpen && (
        <div className="search-panel">
          <div className="search-input-row">
            <Search size={19} />
            <input aria-label="Search courses" autoFocus placeholder="Find the right program…" value={search} onChange={e => setSearch(e.target.value)} />
            <button aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={18} /></button>
          </div>
          <div className="search-results">
            {filtered.length ? filtered.map(course => (
              <Link key={course.id} to="/courses/$courseSlug" params={{ courseSlug: course.id }}>
                <course.icon size={18} />
                {course.title}
                <MoveRight size={16} />
              </Link>
            )) : <p>No matching courses found.</p>}
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-video-wrapper" aria-hidden="true">
        <video
          className="hero-video-element"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source
            src="https://res.cloudinary.com/mtjv4nu9/video/upload/v1795687985/VIDEO-2026-11-25-15-59-08_2.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-video-gradient" />
      </div>
      <div className="hero-light-orb" aria-hidden="true" />
      <div className="hero-copy">
        <h1>Speak Confidently.<br />Communicate <span>Professionally.</span></h1>
        <p className="hero-description">VERBORA helps you build essential communication skills with practical learning, expert guidance, and the confidence to express yourself.</p>
        <div className="hero-buttons"><a href="/#courses" className="primary-button hero-primary">Explore Courses</a><a href="/#about" className="secondary-button"><CirclePlay size={19} fill="#0966bf" color="white" />How It Works</a></div>
        <div className="hero-highlights">
          <div><UsersRound size={25} /><span><strong>Practical</strong><small>Skill Building</small></span></div>
          <div><Star size={25} className="star-icon" fill="currentColor" /><span><strong>Guided</strong><small>Learning</small></span></div>
          <div><CheckCircle2 size={25} className="trophy-icon" /><span><strong>Focused</strong><small>On Your Goals</small></span></div>
        </div>
      </div>
      <div className="hero-right-ribbon" aria-hidden="true"><span>Learn Today…<br />Lead Tomorrow…</span></div>
    </section>
  )
}

function CoursesSection() {
  return (
    <section className="courses-section" id="courses">
      <div className="home-row-header">
        <h2 className="home-row-title">Comprehensive Courses for Your Growth</h2>
        <p className="home-row-sub">Choose a structured program designed to build fluent, confident, and professional speech.</p>
      </div>

      <div className="course-grid">
        {courses.map(course => (
          <Link
            to="/courses/$courseSlug"
            params={{ courseSlug: course.id }}
            key={course.id}
            className="course-card"
          >
            <img src={course.cover} alt={course.title} className="course-card-img" />
            <div className="course-card-overlay">
              <span className="course-card-icon-wrap">
                <course.icon size={19} strokeWidth={2.4} />
              </span>
              <strong className="course-card-heading">{course.title}</strong>
              <span className="course-card-subheading">{course.short}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

const benefits = [
  { icon: Rocket, title: 'Expert Trainers', text: '1-on-1 guidance that continually refines your pronunciation, diction, and tonality.' },
  { icon: MonitorPlay, title: 'Interactive Classes', text: 'Active participatory drills, live mock situations, and constructive real-time feedback.' },
  { icon: TrendingUp, title: 'Practical Learning', text: 'Speech frameworks that apply directly in office meetings, presentations, and client discussions.' },
  { icon: Handshake, title: 'Career Confidence', text: 'Speak with executive presence, natural assertiveness, and composure in high-stakes rooms.' },
  { icon: Headphones, title: 'Continued Support', text: 'Daily WhatsApp voice note coaching and habit drills to guarantee lasting fluency.' },
]

function WhySection({ onDemo: _onDemo }: { onDemo?: () => void } = {}) {
  return (
    <section className="home-row-section" id="about">
      <div className="home-row-header">
        <h2 className="home-row-title">Why Verbora?</h2>
        <p className="home-row-sub">Transforming learners into confident communicators through personalized mentorship and practical speech habits.</p>
      </div>

      <div className="home-cards-scroll-track">
        {benefits.map(benefit => (
          <div className="home-benefit-item-card" key={benefit.title}>
            <span className="home-benefit-icon-box">
              <benefit.icon size={26} strokeWidth={2} />
            </span>
            <strong className="home-benefit-card-title">{benefit.title}</strong>
            <p className="home-benefit-card-text">{benefit.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

interface StoryItem {
  name: string
  role: string
  image: string
  video?: string
  text: string
  badge?: string
}

const stories: StoryItem[] = [
  {
    name: 'Rohit Verma',
    role: 'Software Engineer · Spoken English',
    image: '/assets/testimonials/rohit.jpg',
    text: 'VERBORA helped me improve my communication and speak with genuine confidence in client calls and global team presentations.',
    badge: 'Fluency & Workplace English',
  },
  {
    name: 'Sneha Gupta',
    role: 'Marketing Lead · Business English',
    image: '/assets/testimonials/sneha.jpg',
    text: 'A practical learning experience with engaging sessions, constructive feedback, and continuous supportive guidance.',
    badge: 'Leadership & Impact',
  },
  {
    name: 'Aman Singh',
    role: 'College Graduate · Interview Prep',
    image: '/assets/testimonials/aman.jpg',
    text: 'The structured mock interviews and body language practice gave me the clarity and confidence to crack my dream job.',
    badge: 'Interview Success',
  },
  {
    name: 'Priya Sharma',
    role: 'Team Lead · Public Speaking',
    image: '/assets/testimonials/priya.jpg',
    text: 'Overcoming stage fright in front of a large audience was my biggest milestone. The trainers made public speaking enjoyable.',
    badge: 'Stage & Presentation',
  },
]

function StoryVideoModal({ story, onClose }: { story: StoryItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!story) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [story, onClose])

  if (!story) return null

  return (
    <div
      className="story-video-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="story-video-modal" role="dialog" aria-modal="true" aria-label={`Testimonial video of ${story.name}`}>
        <div className="story-video-modal-header">
          <div className="story-video-speaker">
            <img src={story.image} alt={story.name} className="story-modal-avatar" />
            <div>
              <strong>{story.name}</strong>
              <small>{story.role}</small>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close video">
            <X size={20} />
          </button>
        </div>

        <div className="story-video-player-wrap">
          <video
            src={story.video}
            controls
            autoPlay
            playsInline
            className="story-video-element"
            poster={story.image}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="story-video-modal-footer">
          <Quote size={16} fill="currentColor" />
          <p>“{story.text}”</p>
        </div>
      </div>
    </div>
  )
}

// TanStack Query Client with optimal caching (5 minutes stale time, no localStorage pollution)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache results in memory for 5 minutes
      gcTime: 1000 * 60 * 30,    // Keep garbage collection cache for 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function useTestimonialsQuery() {
  return useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const res = await api.testimonials.getTestimonials()
      return res.data || []
    },
  })
}

function StoriesSection() {
  const [videoStory, setVideoStory] = useState<StoryItem | null>(null)
  
  // High performance in-memory caching via TanStack Query
  const { data: dbTestimonials = [] } = useTestimonialsQuery()

  const currentStories: StoryItem[] = useMemo(() => {
    const activeItems = dbTestimonials.filter(t => t.is_active)
    if (activeItems.length > 0) {
      return activeItems.map(t => ({
        name: t.name,
        role: t.role,
        image: t.image,
        video: t.video || undefined,
        text: t.text,
        badge: t.badge || undefined,
      }))
    }
    return stories
  }, [dbTestimonials])

  return (
    <>
      <section className="home-row-section" id="stories">
        <div className="home-row-header">
          <h2 className="home-row-title">Testimonials</h2>
          <p className="home-row-sub">Hear directly from learners who transformed their fluency and confidence.</p>
        </div>

        {/* Horizontally scrolling single-row container */}
        <div className="home-cards-scroll-track">
          {currentStories.map((story, idx) => (
            <article className="home-testimonial-item-card" key={(story.name || 'story') + idx}>
              <div className="home-testi-top-row">
                <img src={story.image} alt={story.name} className="home-testi-avatar" />
                <div className="home-testi-meta">
                  <strong className="home-testi-name">{story.name}</strong>
                  <span className="home-testi-role">{story.role}</span>
                  {story.badge && <span className="home-testi-badge">{story.badge}</span>}
                </div>
              </div>

              <div className="home-testi-quote-wrap">
                <Quote size={16} className="home-testi-quote-icon" />
                <p className="home-testi-quote-text">“{story.text}”</p>
              </div>

              {story.video && (
                <div className="home-testi-footer">
                  <button
                    type="button"
                    className="home-testi-video-btn"
                    onClick={() => setVideoStory(story)}
                    aria-label={`Watch ${story.name}'s video testimonial`}
                    title="Watch video testimonial"
                  >
                    <CirclePlay size={15} fill="currentColor" />
                    <span>Watch Video Testimonial</span>
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <StoryVideoModal story={videoStory} onClose={() => setVideoStory(null)} />
    </>
  )
}

function SiteFooter({ onDemo }: { onDemo: () => void }) {
  return (
    <footer id="contact" className="site-footer">
      <div className="footer-container">
        {/* Compact Pre-footer CTA */}
        <div className="footer-cta-card">
          <div className="footer-cta-left">
            <div className="footer-cta-head-row">
              <span className="footer-cta-badge">
               Free Demo
              </span>
              <h3>Ready to Speak with Confidence?</h3>
            </div>
            <p>
              Join ambitious learners and professionals who unlocked fluency and career growth with VERBORA.
            </p>
          </div>
          <div className="footer-cta-right">
            <button className="footer-cta-btn" onClick={onDemo}>
              <span>Book Free Demo</span>
              <MoveRight size={15} />
            </button>
            <span className="footer-cta-sub">Free 1:1 Consultation · Expert Feedback</span>
          </div>
        </div>

        {/* Compact Multi-column Grid */}
        <div className="footer-main-grid">
          {/* Column 1: Brand & Mission */}
          <div className="footer-col footer-col-brand">
            <Brand light compact />
            <p className="footer-brand-desc">
              Empowering learners to express their authentic voice, speak fluently, and build unshakable confidence for career and life.
            </p>
            <div className="footer-social-links">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VERBORA on LinkedIn"
                className="footer-social-btn"
              >
                <Linkedin size={15} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VERBORA on Instagram"
                className="footer-social-btn"
              >
                <Instagram size={15} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VERBORA on YouTube"
                className="footer-social-btn"
              >
                <Youtube size={15} />
              </a>
            </div>
          </div>

          {/* Column 2: Programs */}
          <div className="footer-col">
            <h4 className="footer-col-title">Our Programs</h4>
            <ul className="footer-links-list">
              {courses.map(course => (
                <li key={course.id}>
                  <Link to="/courses/$courseSlug" params={{ courseSlug: course.id }}>
                    {course.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div className="footer-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/trainer">Meet the Trainer</Link></li>
              <li><Link to="/stories">Success Stories</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><button className="footer-text-btn" onClick={onDemo}>Book Demo</button></li>
            </ul>
          </div>

          {/* Column 4: Contact & Hours */}
          <div className="footer-col footer-col-contact">
            <h4 className="footer-col-title">Get in Touch</h4>
            <div className="footer-contact-items">
              <a href="mailto:hello@verbora.com" className="footer-contact-item">
                <Mail size={14} />
                <span>hello@verbora.com</span>
              </a>
              <a href="tel:+919876543210" className="footer-contact-item">
                <Phone size={14} />
                <span>+91 98765 43210</span>
              </a>
              <div className="footer-contact-item">
                <Clock size={14} />
                <span>Mon – Sat: 9 AM – 8 PM</span>
              </div>
            </div>
            <div className="footer-batch-badge">
              <span className="live-dot" />
              <span>Batches start every Monday</span>
            </div>
          </div>
        </div>

        {/* Footer Bottom / Legal */}
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} VERBORA Education. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="#privacy">Privacy</a>
            <span className="footer-dot">•</span>
            <a href="#terms">Terms</a>
            <span className="footer-dot">•</span>
            <a href="#cookies">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function DemoModal({ open, onClose, defaultCourse }: { open: boolean; onClose: () => void; defaultCourse?: CourseId }) {
  useEffect(() => {
    if (!open) return
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-label="Book a free demo">
        <button
          type="button"
          className="modal-close"
          aria-label="Close demo popup"
          onClick={onClose}
          title="Close"
        >
          <X size={18} />
        </button>
        <DemoForm inModal defaultCourse={defaultCourse} />
      </div>
    </div>
  )
}

function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const showDemo = () => setModalOpen(true)

  // Automatic popup on initial visit with 48 hours cooldown
  useEffect(() => {
    if (isPopupOnCooldown()) return

    // Gentle 1.2s delay for clean entrance after hero loads
    const timer = window.setTimeout(() => {
      if (!isPopupOnCooldown()) {
        setModalOpen(true)
      }
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [])

  const handleCloseModal = () => {
    setModalOpen(false)
    recordPopupDismissed()
  }

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main>
        <Hero />
        {/* Book Free Demo floating card / button commented out as per instructions */}
        {/*
        {formOpen ? (
          <div className="floating-demo" ref={formRef}>
            <button className="floating-close" aria-label="Close free demo form" onClick={() => setFormOpen(false)}><X size={17} /></button>
            <DemoForm />
          </div>
        ) : (
          <button className="floating-reopen" onClick={showDemo}><CalendarDays size={18} />Book Free Demo</button>
        )}
        */}
        <div className="content-shell without-demo">
          <CoursesSection />
          <WhySection onDemo={showDemo} />
          <StoriesSection />
        </div>
      </main>
      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={handleCloseModal} />
    </>
  )
}

function AboutPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const showDemo = () => setModalOpen(true)

  const stats = [
    { number: '10,000+', label: 'Learners Trained', sub: 'Across colleges & corporates' },
    { number: '98%', label: 'Confidence Growth', sub: 'Measured pre & post course' },
    { number: '15+ Yrs', label: 'Trainer Experience', sub: 'Certified speech & voice coaches' },
    { number: '4.9 ★', label: 'Average Rating', sub: 'From verified student reviews' },
  ]

  const pillars = [
    {
      icon: Mic2,
      title: 'Practice Over Theory',
      tag: '80% Speaking Practice',
      desc: 'You can never master speaking just by reading grammar rules. 80% of our session time is dedicated to active speaking drills, thought-flow exercises, and conversational practice.',
    },
    {
      icon: HeartHandshake,
      title: 'Safe, Zero-Judgment Space',
      tag: 'Empathy First',
      desc: 'Hesitation stems from fear of judgment. Our trainers cultivate a welcoming, patient environment where mistakes are celebrated as milestones of progress.',
    },
    {
      icon: Target,
      title: 'Personalized Coaching',
      tag: 'Tailored to Your Goal',
      desc: 'Whether preparing for a tech interview, leading team standups, or building daily conversational fluency, your trainer aligns exercises to your exact personal targets.',
    },
    {
      icon: Sparkles,
      title: 'Real-World Fluency',
      tag: 'Lifelong Transformation',
      desc: 'We focus on practical workplace communication, meeting vocabulary, confident body language, and voice modulation that make you stand out anywhere.',
    },
  ]

  const methodology = [
    {
      step: '01',
      title: 'Speech & Baseline Diagnostic',
      desc: 'We evaluate your natural pacing, vocabulary range, hesitation triggers, and pronunciation to formulate your personalized improvement roadmap.',
    },
    {
      step: '02',
      title: 'Daily Interactive Drills',
      desc: 'Structured thought-flow exercises, impromptu speaking rounds, and conversational scenarios that break the mental translation habit.',
    },
    {
      step: '03',
      title: 'Simulated Real-World Scenarios',
      desc: 'Mock interviews, corporate presentations, client calls, and debate panels with live peer interaction and mentor guidance.',
    },
    {
      step: '04',
      title: 'Feedback, Polish & Mastery',
      desc: 'Actionable micro-feedback on diction, pause management, executive presence, and tonality until fluent speaking becomes second nature.',
    },
  ]

  const cohorts = [
    {
      icon: BriefcaseBusiness,
      title: 'Working Professionals',
      desc: 'Lead global client calls, speak up in management meetings, and present ideas with authority.',
    },
    {
      icon: GraduationCap,
      title: 'Job Seekers & Graduates',
      desc: 'Ace behavioral interviews, HR rounds, and group discussions with poise and structured storytelling.',
    },
    {
      icon: UsersRound,
      title: 'Aspiring Public Speakers',
      desc: 'Conquer stage fright, project your voice clearly, and engage audiences on any podium or stage.',
    },
    {
      icon: Rocket,
      title: 'Lifelong Learners',
      desc: 'Express yourself naturally in social gatherings, travel, parent-teacher meetings, and daily life.',
    },
  ]

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main className="about-page">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-hero-inner">
            <h1>
              Empowering Voices.<br />
              Building <span>Unstoppable Confidence.</span>
            </h1>
            <p className="about-hero-lead">
              VERBORA was founded with a singular conviction: English communication shouldn't be a source of anxiety or an obstacle to your dreams. We exist to help every learner find their voice and speak with authentic clarity.
            </p>
            <div className="about-hero-actions">
              <button className="primary-button" onClick={showDemo}>
                Book a Free Demo <MoveRight size={16} />
              </button>
              <a href="/#courses" className="secondary-button">
                Explore Programs
              </a>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="about-stats-strip">
          <div className="about-stats-grid">
            {stats.map(s => (
              <div key={s.label} className="about-stat-card">
                <strong>{s.number}</strong>
                <span>{s.label}</span>
                <small>{s.sub}</small>
              </div>
            ))}
          </div>
        </section>

        {/* The Origin Story & Problem */}
        <section className="about-story-section">
          <div className="about-section-header">
            <span className="section-kicker">Our Mission</span>
            <h2>Why We Built <span>VERBORA</span></h2>
            <p>Bridging the gap between knowing English in your head and speaking it with confidence in real life.</p>
          </div>
          <div className="about-story-grid">
            <div className="about-story-card challenge-card">
              <div className="story-card-tag">The Challenge</div>
              <h3>The Silent Barrier Holding Learners Back</h3>
              <p>
                In school and college, millions of students learn grammar rules and pass written exams. Yet when placed in front of an interviewer, a client, or a room of colleagues, a paralyzing hesitation sets in.
              </p>
              <p>
                Learners get trapped in &ldquo;mental translation&rdquo;&mdash;translating thoughts from their native language into English before speaking&mdash;leading to pauses, awkward fillers, and loss of confidence.
              </p>
            </div>
            <div className="about-story-card solution-card">
              <div className="story-card-tag solution-tag">The VERBORA Solution</div>
              <h3>A High-Energy Speaking Laboratory</h3>
              <p>
                We replaced passive lectures with active, engaging speaking routines. At VERBORA, learners speak from day one in an encouraging, judgment-free environment.
              </p>
              <p>
                By combining real-time mentor corrections, structured speech habits, and immersive roleplays, we retrain the brain to think and respond in English naturally.
              </p>
            </div>
          </div>
        </section>

        {/* Core Values / Pillars */}
        <section className="about-values-section">
          <div className="about-section-header">
            <span className="section-kicker">Our Philosophy</span>
            <h2>The Four Pillars of <span>VERBORA</span></h2>
            <p>The core values that shape our training sessions, curriculum, and learner mentorship.</p>
          </div>
          <div className="about-values-grid">
            {pillars.map(p => (
              <div key={p.title} className="about-value-card">
                <span className="value-icon-wrap">
                  <p.icon size={26} strokeWidth={2.2} />
                </span>
                <span className="value-badge">{p.tag}</span>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology Framework */}
        <section className="about-method-section">
          <div className="about-section-header">
            <span className="section-kicker">How We Train</span>
            <h2>The VERBORA <span>Fluency Framework</span></h2>
            <p>A proven 4-stage systematic methodology that transforms hesitant speakers into articulate communicators.</p>
          </div>
          <div className="about-method-grid">
            {methodology.map(m => (
              <div key={m.step} className="about-method-card">
                <div className="method-step-num">{m.step}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Empower */}
        <section className="about-cohorts-section">
          <div className="about-section-header">
            <span className="section-kicker">Our Community</span>
            <h2>Designed for <span>Every Learner</span></h2>
            <p>From university graduates to senior corporate managers, we cater to all aspirations.</p>
          </div>
          <div className="about-cohorts-grid">
            {cohorts.map(c => (
              <div key={c.title} className="about-cohort-card">
                <span className="cohort-icon-wrap">
                  <c.icon size={22} strokeWidth={2} />
                </span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="about-cta-section">
          <div className="about-cta-card">
            <span className="cta-sparkle-pill">
              <Sparkles size={15} /> Your Transformation Starts Here
            </span>
            <h2>Ready to Speak With <span>Unshakable Confidence?</span></h2>
            <p>Book a free 1-on-1 consultation session with our expert trainers and experience the VERBORA difference.</p>
            <div className="about-cta-buttons">
              <button className="primary-button" onClick={showDemo}>
                Book a Free Demo <MoveRight size={16} />
              </button>
              <a href="/#courses" className="secondary-button light-sec-btn">
                Browse All Courses
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function TrainerPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const showDemo = () => setModalOpen(true)

  const stats = [
    { number: '10+ Yrs', label: 'Coaching Experience', sub: 'Executive speech & voice mentorship' },
    { number: '12,000+', label: 'Learners Mentored', sub: 'Engineers, leaders & job seekers' },
    { number: '96%', label: 'Fluency Breakthrough', sub: 'Overcoming hesitation & stage fear' },
    { number: '4.9 ★', label: 'Student Rating', sub: 'Across 1,500+ verified alumni reviews' },
  ]

  const pillars = [
    {
      icon: HeartHandshake,
      title: 'Hesitation Erasure & Psychological Ease',
      tag: 'Fear-Free Zone',
      desc: 'Most learners know grammar rules in their heads, but fear of judgment freezes their tongue. We first eliminate internal hesitation through psychological ease and patient speaking drills.',
    },
    {
      icon: Mic2,
      title: 'Vocal Modulation & Accent Clarity',
      tag: 'Diction & Delivery',
      desc: 'Master breath control, syllable stress, pitch variation, and natural pauses. Learn to project authority and sound engaging without putting on a fake accent.',
    },
    {
      icon: Target,
      title: 'Structured Thought-to-Speech Flow',
      tag: 'Stop Translating',
      desc: 'We train your brain to think directly in English using frameworks like PREP (Point, Reason, Example, Point) so you never run out of words during spontaneous discussions.',
    },
    {
      icon: Sparkles,
      title: 'Real-World High-Stakes Simulations',
      tag: 'Practical Mastery',
      desc: 'Mock client demos, salary negotiations, leadership standups, and stage keynotes. Live scenario practice ensures you perform seamlessly when the stakes are real.',
    },
  ]

  const specializations = [
    {
      icon: MessageCircle,
      title: 'Spoken English & Fluency Acceleration',
      desc: 'Eliminating native language translation, filler words (um, ah, like), and pauses so your thoughts flow smoothly and effortlessly.',
    },
    {
      icon: BriefcaseBusiness,
      title: 'Executive Workplace Communication',
      desc: 'Mastering corporate diplomacy, team meetings, email clarity, client negotiations, and communicating with global stakeholders.',
    },
    {
      icon: Mic2,
      title: 'Public Speaking & Stage Presence',
      desc: 'Conquering stage fright, mastering microphone technique, purposeful stage movement, and captivating audiences of 5 to 500+ people.',
    },
    {
      icon: Award,
      title: 'Job Interview & Leadership Drills',
      desc: 'Behavioral STAR storytelling, cracking tricky situational questions, posture alignment, and negotiating top-bracket compensation.',
    },
    {
      icon: UsersRound,
      title: 'Personality & Executive Presence',
      desc: 'Developing a commanding yet warm aura, confident eye contact, open body language, and professional charismatic demeanor.',
    },
    {
      icon: ShieldCheck,
      title: 'Voice Modulation & Accent Neutralization',
      desc: 'Softening mother-tongue influence (MTI), smoothing harsh vowel transitions, and achieving crystal-clear global articulation.',
    },
  ]

  const mentorshipSteps = [
    {
      step: '01',
      title: 'Detailed Speech & Hesitation Diagnostic',
      desc: 'A comprehensive 1-on-1 assessment analyzing your speaking tempo, hesitation triggers, vocabulary variety, and filler-word frequency.',
    },
    {
      step: '02',
      title: 'Personalized 30-Day Growth Roadmap',
      desc: 'A custom-tailored curriculum matching your immediate professional milestone—whether cracking a global interview or leading board meetings.',
    },
    {
      step: '03',
      title: 'Live 1-on-1 Drills with Tactical Feedback',
      desc: 'Real-time roleplays and speech drills with instantaneous, constructive feedback on diction, tone, eye contact, and phrasing.',
    },
    {
      step: '04',
      title: 'Daily WhatsApp Voice Note Mentorship',
      desc: 'Send daily 2-minute speech tasks on WhatsApp and receive direct audio voice-note critiques and personalized pronunciation tune-ups.',
    },
  ]

  const testimonials = [
    {
      name: 'Rohit Verma',
      role: 'Senior Software Engineer',
      quote: 'Bijay Sir completely transformed my confidence on US client calls. I used to translate every Hindi word in my head before speaking. In 4 weeks, that hesitation vanished.',
      tag: 'Fluency & Client Calls',
    },
    {
      name: 'Sneha Gupta',
      role: 'Marketing Manager',
      quote: 'He doesn’t just teach English—he teaches executive psychology. How to hold pauses, command attention in meetings, and present without nervousness. Truly life-changing!',
      tag: 'Executive Presence',
    },
    {
      name: 'Aman Singh',
      role: 'College Graduate',
      quote: 'I had 3 rejections due to communication anxiety. Bijay Sir coached me through mock interviews and body language. Cleared my Deloitte interview on the first attempt!',
      tag: 'Interview Cleared',
    },
  ]

  const credentials = [
    { title: 'Certified TESOL / TEFL Communications Coach', org: 'Global English Teaching Accreditation' },
    { title: 'Master Voice & Speech Trainer', org: 'Voice Dynamics & Articulation Specialist' },
    { title: 'Corporate Soft-Skills Consultant', org: 'Trained executives at Fortune 500 tech firms' },
    { title: 'Creator of the 30-Day Fluency Accelerator', org: 'Proprietary speech confidence framework' },
  ]

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main className="trainer-page">
        {/* 1. Hero Section */}
        <section className="trainer-hero">
          <div className="content-shell">
            <div className="trainer-hero-grid">
              {/* Left Column: Bio & Intro */}
              <div className="trainer-hero-copy">
                <span className="section-kicker">Meet Your Master Coach</span>
                <h1>Shivam</h1>
                <p className="trainer-title-sub">Founder & Lead Communication Coach at VERBORA</p>
                <blockquote className="trainer-hero-quote">
                  <Quote size={20} className="trainer-quote-icon" />
                  <span>“Fluency isn’t about using complex, difficult words. It’s about calming your mind, organizing your thoughts with clarity, and speaking with unwavering confidence.”</span>
                </blockquote>
                <p className="trainer-hero-lead">
                  With over 10 years of intensive speech mentorship and 12,000+ students coached, Bijay Adhikari has helped engineers, managers, founders, and students break through English anxiety, master executive presence, and unlock their full career potential.
                </p>

                {/* Quick Credential Chips */}
                <div className="trainer-quick-chips">
                  <span><BadgeCheck size={16} /> Certified TESOL Coach</span>
                  <span><Clock size={16} /> 10+ Yrs Mentorship</span>
                  <span><UsersRound size={16} /> 12,000+ Alumni</span>
                  <span><Star size={16} /> 4.9★ Rated</span>
                </div>

                <div className="trainer-hero-actions">
                  <button className="primary-button" onClick={showDemo}>
                    Book 1-on-1 Consultation
                    <MoveRight size={16} />
                  </button>
                  <a href="/#courses" className="secondary-button">
                    Explore Coaching Programs
                  </a>
                </div>
              </div>

              {/* Right Column: High-Res Portrait Card */}
              <div className="trainer-photo-wrap">
                <div className="trainer-photo-card">
                  <div className="trainer-photo-backdrop" />
                  <img
                    src="/assets/trainer-profile.jpg"
                    alt="Shivam - Master Communication Coach"
                    className="trainer-photo-img"
                  />
                  <div className="trainer-photo-overlay-badge">
                    <Star size={17} className="star-fill" />
                    <div>
                      <strong>10+ Years Mentorship</strong>
                      <small>Master Voice & Speech Coach</small>
                    </div>
                  </div>
                  <div className="trainer-photo-floating-chip">
                    <CheckCircle2 size={16} />
                    <span>12,000+ Success Stories</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Key Statistics Strip */}
        <section className="trainer-stats-strip">
          <div className="content-shell">
            <div className="trainer-stats-grid">
              {stats.map(s => (
                <div className="trainer-stat-card" key={s.label}>
                  <strong>{s.number}</strong>
                  <span>{s.label}</span>
                  <small>{s.sub}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="content-shell">
          {/* 3. The Story & Vision Section */}
          <section className="trainer-story-section">
            <div className="trainer-story-card">
              <span className="section-kicker">The Story Behind VERBORA</span>
              <h2>“I saw brilliant minds silenced by communication fear.”</h2>
              <div className="trainer-story-text">
                <p>
                  Throughout my career coaching professionals across tech, banking, and creative industries, I noticed a heartbreaking pattern: deeply intelligent, hard-working individuals were consistently passed over for promotions, froze in client meetings, or remained quiet in discussions simply because they doubted their English fluency.
                </p>
                <p>
                  Traditional institutes made it worse by treating spoken English like a textbook grammar exam. They forced memorization of tenses and complex vocabulary, which only increased overthinking and hesitation.
                </p>
                <p>
                  I founded VERBORA to rewrite that script. We built a safe, empowering environment where communication is treated as a practical sport—where you speak 80% of the time, receive real-time positive feedback, and build emotional confidence that stays with you for life.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Coaching Methodology / 4-Pillar Framework */}
          <section className="trainer-framework-section">
            <div className="about-section-header">
              <span className="section-kicker">The Methodology</span>
              <h2>The 4 Pillars of <span>Speech Mastery</span></h2>
              <p>A science-backed, human-first approach to spoken fluency developed over a decade of coaching.</p>
            </div>
            <div className="trainer-pillars-grid">
              {pillars.map(p => (
                <div className="trainer-pillar-card" key={p.title}>
                  <div className="trainer-pillar-header">
                    <span className="trainer-pillar-icon"><p.icon size={24} /></span>
                    <span className="trainer-pillar-tag">{p.tag}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Areas of Specialization */}
          <section className="trainer-specialties-section">
            <div className="about-section-header">
              <span className="section-kicker">Core Expertise</span>
              <h2>What You Can <span>Master With Him</span></h2>
              <p>Targeted coaching tailored to your specific communication hurdles and career stage.</p>
            </div>
            <div className="trainer-specialties-grid">
              {specializations.map(item => (
                <div className="trainer-specialty-card" key={item.title}>
                  <div className="trainer-spec-icon-wrap">
                    <item.icon size={22} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Mentorship Journey (How 1-on-1 Works) */}
          <section className="trainer-journey-section">
            <div className="about-section-header">
              <span className="section-kicker">The Learning Experience</span>
              <h2>How Your <span>1-on-1 Mentorship</span> Unfolds</h2>
              <p>Structured, step-by-step guidance designed to turn hesitant speakers into confident communicators.</p>
            </div>
            <div className="trainer-steps-grid">
              {mentorshipSteps.map(step => (
                <div className="trainer-step-card" key={step.step}>
                  <span className="trainer-step-num">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Student Testimonials about the Coach */}
          <section className="trainer-reviews-section">
            <div className="about-section-header">
              <span className="section-kicker">Alumni Feedback</span>
              <h2>What Students Say About <span>Bijay Sir</span></h2>
              <p>Real stories from working professionals and students whose careers accelerated with VERBORA.</p>
            </div>
            <div className="trainer-reviews-grid">
              {testimonials.map(t => (
                <div className="trainer-review-card" key={t.name}>
                  <span className="trainer-review-badge">{t.tag}</span>
                  <p className="trainer-review-quote">“{t.quote}”</p>
                  <div className="trainer-reviewer-meta">
                    <div className="trainer-reviewer-avatar">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <strong>{t.name}</strong>
                      <small>{t.role}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Certifications & Credentials */}
          <section className="trainer-credentials-section">
            <div className="trainer-credentials-card">
              <div className="trainer-cred-copy">
                <span className="section-kicker">Verified Credentials</span>
                <h2>Accreditations & Professional Background</h2>
                <p>Equipped with globally recognized speech, voice, and TESOL pedagogy accreditations.</p>
              </div>
              <div className="trainer-cred-list">
                {credentials.map(c => (
                  <div className="trainer-cred-item" key={c.title}>
                    <CheckCircle2 size={20} className="trainer-cred-check" />
                    <div>
                      <strong>{c.title}</strong>
                      <small>{c.org}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 9. High-Conversion CTA Card */}
          <section className="trainer-cta-section">
            <div className="trainer-cta-card">
              <div className="trainer-cta-inner">
                <span className="trainer-cta-kicker">Direct Mentorship Consultation</span>
                <h2>Start Your Speech Transformation Today.</h2>
                <p>
                  Book a free 1-on-1 speech diagnostic session directly with Shivam. Discuss your personal goals, receive immediate feedback, and map out your path to effortless fluency.
                </p>
                <div className="trainer-cta-actions">
                  <button className="primary-button" onClick={showDemo}>
                    Book Free 1-on-1 Consultation
                    <MoveRight size={16} />
                  </button>
                  <Link to="/about" className="secondary-button">
                    Learn About VERBORA
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function StoriesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'spoken-english' | 'business-english' | 'interview-prep' | 'public-speaking'>('all')
  const [videoStory, setVideoStory] = useState<StoryItem | null>(null)

  const showDemo = () => setModalOpen(true)

  // Dynamic Testimonials from TanStack Query (in-memory cached, 0 localStorage)
  const { data: dbTestimonials = [] } = useTestimonialsQuery()

  const detailedStories = useMemo(() => {
    const activeDb = dbTestimonials.filter(t => t.is_active)
    if (activeDb.length > 0) {
      return activeDb.map((t, idx) => {
        // Derive category from role or badge
        const rLower = (t.role + ' ' + (t.badge || '')).toLowerCase()
        let category: 'spoken-english' | 'business-english' | 'interview-prep' | 'public-speaking' = 'spoken-english'
        if (rLower.includes('business') || rLower.includes('corporate') || rLower.includes('lead')) category = 'business-english'
        else if (rLower.includes('interview') || rLower.includes('job') || rLower.includes('consultant')) category = 'interview-prep'
        else if (rLower.includes('public') || rLower.includes('speaking') || rLower.includes('stage')) category = 'public-speaking'

        return {
          id: t.id || `story-${idx}`,
          name: t.name,
          role: t.role,
          company: 'VERBORA Alumni',
          category,
          badge: t.badge || 'Verified Breakthrough',
          is_spotlight: !!t.is_spotlight,
          image: t.image,
          video: t.video || undefined,
          challenge: 'Struggled with hesitation and lack of confidence in high-stakes conversations.',
          breakthrough: 'Achieved rapid fluency, polished tone, and clear articulation through personal mentorship.',
          quote: t.text,
          metric: '100% Verified Impact',
          metricLabel: 'Career & Speech Growth',
        }
      })
    }

    return [
      {
        id: 'rohit-verma',
        name: 'Rohit Verma',
        role: 'Senior Software Engineer',
        company: 'TechCorp Global',
        category: 'spoken-english' as const,
        badge: 'Fluency Breakthrough',
        image: '/assets/testimonials/rohit.jpg',
        video: undefined as string | undefined,
        challenge: 'Translating Hindi sentences to English in mind, freezing up on US client sprint calls, and avoiding spontaneous discussions.',
        breakthrough: 'Overcame the translation loop within 3 weeks using Thought-Pacing Drills. Now leads daily standups and sprint planning effortlessly.',
        quote: 'VERBORA didn’t just teach me grammar; it transformed how my brain processes English. In 4 weeks, my client anxiety was completely gone.',
        metric: '90% Less Hesitation',
        metricLabel: 'Sprint Lead & Presenter',
      },
      {
        id: 'sneha-gupta',
        name: 'Sneha Gupta',
        role: 'Product Marketing Manager',
        company: 'Apex Media Group',
        category: 'business-english' as const,
        badge: 'Executive Presence',
        image: '/assets/testimonials/sneha.jpg',
        video: undefined as string | undefined,
        challenge: 'Hesitated to speak in high-stakes executive meetings and held back strategic ideas due to lack of corporate vocal polish.',
        breakthrough: 'Mastered executive tonality, strategic pauses, and persuasive meeting vocabulary. Promoted to Regional Lead within 3 months.',
        quote: 'Bijay Sir taught me how to command the room with composure. I learned that pausing with poise is a mark of confidence, not hesitation.',
        metric: 'Promoted to Regional Lead',
        metricLabel: 'Boardroom Diplomacy',
      },
      {
        id: 'aman-singh',
        name: 'Aman Singh',
        role: 'Associate Consultant',
        company: 'Deloitte',
        category: 'interview-prep' as const,
        badge: 'Deloitte Offer',
        image: '/assets/testimonials/aman.jpg',
        video: undefined as string | undefined,
        challenge: 'Faced 3 painful campus interview rejections due to rambling answers, stuttering under pressure, and nervous posture.',
        breakthrough: 'Learned the STAR storytelling framework, calm eye contact, and situational question drills. Cleared Deloitte on first attempt.',
        quote: 'The simulated mock interviews were so realistic that on the actual interview day, I felt completely relaxed and in full control.',
        metric: 'Deloitte Offer Letter',
        metricLabel: 'Top Tier Placement',
      },
      {
        id: 'priya-sharma',
        name: 'Priya Sharma',
        role: 'Engineering Team Lead',
        company: 'FinTech Solutions',
        category: 'public-speaking' as const,
        badge: 'Keynote Speaker',
        image: '/assets/testimonials/priya.jpg',
        video: undefined as string | undefined,
        challenge: 'Trembling voice, fast heartbeat, and severe stage fright when speaking in front of more than 5 colleagues.',
        breakthrough: 'Mastered diaphragmatic breathing, purposeful stage movement, and vocal projection. Delivered a 300+ attendee tech keynote.',
        quote: 'Conquering stage fright was something I thought was impossible for me. The patient coaching at VERBORA gave me my authentic voice.',
        metric: '300+ Attendee Keynote',
        metricLabel: 'Zero Stage Fright',
      },
    ]
  }, [dbTestimonials])

  const stats = [
    { number: '12,000+', label: 'Careers Transformed', sub: 'Across tech, finance & leadership' },
    { number: '96%', label: 'Measurable Breakthrough', sub: 'Verified across pre/post diagnostic drills' },
    { number: '4.9 ★', label: 'Average Alumni Rating', sub: 'Across 1,500+ verified Google & platform reviews' },
    { number: '15+', label: 'Countries Represented', sub: 'Global learners speaking with impact' },
  ]

  const categories = [
    { key: 'all' as const, label: 'All Stories', count: detailedStories.length },
    { key: 'spoken-english' as const, label: 'Spoken English & Fluency', count: detailedStories.filter(s => s.category === 'spoken-english').length },
    { key: 'business-english' as const, label: 'Business & Career', count: detailedStories.filter(s => s.category === 'business-english').length },
    { key: 'interview-prep' as const, label: 'Interview Success', count: detailedStories.filter(s => s.category === 'interview-prep').length },
    { key: 'public-speaking' as const, label: 'Public Speaking', count: detailedStories.filter(s => s.category === 'public-speaking').length },
  ]

  const filtered = activeTab === 'all'
    ? detailedStories
    : detailedStories.filter(s => s.category === activeTab)

  const spotlight = detailedStories.find(s => (s as any).is_spotlight) || detailedStories[0]

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main className="stories-page">
        {/* 1. Hero Section */}
        <section className="stories-hero">
          <div className="content-shell">
            <div className="stories-hero-inner">
              <span className="section-kicker">Student Transformations</span>
              <h1>Real Journeys. <span>Unstoppable Confidence.</span></h1>
              <p className="stories-hero-lead">
                From freezing on client calls to leading global tech standups, cracking dream MNC interviews, and delivering 300+ attendee conference keynotes. See how VERBORA transformed their communication.
              </p>
              <div className="stories-hero-actions">
                <button className="primary-button" onClick={showDemo}>
                  Start Your Journey
                  <MoveRight size={16} />
                </button>
                <Link to="/trainer" className="secondary-button">
                  Meet the Master Coach
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Key Stats Strip */}
        <section className="stories-stats-strip">
          <div className="content-shell">
            <div className="stories-stats-grid">
              {stats.map(s => (
                <div className="stories-stat-card" key={s.label}>
                  <strong>{s.number}</strong>
                  <span>{s.label}</span>
                  <small>{s.sub}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="content-shell">
          {/* 3. Featured Spotlight Story Card */}
          <section className="stories-spotlight-section">
            <div className="stories-spotlight-card">
              <div className="spotlight-media-wrap" onClick={() => spotlight.video && setVideoStory({ ...spotlight, text: spotlight.quote, video: spotlight.video })}>
                <img src={spotlight.image} alt={spotlight.name} className="spotlight-img" />
                {spotlight.video && (
                  <div className="spotlight-play-overlay">
                    <span className="spotlight-play-btn">
                      <CirclePlay size={36} fill="#ffffff" color="#0284c7" />
                    </span>
                    <span className="spotlight-play-label">Watch Transformation Video</span>
                  </div>
                )}
                <span className="spotlight-badge">★ Spotlight Case Study</span>
              </div>
              <div className="spotlight-content">
                <div className="spotlight-header">
                  <span className="spotlight-tag">{spotlight.badge}</span>
                  <div className="spotlight-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={15} className="star-gold" />
                    ))}
                  </div>
                </div>
                <h2>{spotlight.name}</h2>
                <p className="spotlight-role">{spotlight.role} · <strong>{spotlight.company}</strong></p>
                <blockquote className="spotlight-quote">
                  <Quote size={20} className="spotlight-quote-icon" />
                  <span>“{spotlight.quote}”</span>
                </blockquote>
                <div className="spotlight-before-after">
                  <div className="spotlight-ba-item ba-challenge">
                    <strong>Before VERBORA:</strong>
                    <p>{spotlight.challenge}</p>
                  </div>
                  <div className="spotlight-ba-item ba-breakthrough">
                    <strong>The Breakthrough:</strong>
                    <p>{spotlight.breakthrough}</p>
                  </div>
                </div>
                <div className="spotlight-footer">
                  <div className="spotlight-metric">
                    <strong>{spotlight.metric}</strong>
                    <small>{spotlight.metricLabel}</small>
                  </div>
                  {spotlight.video && (
                    <button className="primary-button spotlight-video-btn" onClick={() => setVideoStory({ ...spotlight, text: spotlight.quote, video: spotlight.video })}>
                      <CirclePlay size={17} />
                      <span>Watch Story</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Filter Tabs */}
          <section className="stories-filter-section">
            <div className="about-section-header">
              <span className="section-kicker">Explore by Goal</span>
              <h2>Browse Stories by <span>Program Focus</span></h2>
              <p>Filter alumni experiences based on your own communication hurdles and aspirations.</p>
            </div>
            <div className="stories-filter-tabs">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  className={`stories-filter-btn ${activeTab === cat.key ? 'filter-active' : ''}`}
                  onClick={() => setActiveTab(cat.key)}
                >
                  <span>{cat.label}</span>
                  <span className="filter-count">{cat.count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 5. Main Stories Grid */}
          <section className="stories-grid-section">
            <div className="stories-main-grid">
              {filtered.map(story => (
                <div className="story-journey-card" key={story.id}>
                  <div className="story-card-top">
                    <div className="story-card-media" onClick={() => story.video && setVideoStory({ ...story, text: story.quote, video: story.video })}>
                      <img src={story.image} alt={story.name} className="story-card-img" />
                      {story.video && (
                        <button className="story-card-play" aria-label={`Play video of ${story.name}`}>
                          <CirclePlay size={24} fill="#ffffff" color="#0284c7" />
                        </button>
                      )}
                      <span className="story-card-badge">{story.badge}</span>
                    </div>
                    <div className="story-card-meta">
                      <div className="story-card-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className="star-gold" />
                        ))}
                      </div>
                      <h3>{story.name}</h3>
                      <p className="story-card-role">{story.role}</p>
                      <span className="story-card-company">{story.company}</span>
                    </div>
                  </div>

                  <p className="story-card-quote">“{story.quote}”</p>

                  <div className="story-card-breakdown">
                    <div className="story-bd-row">
                      <span className="bd-label challenge-label">Challenge</span>
                      <p>{story.challenge}</p>
                    </div>
                    <div className="story-bd-row">
                      <span className="bd-label result-label">Result</span>
                      <p>{story.breakthrough}</p>
                    </div>
                  </div>

                  <div className="story-card-bottom">
                    <div className="story-card-stat">
                      <strong>{story.metric}</strong>
                      <small>{story.metricLabel}</small>
                    </div>
                    {story.video && (
                      <button className="story-watch-link" onClick={() => setVideoStory({ ...story, text: story.quote, video: story.video })}>
                        <CirclePlay size={16} />
                        <span>Watch Video</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Measurable Impact Matrix */}
          <section className="stories-impact-section">
            <div className="stories-impact-card">
              <div className="stories-impact-header">
                <span className="section-kicker">Tangible Results</span>
                <h2>The Measurable <span>VERBORA Impact</span></h2>
                <p>Real outcome metrics measured across 12,000+ graduates after 30 days of active speech coaching.</p>
              </div>
              <div className="stories-impact-grid">
                <div className="impact-box">
                  <div className="impact-number">85%</div>
                  <strong>Reduction in Hesitation & Pauses</strong>
                  <p>Learners stop translating words in their heads and start thinking directly in English.</p>
                </div>
                <div className="impact-box">
                  <div className="impact-number">3.2x</div>
                  <strong>Increase in Meeting Participation</strong>
                  <p>Graduates actively contribute ideas in leadership meetings instead of staying quiet.</p>
                </div>
                <div className="impact-box">
                  <div className="impact-number">72%</div>
                  <strong>Promoted or Hired within 6 Months</strong>
                  <p>Alumni report career switches, top-bracket salary jumps, and leadership promotions.</p>
                </div>
                <div className="impact-box">
                  <div className="impact-number">100%</div>
                  <strong>Personalized 1-on-1 Feedback</strong>
                  <p>Every single learner receives direct audio critiques and diagnostic speech tune-ups.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Bottom CTA Card */}
          <section className="stories-cta-section">
            <div className="stories-cta-card">
              <div className="stories-cta-inner">
                <span className="stories-cta-kicker">Your Speech Journey Starts Here</span>
                <h2>Ready to Write Your Own Success Story?</h2>
                <p>
                  Join 12,000+ confident communicators. Book a free 1-on-1 speech consultation and discover how fast your communication can transform.
                </p>
                <div className="stories-cta-actions">
                  <button className="primary-button" onClick={showDemo}>
                    Book Free 1-on-1 Consultation
                    <MoveRight size={16} />
                  </button>
                  <Link to="/courses/$courseSlug" params={{ courseSlug: 'spoken-english' }} className="secondary-button">
                    Explore Spoken English Program
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <StoryVideoModal story={videoStory} onClose={() => setVideoStory(null)} />
    </>
  )
}

function ContactPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [showEnergyModal, setShowEnergyModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    course: 'spoken-english',
    goal: 'hesitation',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  const showDemo = () => setModalOpen(true)

  const [lastWaUrl, setLastWaUrl] = useState('')

  const courseTitles: Record<string, string> = {
    'spoken-english': 'Spoken English & Fluency',
    'business-english': 'Business & Workplace English',
    'public-speaking': 'Public Speaking & Stage Presence',
    'interview-prep': 'Interview Preparation & Mock Drills',
    'personality-development': 'Personality Transformation',
    '1-on-1-mentorship': '1-on-1 Master Mentorship',
  }

  const goalTitles: Record<string, string> = {
    'hesitation': 'Hesitation & Overthinking',
    'translation': 'Translating in mind before speaking',
    'interview': 'Upcoming Job Interview',
    'client-meetings': 'Client Calls & Team Meetings',
    'stage-fear': 'Public Speaking & Stage Fear',
    'accent': 'Pronunciation & Accent Clarity',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const selectedCourseTitle = courseTitles[form.course] || form.course
    const selectedGoalTitle = goalTitles[form.goal] || form.goal

    // 1. Format professional WhatsApp diagnostic message
    const messageLines = [
      `*New 1-on-1 Diagnostic Call Enquiry — VERBORA*`,
      ``,
      `👤 *Name:* ${form.name.trim()}`,
      `📞 *Phone:* ${form.phone.trim()}`,
      `✉️ *Email:* ${form.email.trim()}`,
      `📚 *Program:* ${selectedCourseTitle}`,
      `🎯 *Speaking Hurdle:* ${selectedGoalTitle}`,
      form.message.trim() ? `💬 *Goal Details:* ${form.message.trim()}` : null,
      ``,
      `Hi Bijay Adhikari & Verbora team, I would like to book my Free 1-on-1 Diagnostic Call. Please confirm my slot!`,
    ].filter(Boolean).join('\n')

    const cleanNumber = WHATSAPP_PHONE_NUMBER.replace(/\D/g, '')
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageLines)}`
    setLastWaUrl(waUrl)

    // 2. Save simultaneously to Supabase (demo_bookings AND contact_messages)
    try {
      await Promise.all([
        api.bookings.createDemoBooking({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          course: selectedCourseTitle,
          source: 'direct-enquiry-diagnostic-form',
          notes: `Hurdle: ${selectedGoalTitle}${form.message.trim() ? ` | Details: ${form.message.trim()}` : ''}`,
          status: 'new',
        }),
        api.contact.submitContactMessage({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          course: selectedCourseTitle,
          goal: selectedGoalTitle,
          message: form.message.trim() || 'Direct Enquiry: Book a Free 1-on-1 Diagnostic Call',
          status: 'unread',
        }),
      ])
    } catch (err) {
      console.error('Failed to save diagnostic enquiry to Supabase:', err)
    } finally {
      setLoading(false)
      setSubmitted(true)
      setShowEnergyModal(true)
    }
  }

  const faqs = [
    {
      q: 'How soon can I start my sessions after contacting?',
      a: 'Our small-cohort batches start every single Monday. If you opt for 1-on-1 executive mentorship with Bijay Adhikari, your sessions can begin within 48 hours following your initial speech diagnostic evaluation.',
    },
    {
      q: 'Are sessions conducted online or offline?',
      a: 'We conduct live interactive video coaching sessions globally via Zoom and Google Meet, featuring breakout conversation rooms, instant screen sharing, and real-time audio critique. Offline immersion workshops are hosted periodically at our New Delhi and Gurugram hubs.',
    },
    {
      q: 'What actually happens in the Free Diagnostic Call?',
      a: 'You connect 1-on-1 with a senior speech coach who evaluates your speaking pace, hesitation triggers, mother-tongue influence, and vocabulary flow. You receive an immediate verbal score and a personalized 30-day transformation roadmap with zero obligation.',
    },
    {
      q: 'Are weekend cohorts available for working professionals?',
      a: 'Yes! Over 60% of our learners are working software engineers, consultants, and team leads. We offer specialized Saturday & Sunday morning and evening cohorts tailored to professional schedules.',
    },
    {
      q: 'What is the batch size in cohort sessions?',
      a: 'To guarantee high speaking time for every participant, our cohort batches are strictly capped at 8 to 10 students. You spend 80% of session time actively speaking rather than listening to lectures.',
    },
  ]

  const channels = [
    {
      icon: MessageCircle,
      title: 'WhatsApp Admissions Desk',
      sub: 'Fastest response · Average 15 mins',
      value: '+91 98765 43210',
      actionText: 'Chat on WhatsApp',
      actionHref: 'https://wa.me/919876543210?text=Hi%20VERBORA%2C%20I%20want%20to%20know%20more%20about%20your%20spoken%20English%20courses',
      badge: 'Recommended',
    },
    {
      icon: Phone,
      title: 'Direct Helpline',
      sub: 'Mon – Sat: 9:00 AM – 8:00 PM IST',
      value: '+91 98765 43210',
      actionText: 'Call Now',
      actionHref: 'tel:+919876543210',
    },
    {
      icon: Mail,
      title: 'Email Inquiries',
      sub: 'Admissions, partnerships & corporates',
      value: 'hello@verbora.com',
      actionText: 'Send Email',
      actionHref: 'mailto:hello@verbora.com',
    },
    {
      icon: MapPin,
      title: 'Headquarters & Studio',
      sub: 'Live Coaching & Content Studio',
      value: 'Connaught Place & Cyber City, New Delhi / Gurugram, India',
      actionText: 'Global Online Classes',
      actionHref: '#',
    },
  ]

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main className="contact-page">
        {/* 1. Hero Section */}
        <section className="contact-hero">
          <div className="content-shell">
            <div className="contact-hero-inner">
              <span className="section-kicker">Get In Touch</span>
              <h1>Let’s Talk About Your <span>Speech Journey.</span></h1>
              <p className="contact-hero-lead">
                Have questions about our course batches, fees, or 1-on-1 mentorship with Bijay Adhikari? Connect directly with our counselor and speech coaching desk.
              </p>
              <div className="contact-hero-chips">
                <span><Clock size={15} /> Response within 2 hours</span>
                <span><MessageCircle size={15} /> WhatsApp Support Available</span>
                <span><Sparkles size={15} /> 100% Free Speech Diagnostic Call</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Main Two-Column Contact Section */}
        <section className="contact-main-section">
          <div className="content-shell">
            <div className="contact-main-grid">
              {/* Left Column: Direct Communication Channels */}
              <div className="contact-info-column">
                <div className="contact-info-header">
                  <span className="section-kicker">Reach Us Instantly</span>
                  <h2>Connect With Our <span>Admissions Desk</span></h2>
                  <p>Choose the communication channel that works best for you. Our team is available 6 days a week.</p>
                </div>

                <div className="contact-channels-list">
                  {channels.map(c => (
                    <div className="contact-channel-card" key={c.title}>
                      <div className="channel-icon-wrap">
                        <c.icon size={22} />
                      </div>
                      <div className="channel-content">
                        <div className="channel-title-row">
                          <strong>{c.title}</strong>
                          {c.badge && <span className="channel-badge">{c.badge}</span>}
                        </div>
                        <span className="channel-value">{c.value}</span>
                        <small className="channel-sub">{c.sub}</small>
                        {c.actionHref !== '#' ? (
                          <a href={c.actionHref} target={c.actionHref.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="channel-action-link">
                            <span>{c.actionText}</span>
                            <MoveRight size={14} />
                          </a>
                        ) : (
                          <span className="channel-action-static">{c.actionText}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Batch Schedules Box */}
                <div className="contact-schedule-box">
                  <div className="schedule-box-header">
                    <Clock size={18} />
                    <strong>Upcoming Batch Timings</strong>
                  </div>
                  <div className="schedule-pills">
                    <div className="schedule-pill">
                      <span>Morning Batches</span>
                      <strong>7:30 AM – 9:00 AM IST</strong>
                    </div>
                    <div className="schedule-pill">
                      <span>Evening Batches</span>
                      <strong>7:00 PM – 8:30 PM IST</strong>
                    </div>
                    <div className="schedule-pill">
                      <span>Night Executive</span>
                      <strong>8:30 PM – 10:00 PM IST</strong>
                    </div>
                    <div className="schedule-pill">
                      <span>Weekend Cohorts</span>
                      <strong>Saturdays & Sundays</strong>
                    </div>
                  </div>
                  <small className="schedule-note">★ New cohorts begin every Monday · 1-on-1 sessions scheduled per your personal availability.</small>
                </div>
              </div>

              {/* Right Column: Comprehensive Contact & Diagnostic Booking Form */}
              <div className="contact-form-column">
                <div className="contact-form-card">
                  <div className="form-card-header">
                    <span className="form-card-badge">Direct Enquiry</span>
                    <h2>Book a Free 1-on-1 Diagnostic Call</h2>
                    <p>Fill out the form below. Our trainer desk will review your details and reach out on WhatsApp within 2 hours.</p>
                  </div>

                  {submitted ? (
                    <div className="contact-success-state">
                      <div className="success-icon-wrap">
                        <CheckCircle2 size={44} />
                      </div>
                      <h3>Diagnostic Request Saved & Sent!</h3>
                      <p>
                        Thank you for reaching out, <strong>{form.name}</strong>. Your diagnostic enquiry has been recorded in our database. If WhatsApp did not open automatically, click below to connect with our trainer desk:
                      </p>
                      <div className="success-action-row" style={{ flexDirection: 'column', gap: '10px' }}>
                        {lastWaUrl && (
                          <a
                            href={lastWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="primary-button"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                          >
                            <MessageCircle size={18} />
                            <span>Continue to WhatsApp Chat</span>
                            <MoveRight size={16} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            setSubmitted(false)
                            setForm({
                              name: '',
                              email: '',
                              phone: '',
                              course: 'spoken-english',
                              goal: 'hesitation',
                              message: '',
                            })
                          }}
                        >
                          Send Another Enquiry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="contact-actual-form" onSubmit={handleSubmit}>
                      <div className="contact-form-row">
                        <div className="contact-field">
                          <label htmlFor="c-name">Full Name *</label>
                          <input
                            id="c-name"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                          />
                        </div>
                        <div className="contact-field">
                          <label htmlFor="c-phone">WhatsApp Phone Number *</label>
                          <input
                            id="c-phone"
                            required
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="contact-field">
                        <label htmlFor="c-email">Email Address *</label>
                        <input
                          id="c-email"
                          required
                          type="email"
                          placeholder="you@company.com"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                      </div>

                      <div className="contact-form-row">
                        <div className="contact-field">
                          <label htmlFor="c-course">Program of Interest</label>
                          <select
                            id="c-course"
                            value={form.course}
                            onChange={e => setForm({ ...form, course: e.target.value })}
                          >
                            <option value="spoken-english">Spoken English & Fluency</option>
                            <option value="business-english">Business & Workplace English</option>
                            <option value="public-speaking">Public Speaking & Stage Presence</option>
                            <option value="interview-prep">Interview Preparation & Mock Drills</option>
                            <option value="personality-development">Personality Transformation</option>
                            <option value="1-on-1-mentorship">1-on-1 Master Mentorship</option>
                          </select>
                        </div>
                        <div className="contact-field">
                          <label htmlFor="c-goal">Biggest Speaking Hurdle</label>
                          <select
                            id="c-goal"
                            value={form.goal}
                            onChange={e => setForm({ ...form, goal: e.target.value })}
                          >
                            <option value="hesitation">Hesitation & Overthinking</option>
                            <option value="translation">Translating in mind before speaking</option>
                            <option value="interview">Upcoming Job Interview</option>
                            <option value="client-meetings">Client Calls & Team Meetings</option>
                            <option value="stage-fear">Public Speaking & Stage Fear</option>
                            <option value="accent">Pronunciation & Accent Clarity</option>
                          </select>
                        </div>
                      </div>

                      <div className="contact-field">
                        <label htmlFor="c-msg">Tell us about your goal (Optional)</label>
                        <textarea
                          id="c-msg"
                          rows={3}
                          placeholder="e.g. I have a US client demo next month and want to speak with confidence and zero filler words..."
                          value={form.message}
                          onChange={e => setForm({ ...form, message: e.target.value })}
                        />
                      </div>

                      <button type="submit" className="primary-button contact-submit-btn" disabled={loading}>
                        {loading ? (
                          <span>Submitting Request...</span>
                        ) : (
                          <>
                            <span>Send Enquiry & Book Diagnostic Call</span>
                            <Send size={16} />
                          </>
                        )}
                      </button>

                      <p className="contact-form-privacy">
                        🔒 Your phone and email are 100% confidential. No spam, ever.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Frequently Asked Questions Section */}
        <section className="contact-faq-section">
          <div className="content-shell">
            <div className="stories-section-header">
              <span className="section-kicker">Got Questions?</span>
              <h2>Frequently Asked <span>Questions</span></h2>
              <p>Everything you need to know about batch enrolments, diagnostics, and session formats.</p>
            </div>

            <div className="contact-faq-list">
              {faqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className={`contact-faq-item ${activeFaq === i ? 'faq-expanded' : ''}`}
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                >
                  <div className="faq-question-row">
                    <strong>{faq.q}</strong>
                    <span className="faq-toggle-icon">
                      <ChevronDown size={18} />
                    </span>
                  </div>
                  {activeFaq === i && (
                    <div className="faq-answer-wrap">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Meet The Trainer Reassurance Card */}
        <section className="contact-trainer-card-section">
          <div className="content-shell">
            <div className="contact-trainer-banner">
              <div className="trainer-banner-copy">
                <span className="banner-kicker">Direct Leadership Access</span>
                <h2>Prefer To Meet The Master Coach First?</h2>
                <p>
                  Explore Bijay Adhikari’s 10+ years of executive coaching experience, the 4-pillar speech methodology, verified student reviews, and global alumni achievements.
                </p>
                <div className="trainer-banner-actions">
                  <Link to="/trainer" className="primary-button">
                    <span>Explore Trainer Profile</span>
                    <MoveRight size={16} />
                  </Link>
                  <Link to="/stories" className="secondary-button">
                    Read Success Stories
                  </Link>
                </div>
              </div>
              <div className="trainer-banner-img-wrap">
                <img
                  src="/assets/trainer-profile.jpg"
                  alt="Bijay Adhikari"
                  className="trainer-banner-img"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Clean Light Confirmation Modal (Centered Tick, Concise, No Trainer Name, No Pills) */}
      {showEnergyModal && (
        <div className="confirmation-modal-overlay" role="dialog" aria-modal="true" aria-label="Enquiry Sent">
          <div className="confirmation-modal-card">
            <button
              type="button"
              className="confirmation-modal-close"
              onClick={() => {
                setShowEnergyModal(false)
                setSubmitted(false)
                setForm({
                  name: '',
                  email: '',
                  phone: '',
                  course: 'spoken-english',
                  goal: 'hesitation',
                  message: '',
                })
              }}
              aria-label="Close modal"
              title="Close"
            >
              <X size={17} />
            </button>

            <div className="confirmation-tick-wrap">
              <Check size={36} strokeWidth={2.8} />
            </div>

            <h2 className="confirmation-title">Enquiry Sent!</h2>
            <p className="confirmation-desc">
              Your request for a free 1-on-1 diagnostic call has been recorded. Our team will reach out to you on WhatsApp shortly.
            </p>

            <button
              type="button"
              className="primary-button confirmation-done-btn"
              onClick={() => {
                setShowEnergyModal(false)
                setSubmitted(false)
                setForm({
                  name: '',
                  email: '',
                  phone: '',
                  course: 'spoken-english',
                  goal: 'hesitation',
                  message: '',
                })
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function CourseDetail() {
  const { courseSlug } = courseRoute.useParams()
  const course = courses.find(entry => entry.id === courseSlug)
  const [modalOpen, setModalOpen] = useState(false)
  if (!course) return <><SiteHeader onDemo={() => setModalOpen(true)} /><main className="not-found"><h1>Course not found</h1><p>We couldn't find that program.</p><Link to="/" className="primary-button">Back to Home</Link></main><SiteFooter onDemo={() => setModalOpen(true)} /><DemoModal open={modalOpen} onClose={() => setModalOpen(false)} /></>
  return <><SiteHeader onDemo={() => setModalOpen(true)} /><main className="course-detail-page"><div className="course-detail-banner"><div className="detail-crumb"><Link to="/">Home</Link><span>/</span><a href="/#courses">Courses</a><span>/</span><strong>{course.title}</strong></div><span className={`course-icon ${course.iconClass}`}><course.icon size={38} /></span><h1>{course.title}</h1><p>{course.tagline}</p><button className="primary-button" onClick={() => setModalOpen(true)}>Book a Free Demo</button></div><div className="course-detail-body"><div><span className="section-kicker">The Program</span><h2>Find your voice. <span>Grow your confidence.</span></h2><p>{course.summary}</p><p>Sessions are designed around communication practice and practical feedback. Contact VERBORA to confirm the batch schedule, course format, fees, and trainer details.</p></div><div className="topic-card"><h3>What you'll work on</h3>{course.topics.map(topic => <div key={topic}><Check size={18} /><span>{topic}</span></div>)}</div></div><div className="detail-other"><h2>Explore more programs</h2><div className="course-grid">{courses.filter(entry => entry.id !== course.id).map(entry => <Link key={entry.id} to="/courses/$courseSlug" params={{ courseSlug: entry.id }} className="course-card"><img src={entry.cover} alt={entry.title} className="course-card-img" /><div className="course-card-overlay"><span className="course-card-icon-wrap"><entry.icon size={19} strokeWidth={2.4} /></span><strong className="course-card-heading">{entry.title}</strong><span className="course-card-subheading">{entry.short}</span></div></Link>)}</div></div></main><SiteFooter onDemo={() => setModalOpen(true)} /><DemoModal open={modalOpen} onClose={() => setModalOpen(false)} defaultCourse={course.id} /></>
}

function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2C8.268 2 2 8.268 2 16c0 2.66.744 5.15 2.036 7.28L2.5 29.5l6.45-1.504A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm8.125 19.98c-.344.97-1.71 1.774-2.775 2.007-.73.16-1.684.288-4.89-1.04-4.095-1.696-6.727-5.856-6.932-6.13-.205-.273-1.66-2.21-1.66-4.214 0-2.003 1.045-2.99 1.417-3.398.373-.409.816-.512 1.088-.512.272 0 .545.003.784.015.25.012.585-.095.914.697.344.82 1.173 2.865 1.275 3.072.103.207.172.45.034.723-.138.273-.207.443-.41.681-.205.239-.43.535-.615.718-.204.204-.417.426-.18.834.238.408 1.056 1.745 2.268 2.825 1.558 1.388 2.872 1.818 3.28 2.023.408.204.647.17.886-.103.238-.272 1.02-1.192 1.293-1.6.272-.409.544-.341.918-.204.375.136 2.378 1.123 2.787 1.328.408.204.68.307.782.477.103.17.103.987-.24 1.956z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

function WhatsAppFloatingButton() {
  return (
    <aside className="whatsapp-floating-wrap" aria-label="WhatsApp quick chat">
      <a
        href="https://wa.me/919876543210?text=Hi%20VERBORA%2C%20I%20want%20to%20know%20more%20about%20your%20spoken%20English%20courses%20and%20book%20a%20free%20demo."
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating-btn"
        aria-label="Chat with VERBORA Admissions on WhatsApp"
      >
        <span className="whatsapp-pulse-ring" aria-hidden="true" />
        <WhatsAppIcon size={28} />
        <span className="whatsapp-floating-label">
          <strong>Chat on WhatsApp</strong>
          <small>● Online · Instant Reply</small>
        </span>
      </a>
    </aside>
  )
}

const ADMIN_PASSKEY = 'verbora-relay-2026'
const ADMIN_STORAGE_KEY = 'verbora_shivam_admin_auth'

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function VerboraEduAdminPage({ defaultRoute }: { defaultRoute?: 'leads' | 'testimonials' | 'testimonials-add' }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const editIdMatch = pathname.match(/\/testimonials\/edit\/([^/?#]+)/)
  const editId = editIdMatch ? editIdMatch[1] : undefined
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) === ADMIN_PASSKEY
    } catch {
      return false
    }
  })
  const [passkeyInput, setPasskeyInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Determine active section and view mode from URL or props
  const isTestimonialsAddRoute = pathname.includes('/testimonials/add') || defaultRoute === 'testimonials-add'
  const isTestimonialsEditRoute = (pathname.includes('/testimonials/edit/') || (pathname.includes('/testimonials') && !!editId))
  const isTestimonialsFormRoute = isTestimonialsAddRoute || isTestimonialsEditRoute

  const isTestimonialsRoute = isTestimonialsFormRoute || pathname.includes('/testimonials') || defaultRoute === 'testimonials'
  const activeSection: 'leads' | 'testimonials' = isTestimonialsRoute ? 'testimonials' : 'leads'

  // Determine base admin path (/verbora-edu-admin, /shivam-admin, /admin)
  const baseAdminPath = pathname.startsWith('/shivam-admin')
    ? '/shivam-admin'
    : pathname.startsWith('/admin')
      ? '/admin'
      : '/verbora-edu-admin'

  const leadsRoutePath = `${baseAdminPath}/leads`
  const testimonialsRoutePath = `${baseAdminPath}/testimonials`
  const addTestimonialRoutePath = `${baseAdminPath}/testimonials/add`

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Data states
  const [bookings, setBookings] = useState<DemoBooking[]>([])
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Testimonials filter & form state
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [testimonialForm, setTestimonialForm] = useState<{
    name: string
    role: string
    image: string
    video: string
    video_size_bytes?: number
    image_size_bytes?: number
    text: string
    badge: string
    is_active: boolean
    is_spotlight: boolean
  }>({
    name: '',
    role: '',
    image: '/assets/testimonials/sample-avatar.jpg',
    video: '',
    video_size_bytes: 0,
    image_size_bytes: 0,
    text: '',
    badge: '',
    is_active: true,
    is_spotlight: false,
  })

  // Cloudinary upload state
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [activeUploadTask, setActiveUploadTask] = useState<VideoUploadTask | null>(null)
  const [showVideoCompletedModal, setShowVideoCompletedModal] = useState<VideoUploadTask | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null)
  const [uploadSuccessUrl, setUploadSuccessUrl] = useState<string | null>(null)
  const [videoSuccessUrl, setVideoSuccessUrl] = useState<string | null>(null)
  const [customPreset, setCustomPreset] = useState<string>(() => getSavedUploadPreset())
  const [showCloudinarySettings, setShowCloudinarySettings] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showSpotlightModal, setShowSpotlightModal] = useState(false)
  const [selectedSpotlightId, setSelectedSpotlightId] = useState<string>('')

  // Subscribe to background video upload across route changes
  useEffect(() => {
    const unsub = subscribeToVideoUpload(task => {
      setActiveUploadTask(task)
      if (task?.status === 'uploading') {
        setUploadingVideo(true)
      } else {
        setUploadingVideo(false)
        if (task?.status === 'completed' && task.resultUrl) {
          setTestimonialForm(prev => ({
            ...prev,
            video: task.resultUrl!,
            video_size_bytes: task.resultBytes || 0,
          }))
          setVideoSuccessUrl(task.resultUrl)
          setShowVideoCompletedModal(task)
        } else if (task?.status === 'error') {
          setVideoUploadError(task.error || 'Video upload failed')
        }
      }
    })
    return unsub
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passkeyInput.trim() === ADMIN_PASSKEY) {
      try {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, ADMIN_PASSKEY)
      } catch {}
      setIsAuthenticated(true)
      setAuthError(null)
    } else {
      setAuthError('Invalid Access Key. Please provide the authorized admin passkey.')
    }
  }

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_STORAGE_KEY)
    } catch {}
    setIsAuthenticated(false)
    setPasskeyInput('')
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [bRes, cRes, tRes] = await Promise.all([
        api.bookings.getDemoBookings(),
        api.contact.getContactMessages(),
        api.testimonials.getTestimonials(),
      ])
      if (bRes.data) setBookings(bRes.data)
      if (cRes.data) setContacts(cRes.data)
      if (tRes.data) setTestimonials(tRes.data)
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Populate form if on edit route with editId or query param
  useEffect(() => {
    if (editId && testimonials.length > 0) {
      const found = testimonials.find(t => t.id === editId)
      if (found) {
        setEditingTestimonial(found)
        setTestimonialForm({
          name: found.name,
          role: found.role,
          image: found.image,
          video: found.video || '',
          video_size_bytes: found.video_size_bytes || 0,
          image_size_bytes: found.image_size_bytes || 0,
          text: found.text,
          badge: found.badge || '',
          is_active: found.is_active,
          is_spotlight: !!found.is_spotlight,
        })
      }
    } else if (isTestimonialsAddRoute) {
      setEditingTestimonial(null)
      setTestimonialForm({
        name: '',
        role: '',
        image: '/assets/testimonials/sample-avatar.jpg',
        video: '',
        video_size_bytes: 0,
        image_size_bytes: 0,
        text: '',
        badge: '',
        is_active: true,
        is_spotlight: false,
      })
    }
  }, [editId, isTestimonialsAddRoute, testimonials])

  // Testimonials Handlers
  const handleOpenAddTestimonial = () => {
    setEditingTestimonial(null)
    setTestimonialForm({
      name: '',
      role: '',
      image: '',
      video: '',
      video_size_bytes: 0,
      image_size_bytes: 0,
      text: '',
      badge: '',
      is_active: true,
      is_spotlight: false,
    })
    navigate({ to: addTestimonialRoutePath as any })
  }

  const handleOpenEditTestimonial = (item: Testimonial) => {
    setEditingTestimonial(item)
    setTestimonialForm({
      name: item.name,
      role: item.role,
      image: item.image,
      video: item.video || '',
      video_size_bytes: item.video_size_bytes || 0,
      image_size_bytes: item.image_size_bytes || 0,
      text: item.text,
      badge: item.badge || '',
      is_active: item.is_active,
      is_spotlight: !!item.is_spotlight,
    })
    navigate({ to: `${testimonialsRoutePath}/edit/${item.id}` as any })
  }

  const handleOpenSpotlightModal = () => {
    const currentSpotlight = testimonials.find(t => t.is_spotlight)
    setSelectedSpotlightId(currentSpotlight?.id || '')
    setShowSpotlightModal(true)
  }

  const handleSaveSpotlightSelection = async () => {
    setLoading(true)
    try {
      if (!selectedSpotlightId) {
        // If "None" selected, unset all spotlights
        setTestimonials(prev => prev.map(t => ({ ...t, is_spotlight: false })))
        const activeSpot = testimonials.find(t => t.is_spotlight)
        if (activeSpot) {
          await api.testimonials.updateTestimonial(activeSpot.id, { is_spotlight: false })
        }
        showToast('Spotlight removed from /stories.')
      } else {
        // Set selected testimonial as spotlight
        setTestimonials(prev => prev.map(t => ({ ...t, is_spotlight: t.id === selectedSpotlightId })))
        await api.testimonials.updateTestimonial(selectedSpotlightId, { is_spotlight: true })
        const target = testimonials.find(t => t.id === selectedSpotlightId)
        showToast(`"${target?.name || 'Selected student'}" set as Spotlight on /stories!`)
      }
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
      setShowSpotlightModal(false)
    } catch (err) {
      console.error('Failed to update spotlight:', err)
      alert('Failed to update spotlight.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTestimonialActive = async (id: string, current: boolean) => {
    const next = !current
    setUpdatingId(id)
    setTestimonials(prev => prev.map(t => (t.id === id ? { ...t, is_active: next } : t)))
    const res = await api.testimonials.updateTestimonial(id, { is_active: next })
    if (res.success) {
      showToast(`Testimonial is now ${next ? 'Published on Home' : 'Hidden from Website'}`)
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
    }
    setUpdatingId(null)
  }

  const handleDeleteTestimonial = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete testimonial by "${name}"?`)) return
    setUpdatingId(id)
    const target = testimonials.find(t => t.id === id)
    if (target?.video) {
      deleteMediaFromCloudinary(target.video, 'video').catch(() => {})
    }
    if (target?.image && target.image.includes('cloudinary.com')) {
      deleteMediaFromCloudinary(target.image, 'image').catch(() => {})
    }
    const res = await api.testimonials.deleteTestimonial(id)
    if (res.success) {
      setTestimonials(prev => prev.filter(t => t.id !== id))
      showToast(`Testimonial by "${name}" deleted.`)
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
    }
    setUpdatingId(null)
  }

  const handleRemoveVideoDirect = async (id: string) => {
    const target = testimonials.find(t => t.id === id)
    if (!target || !target.video) return
    if (!window.confirm(`Remove video story from "${target.name}"?`)) return

    setUpdatingId(id)
    const videoToDelete = target.video
    deleteMediaFromCloudinary(videoToDelete, 'video').catch(() => {})

    const res = await api.testimonials.updateTestimonial(id, {
      video: null,
      video_size_bytes: 0,
    })
    if (res.success) {
      setTestimonials(prev => prev.map(t => (t.id === id ? { ...t, video: null, video_size_bytes: 0 } : t)))
      showToast(`Video removed from "${target.name}"!`)
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
    }
    setUpdatingId(null)
  }

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testimonialForm.name.trim()) return alert('Please enter student name.')
    if (!testimonialForm.role.trim()) return alert('Please enter student role or course.')
    if (!testimonialForm.text.trim()) return alert('Please enter testimonial quote text.')
    if (!testimonialForm.image.trim()) return alert('Please upload an avatar image.')

    setLoading(true)
    try {
      if (editingTestimonial) {
        // If image was replaced on edit, ensure old Cloudinary image is deleted
        if (
          editingTestimonial.image &&
          editingTestimonial.image !== testimonialForm.image &&
          editingTestimonial.image.includes('cloudinary.com')
        ) {
          deleteMediaFromCloudinary(editingTestimonial.image, 'image').catch(() => {})
        }

        // If video was removed or replaced on edit, ensure old Cloudinary video is deleted
        if (
          editingTestimonial.video &&
          editingTestimonial.video !== testimonialForm.video &&
          editingTestimonial.video.includes('cloudinary.com')
        ) {
          deleteMediaFromCloudinary(editingTestimonial.video, 'video').catch(() => {})
        }

        const res = await api.testimonials.updateTestimonial(editingTestimonial.id, {
          name: testimonialForm.name.trim(),
          role: testimonialForm.role.trim(),
          image: testimonialForm.image.trim(),
          video: testimonialForm.video.trim() || null,
          video_size_bytes: testimonialForm.video_size_bytes ?? 0,
          image_size_bytes: testimonialForm.image_size_bytes ?? 0,
          text: testimonialForm.text.trim(),
          badge: testimonialForm.badge.trim() || null,
          is_active: testimonialForm.is_active,
          is_spotlight: testimonialForm.is_spotlight,
        })
        if (res.data) {
          if (testimonialForm.is_spotlight) {
            setTestimonials(prev => prev.map(t => (t.id === editingTestimonial.id ? res.data! : { ...t, is_spotlight: false })))
          } else {
            setTestimonials(prev => prev.map(t => (t.id === editingTestimonial.id ? res.data! : t)))
          }
          showToast(`Testimonial for "${res.data.name}" updated!`)
          queryClient.invalidateQueries({ queryKey: ['testimonials'] })
          setEditingTestimonial(null)
          navigate({ to: testimonialsRoutePath as any })
        }
      } else {
        const res = await api.testimonials.createTestimonial({
          name: testimonialForm.name.trim(),
          role: testimonialForm.role.trim(),
          image: testimonialForm.image.trim(),
          video: testimonialForm.video.trim() || null,
          video_size_bytes: testimonialForm.video_size_bytes ?? 0,
          image_size_bytes: testimonialForm.image_size_bytes ?? 0,
          text: testimonialForm.text.trim(),
          badge: testimonialForm.badge.trim() || null,
          is_active: testimonialForm.is_active,
          is_spotlight: testimonialForm.is_spotlight,
        })
        if (res.data) {
          if (testimonialForm.is_spotlight) {
            setTestimonials(prev => [res.data!, ...prev.map(t => ({ ...t, is_spotlight: false }))])
          } else {
            setTestimonials(prev => [res.data!, ...prev])
          }
          showToast(`New testimonial for "${res.data.name}" added to Home!`)
          queryClient.invalidateQueries({ queryKey: ['testimonials'] })
          setEditingTestimonial(null)
          navigate({ to: testimonialsRoutePath as any })
        }
      }
    } catch (err) {
      console.error('Error saving testimonial:', err)
      alert('Failed to save testimonial. Please check console.')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setUploadError(null)
    setUploadSuccessUrl(null)

    // Capture old image to delete it from Cloudinary when replaced
    const oldImageToDelete = testimonialForm.image

    try {
      saveUploadPreset(customPreset)
      const result = await uploadImageToCloudinary(file, customPreset)
      if (result.url) {
        // If an old image existed on Cloudinary and is replaced, delete it permanently
        if (oldImageToDelete && oldImageToDelete !== result.url && oldImageToDelete.includes('cloudinary.com')) {
          deleteMediaFromCloudinary(oldImageToDelete, 'image').catch(err => {
            console.warn('Failed to delete old replaced avatar from Cloudinary:', err)
          })
        }
        setTestimonialForm(prev => ({
          ...prev,
          image: result.url!,
          image_size_bytes: result.bytes || 0,
        }))
        setUploadSuccessUrl(result.url)
        showToast('Image uploaded successfully!')
      } else {
        setUploadError(result.error || 'Failed to upload image.')
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error uploading file.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleUploadVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVideoUploadError(null)
    setVideoSuccessUrl(null)
    saveUploadPreset(customPreset)

    showToast(`Uploading ${file.name} in background... You can switch tabs/routes freely!`)
    startBackgroundVideoUpload(file, totalUsedStorageBytes, customPreset, testimonialForm.video)
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Status Handlers
  const handleUpdateBookingStatus = async (id: string, newStatus: DemoBooking['status']) => {
    setUpdatingId(id)
    const res = await api.bookings.updateBookingStatus(id, newStatus)
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
      showToast(`Booking status updated to "${newStatus}"`)
    }
    setUpdatingId(null)
  }

  const handleDeleteBooking = async (id: string, name: string) => {
    if (!window.confirm(`Delete booking lead for "${name}"?`)) return
    setUpdatingId(id)
    const res = await api.bookings.deleteBooking(id)
    if (res.success) {
      setBookings(prev => prev.filter(b => b.id !== id))
      showToast(`Booking for "${name}" deleted.`)
    }
    setUpdatingId(null)
  }

  const handleUpdateContactStatus = async (id: string, newStatus: ContactMessage['status']) => {
    setUpdatingId(id)
    const res = await api.contact.updateContactStatus(id, newStatus)
    if (res.success) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
      showToast(`Contact status updated to "${newStatus}"`)
    }
    setUpdatingId(null)
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (!window.confirm(`Delete inquiry message from "${name}"?`)) return
    setUpdatingId(id)
    const res = await api.contact.deleteContactMessage(id)
    if (res.success) {
      setContacts(prev => prev.filter(c => c.id !== id))
      showToast(`Inquiry from "${name}" deleted.`)
    }
    setUpdatingId(null)
  }

  // Gate Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-page-root">
        <div className="admin-login-screen">
          <div className="admin-login-card">
            <div className="admin-login-icon-badge">
              <KeyRound size={32} />
            </div>
            <h1 className="admin-login-title">Verbora Edu Admin Portal</h1>
            <p className="admin-login-subtitle">
              Enter administrative passkey to access student diagnostic leads, contact inquiries, and database management.
            </p>

            {authError && (
              <div className="admin-error-box">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="admin-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="admin-passkey-input"
                  placeholder="Enter static access key..."
                  value={passkeyInput}
                  onChange={e => setPasskeyInput(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="admin-toggle-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button type="submit" className="admin-login-btn">
                <Lock size={16} />
                <span>Unlock Dashboard</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Calculate Leads Metrics
  const totalBookings = bookings.length
  const totalContacts = contacts.length
  const totalLeads = totalBookings + totalContacts
  const newBookingsCount = bookings.filter(b => b.status === 'new').length
  const unreadContactsCount = contacts.filter(c => c.status === 'unread').length
  const newLeadsCount = newBookingsCount + unreadContactsCount
  const contactedLeadsCount =
    bookings.filter(b => b.status !== 'new').length +
    contacts.filter(c => c.status !== 'unread').length
  const leadActionRate = totalLeads > 0 ? Math.round((contactedLeadsCount / totalLeads) * 100) : 0

  // Calculate Testimonials Metrics & Storage Usage
  const totalTestimonials = testimonials.length
  const activeTestimonialsCount = testimonials.filter(t => t.is_active).length
  const hiddenTestimonialsCount = totalTestimonials - activeTestimonialsCount
  const videoTestimonialsCount = testimonials.filter(t => !!t.video).length

  // Calculate used storage bytes across testimonials (only real uploaded media)
  const totalUsedStorageBytes = testimonials.reduce((acc, t) => {
    let bytes = 0
    if (t.video_size_bytes) {
      bytes += t.video_size_bytes
    }
    if (t.image_size_bytes) {
      bytes += t.image_size_bytes
    }
    return acc + bytes
  }, 0)

  const usedStorageMB = (totalUsedStorageBytes / (1024 * 1024)).toFixed(1)
  const maxStorageMB = 100
  const storageUsagePercent = Math.min(100, Math.round((totalUsedStorageBytes / MAX_STORAGE_BYTES) * 100))
  const isStorageQuotaExceeded = totalUsedStorageBytes >= MAX_STORAGE_BYTES

  // Construct Unified Leads list
  type UnifiedLeadType = 'booking' | 'contact'
  interface UnifiedLead {
    id: string
    type: UnifiedLeadType
    name: string
    email?: string | null
    phone?: string | null
    course: string
    details: string
    timeSlot?: string | null
    notes?: string | null
    message?: string | null
    goal?: string | null
    status: string
    created_at: string
  }

  const unifiedLeads: UnifiedLead[] = [
    ...bookings.map(b => ({
      id: b.id,
      type: 'booking' as const,
      name: b.name,
      email: b.email,
      phone: b.phone,
      course: b.course,
      details: b.time_slot ? `Slot: ${b.time_slot}` : 'Anytime slot',
      timeSlot: b.time_slot,
      notes: b.notes,
      status: b.status,
      created_at: b.created_at,
    })),
    ...contacts.map(c => ({
      id: c.id,
      type: 'contact' as const,
      name: c.name,
      email: c.email,
      phone: c.phone,
      course: c.course || 'General Coaching',
      details: c.message || 'No written message',
      goal: c.goal,
      message: c.message,
      status: c.status,
      created_at: c.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Filter lists
  const filteredLeads = unifiedLeads.filter(l => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      l.name.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      l.course.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q))
    let matchesStatus = true
    if (statusFilter !== 'all') {
      if (statusFilter === 'new') {
        matchesStatus = l.status === 'new' || l.status === 'unread'
      } else if (statusFilter === 'contacted') {
        matchesStatus = l.status === 'contacted' || l.status === 'replied' || l.status === 'scheduled'
      } else if (statusFilter === 'completed') {
        matchesStatus = l.status === 'completed' || l.status === 'read'
      } else if (statusFilter === 'cancelled') {
        matchesStatus = l.status === 'cancelled' || l.status === 'archived'
      } else {
        matchesStatus = l.status === statusFilter
      }
    }
    return matchesSearch && matchesStatus
  })

  const filteredTestimonials = testimonials.filter(t => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.role.toLowerCase().includes(q) ||
      t.text.toLowerCase().includes(q) ||
      (t.badge && t.badge.toLowerCase().includes(q))
    const matchesStatus =
      testimonialFilter === 'all' ||
      (testimonialFilter === 'active' ? t.is_active : !t.is_active)
    return matchesSearch && matchesStatus
  })

  const handleExportAllLeads = () => {
    const headers = ['Lead Type', 'ID', 'Date', 'Name', 'Phone', 'Email', 'Course', 'Status', 'Inquiry Details']
    const rows = filteredLeads.map(l => [
      l.type === 'booking' ? 'Demo Booking' : 'Contact Message',
      l.id,
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.name || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.course || ''}"`,
      `"${l.status}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ])
    downloadCSV(`verbora-all-leads-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows])
  }

  return (
    <div className="admin-page-root">
      <div className="admin-layout-sidebar">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="admin-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="admin-sidebar-brand">
            <Link to="/" className="admin-nav-logo">VERBORA</Link>
            <span className="admin-nav-badge">Edu Admin</span>
          </div>

          <nav className="admin-sidebar-nav">
            <div className="admin-sidebar-section-title">CHANNELS & DATA</div>

            <Link
              to={leadsRoutePath}
              className={`admin-sidebar-link ${activeSection === 'leads' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <UsersRound size={18} />
              <span className="admin-sidebar-link-text">Leads & Inquiries</span>
              {newBookingsCount + unreadContactsCount > 0 ? (
                <span className="admin-sidebar-pill">
                  {newBookingsCount + unreadContactsCount}
                </span>
              ) : (
                <span className="admin-sidebar-pill-subtle">
                  {totalBookings + totalContacts}
                </span>
              )}
            </Link>

            <Link
              to={testimonialsRoutePath}
              className={`admin-sidebar-link ${activeSection === 'testimonials' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Quote size={18} />
              <span className="admin-sidebar-link-text">Home Testimonials</span>
              <span className="admin-sidebar-pill admin-sidebar-pill-secondary">
                {totalTestimonials}
              </span>
            </Link>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-live-indicator" title="Connected to Database & Storage">
              <span className="admin-live-dot" />
              <span>Database Live</span>
            </div>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-sidebar-view-site"
            >
              <ExternalLink size={14} />
              <span>View Live Website</span>
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="admin-main-wrapper">
          {/* Top Bar Header */}
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              <button
                type="button"
                className="admin-sidebar-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle navigation menu"
              >
                <Menu size={20} />
              </button>

              <div className="admin-breadcrumbs">
                <span className="admin-breadcrumb-muted">Admin</span>
                <span className="admin-breadcrumb-sep">/</span>
                {isTestimonialsFormRoute ? (
                  <>
                    <Link to={testimonialsRoutePath} className="admin-breadcrumb-link">
                      Home Testimonials
                    </Link>
                    <span className="admin-breadcrumb-sep">/</span>
                    <span className="admin-breadcrumb-active">
                      {editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}
                    </span>
                  </>
                ) : (
                  <span className="admin-breadcrumb-active">
                    {activeSection === 'leads' ? 'Leads & Inquiries' : 'Home Testimonials'}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-topbar-right">
              <div className="admin-live-indicator-desktop" title="Supabase PostgreSQL">
                <span className="admin-live-dot" />
                <span>Supabase Live</span>
              </div>

              <button
                type="button"
                className="admin-icon-btn"
                onClick={loadData}
                disabled={loading}
                title="Refresh leads and testimonials"
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                className="admin-icon-btn admin-logout-btn"
                onClick={handleLogout}
                title="Lock Dashboard & Logout"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Main Content Container */}
          <main className="admin-container">
            {activeSection === 'leads' && (
              <>
                {/* KPI Stats Overview */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Total Leads & Inquiries</span>
              <div className="admin-stat-icon"><UsersRound size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalLeads}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{newLeadsCount} New</span>
              <span>awaiting response</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Diagnostic Bookings</span>
              <div className="admin-stat-icon"><Calendar size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalBookings}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{newBookingsCount} New Calls</span>
              <span>scheduled/requested</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Contact Messages</span>
              <div className="admin-stat-icon"><Inbox size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalContacts}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{unreadContactsCount} Unread</span>
              <span>contact queries</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Response Engagement</span>
              <div className="admin-stat-icon"><Target size={18} /></div>
            </div>
            <div className="admin-stat-value">{leadActionRate}%</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{contactedLeadsCount} Contacted</span>
              <span>conversion pipeline</span>
            </div>
          </div>
        </section>

        {/* Filter & Action Controls */}
        <div className="admin-controls-card">
          <div className="admin-filter-row">
            <div className="admin-search-wrap">
              <Search size={15} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search lead by student name, phone, course, message..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="admin-status-filters">
              {/* Export All Leads CSV */}
              <button type="button" className="admin-icon-btn" onClick={handleExportAllLeads}>
                <Download size={14} />
                <span>Export All Leads CSV</span>
              </button>

              {/* Status Dropdown Filter */}
              <select
                className="admin-filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="new">● New / Unread ({newLeadsCount})</option>
                <option value="contacted">● Contacted / In Progress</option>
                <option value="completed">● Completed / Replied</option>
                <option value="cancelled">● Cancelled / Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Unified Leads Table */}
        <div className="admin-table-card">
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Lead Info</th>
                    <th>Type & Program</th>
                    <th>Inquiry Details</th>
                    <th>Status</th>
                    <th>Date Received</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="admin-empty-state">
                          <Database size={40} className="admin-empty-icon" />
                          <p>No leads found matching your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(lead => {
                      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '')
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            lead.type === 'booking'
                              ? `Hi ${lead.name}, thank you for booking your Free Diagnostic Session with Verbora for ${lead.course}. When would be a good time to connect?`
                              : `Hi ${lead.name}, thank you for reaching out to Verbora regarding ${lead.course}. How can we assist you?`
                          )}`
                        : null

                      return (
                        <tr key={`${lead.type}-${lead.id}`}>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{lead.name}</span>
                              <div className="admin-user-meta">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} title="Call phone">
                                    {lead.phone}
                                  </a>
                                )}
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} title="Email student">
                                    {lead.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="admin-user-cell">
                              <span
                                className={`admin-lead-type-badge ${
                                  lead.type === 'booking' ? 'badge-booking' : 'badge-contact'
                                }`}
                              >
                                {lead.type === 'booking' ? (
                                  <>
                                    <Calendar size={11} />
                                    <span>Demo Booking</span>
                                  </>
                                ) : (
                                  <>
                                    <Inbox size={11} />
                                    <span>Contact Query</span>
                                  </>
                                )}
                              </span>
                              <span style={{ fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
                                {lead.course}
                              </span>
                            </div>
                          </td>

                          <td style={{ maxWidth: 320 }}>
                            <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                              {lead.type === 'booking' ? (
                                <>
                                  <span style={{ color: '#38bdf8', fontWeight: 600, display: 'block', fontSize: 11.5 }}>
                                    {lead.details}
                                  </span>
                                  {lead.notes && (
                                    <span style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 2, display: 'block' }}>
                                      Note: {lead.notes}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {lead.goal && (
                                    <span style={{ color: '#a78bfa', fontWeight: 600, display: 'block', fontSize: 11.5, marginBottom: 2 }}>
                                      Goal: {lead.goal}
                                    </span>
                                  )}
                                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {lead.message || 'No written message provided.'}
                                  </p>
                                </>
                              )}
                            </div>
                          </td>

                          <td>
                            {lead.type === 'booking' ? (
                              <select
                                className={`admin-status-select status-${lead.status}`}
                                value={lead.status}
                                disabled={updatingId === lead.id}
                                onChange={e => handleUpdateBookingStatus(lead.id, e.target.value as DemoBooking['status'])}
                              >
                                <option value="new">● New Lead</option>
                                <option value="contacted">● Contacted</option>
                                <option value="scheduled">● Scheduled</option>
                                <option value="completed">● Completed</option>
                                <option value="cancelled">● Cancelled</option>
                              </select>
                            ) : (
                              <select
                                className={`admin-status-select status-${lead.status}`}
                                value={lead.status}
                                disabled={updatingId === lead.id}
                                onChange={e => handleUpdateContactStatus(lead.id, e.target.value as ContactMessage['status'])}
                              >
                                <option value="unread">● Unread</option>
                                <option value="read">● Read</option>
                                <option value="replied">● Replied</option>
                                <option value="archived">● Archived</option>
                              </select>
                            )}
                          </td>

                          <td style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(lead.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </td>

                          <td>
                            <div className="admin-actions-cell">
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-action-btn admin-action-whatsapp"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="admin-action-btn"
                                  title="Call phone"
                                >
                                  <Phone size={13} />
                                </a>
                              )}

                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}?subject=Regarding%20your%20Verbora%20Inquiry`}
                                  className="admin-action-btn"
                                  title="Send Email"
                                >
                                  <Mail size={13} />
                                </a>
                              )}

                              <button
                                type="button"
                                className="admin-action-btn admin-action-delete"
                                title="Delete lead entry"
                                disabled={updatingId === lead.id}
                                onClick={() =>
                                  lead.type === 'booking'
                                    ? handleDeleteBooking(lead.id, lead.name)
                                    : handleDeleteContact(lead.id, lead.name)
                                }
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Testimonials Section */}
            {activeSection === 'testimonials' && (
              <>
                {isTestimonialsFormRoute ? (
                  /* Dedicated Add/Edit Testimonial Form Page */
                  <div className="admin-page-form-wrapper">
                    <div className="admin-page-form-header">
                      <Link
                        to={testimonialsRoutePath}
                        onClick={() => setEditingTestimonial(null)}
                        className="admin-back-btn"
                      >
                        <ArrowLeft size={16} />
                        <span>Back to Testimonials List</span>
                      </Link>
                      <h2 className="admin-page-form-title">
                        {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
                      </h2>
                      <p className="admin-page-form-sub">
                        Enter student details, feedback quote, and upload media.
                      </p>
                    </div>

                    <div className="admin-page-form-card">
                      <form onSubmit={handleSaveTestimonial} className="admin-modal-form">
                        <div className="admin-form-grid-2">
                          <div className="admin-form-group">
                            <label className="admin-form-label">
                              Student Full Name <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Priyanshu Sharma"
                              value={testimonialForm.name}
                              onChange={e => setTestimonialForm(prev => ({ ...prev, name: e.target.value }))}
                              className="admin-input-styled"
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label">
                              Role / Course Title <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Software Engineer, Spoken English"
                              value={testimonialForm.role}
                              onChange={e => setTestimonialForm(prev => ({ ...prev, role: e.target.value }))}
                              className="admin-input-styled"
                            />
                          </div>
                        </div>

                        <div className="admin-form-grid-2">
                          <div className="admin-form-group">
                            <label className="admin-form-label">
                              Badge / Highlight (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Fluency Breakthrough, Job Placement"
                              value={testimonialForm.badge}
                              onChange={e => setTestimonialForm(prev => ({ ...prev, badge: e.target.value }))}
                              className="admin-input-styled"
                            />
                          </div>

                          <div className="admin-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label className="admin-form-label">Visibility</label>
                            <label className="admin-checkbox-label" style={{ marginTop: 6 }}>
                              <input
                                type="checkbox"
                                checked={testimonialForm.is_active}
                                onChange={e => setTestimonialForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="admin-checkbox"
                              />
                              <span>Visible on website</span>
                            </label>
                          </div>
                        </div>

                        {/* Media Uploads Grid */}
                        <div className="admin-form-grid-2">
                          {/* Student Photo */}
                          <div className="admin-avatar-upload-block">
                            <label className="admin-form-label">
                              Student Photo <span className="req">*</span>
                            </label>
                            <div className="admin-avatar-upload-row">
                              <div className="admin-avatar-preview-box">
                                {testimonialForm.image ? (
                                  <img
                                    src={testimonialForm.image}
                                    alt="Avatar preview"
                                    className="admin-avatar-preview-img"
                                    onError={e => {
                                      ;(e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                                    }}
                                  />
                                ) : (
                                  <div className="admin-avatar-empty">
                                    <Image size={24} />
                                    <span>No Photo</span>
                                  </div>
                                )}
                              </div>

                              <div className="admin-avatar-upload-controls">
                                <div className="admin-avatar-file-upload">
                                  <label className="admin-file-picker-btn">
                                    <Upload size={14} className={uploadingImage ? 'spin' : ''} />
                                    <span>{uploadingImage ? 'Uploading Image...' : testimonialForm.image ? 'Change Photo' : 'Upload Photo'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleUploadImageFile}
                                      disabled={uploadingImage}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>

                                {uploadError && (
                                  <div className="admin-upload-alert admin-upload-error">
                                    <AlertCircle size={14} />
                                    <span>{uploadError}</span>
                                  </div>
                                )}

                                {uploadSuccessUrl && (
                                  <div className="admin-upload-alert admin-upload-success">
                                    <CheckCircle2 size={14} />
                                    <span>Image uploaded successfully!</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Student Video */}
                          <div className="admin-avatar-upload-block">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <label className="admin-form-label" style={{ margin: 0 }}>
                                Video Story (Optional)
                              </label>
                              <span style={{ fontSize: 11, color: isStorageQuotaExceeded ? '#f87171' : '#64748b' }}>
                                {usedStorageMB} MB / {maxStorageMB} MB
                              </span>
                            </div>

                            <div className="admin-avatar-upload-row">
                              <div className="admin-avatar-preview-box" style={{ borderRadius: 12 }}>
                                {testimonialForm.video ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#0284c7', fontSize: 10, textAlign: 'center' }}>
                                    <Video size={22} />
                                    <span>Ready</span>
                                  </div>
                                ) : (
                                  <div className="admin-avatar-empty">
                                    <Video size={22} />
                                    <span>No Video</span>
                                  </div>
                                )}
                              </div>

                              <div className="admin-avatar-upload-controls">
                                {!testimonialForm.video ? (
                                  <div className="admin-avatar-file-upload">
                                    <label
                                      className="admin-file-picker-btn"
                                      style={{
                                        opacity: isStorageQuotaExceeded ? 0.6 : 1,
                                        cursor: isStorageQuotaExceeded ? 'not-allowed' : 'pointer'
                                      }}
                                      onClick={(e) => {
                                        if (isStorageQuotaExceeded) {
                                          e.preventDefault()
                                          setShowUpgradeModal(true)
                                        }
                                      }}
                                    >
                                      <Upload size={14} className={uploadingVideo ? 'spin' : ''} />
                                      <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}</span>
                                      <input
                                        type="file"
                                        accept="video/*"
                                        onChange={handleUploadVideoFile}
                                        disabled={uploadingVideo || isStorageQuotaExceeded}
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12 }}>
                                    <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                                      ✓ Video Attached ({testimonialForm.video_size_bytes ? `${(testimonialForm.video_size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'Attached'})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const videoToDelete = testimonialForm.video
                                        if (videoToDelete) {
                                          deleteMediaFromCloudinary(videoToDelete, 'video').catch(() => {})
                                        }
                                        setTestimonialForm(prev => ({ ...prev, video: '', video_size_bytes: 0 }))
                                        setVideoSuccessUrl(null)
                                        showToast('Video removed successfully.')
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}

                                {videoUploadError && (
                                  <div className="admin-upload-alert admin-upload-error">
                                    <AlertCircle size={14} />
                                    <span>{videoUploadError}</span>
                                  </div>
                                )}

                                {videoSuccessUrl && (
                                  <div className="admin-upload-alert admin-upload-success">
                                    <CheckCircle2 size={14} />
                                    <span>Video uploaded successfully!</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">
                            Student Testimonial Quote <span className="req">*</span>
                          </label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Share what the student experienced, their journey, transformation, and results with Verbora..."
                            value={testimonialForm.text}
                            onChange={e => setTestimonialForm(prev => ({ ...prev, text: e.target.value }))}
                            className="admin-textarea-styled"
                          />
                        </div>

                        <div className="admin-form-checkbox-row" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <label className="admin-checkbox-label">
                            <input
                              type="checkbox"
                              checked={testimonialForm.is_active}
                              onChange={e => setTestimonialForm(prev => ({ ...prev, is_active: e.target.checked }))}
                              className="admin-checkbox"
                            />
                            <span>Publish actively on Home page</span>
                          </label>

                          <label className="admin-checkbox-label" style={{ color: testimonialForm.is_spotlight ? '#b45309' : undefined, fontWeight: testimonialForm.is_spotlight ? 600 : undefined }}>
                            <input
                              type="checkbox"
                              checked={testimonialForm.is_spotlight}
                              onChange={e => setTestimonialForm(prev => ({ ...prev, is_spotlight: e.target.checked }))}
                              className="admin-checkbox"
                            />
                            <span>★ Feature as Spotlight Case Study on /stories</span>
                          </label>
                        </div>

                        <div className="admin-modal-footer">
                          <Link
                            to={testimonialsRoutePath}
                            onClick={() => setEditingTestimonial(null)}
                            className="admin-btn-secondary"
                            style={{ textDecoration: 'none' }}
                          >
                            Cancel
                          </Link>

                          <button
                            type="submit"
                            className="admin-btn-primary"
                            disabled={loading || uploadingImage}
                          >
                            {loading ? (
                              <>
                                <RefreshCw size={14} className="spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                <span>{editingTestimonial ? 'Update Testimonial' : 'Save & Publish'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Testimonials KPI Stats */}
                    <section className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-header">
                      <span className="admin-stat-label">Total Testimonials</span>
                      <div className="admin-stat-icon"><Quote size={18} /></div>
                    </div>
                    <div className="admin-stat-value">{totalTestimonials}</div>
                    <div className="admin-stat-sub">
                      <span className="admin-stat-sub-badge">{activeTestimonialsCount} Active</span>
                      <span>shown on home page</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-header">
                      <span className="admin-stat-label">Active on Website</span>
                      <div className="admin-stat-icon"><CheckCircle2 size={18} /></div>
                    </div>
                    <div className="admin-stat-value">{activeTestimonialsCount}</div>
                    <div className="admin-stat-sub">
                      <span className="admin-stat-sub-badge">Live</span>
                      <span>visible to visitors</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-header">
                      <span className="admin-stat-label">Draft / Hidden</span>
                      <div className="admin-stat-icon"><EyeOff size={18} /></div>
                    </div>
                    <div className="admin-stat-value">{hiddenTestimonialsCount}</div>
                    <div className="admin-stat-sub">
                      <span className="admin-stat-sub-badge">Not visible</span>
                      <span>in home carousel</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-header">
                      <span className="admin-stat-label">Video Stories</span>
                      <div className="admin-stat-icon"><Video size={18} /></div>
                    </div>
                    <div className="admin-stat-value">{videoTestimonialsCount}</div>
                    <div className="admin-stat-sub">
                      <span className="admin-stat-sub-badge">With video modal</span>
                      <span>interactive stories</span>
                    </div>
                  </div>
                </section>

                {/* Testimonials Toolbar */}
                <div className="admin-toolbar">
                  <div className="admin-tabs">
                    <button
                      type="button"
                      className="admin-tab"
                      style={{
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                      onClick={handleOpenSpotlightModal}
                      title="Select which testimonial is featured as the Spotlight on /stories"
                    >
                      <Star size={15} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      <span>Spotlight Testimonial</span>
                      {testimonials.find(t => t.is_spotlight) && (
                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                          {testimonials.find(t => t.is_spotlight)?.name.split(' ')[0]}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="admin-toolbar-actions">
                    <div className="admin-search-box">
                      <Search size={14} className="admin-search-icon" />
                      <input
                        type="text"
                        placeholder="Search student, role, quote, badge..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="admin-search-input"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="admin-search-clear"
                          onClick={() => setSearchQuery('')}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <select
                      className="admin-filter-select"
                      value={testimonialFilter}
                      onChange={e => setTestimonialFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses ({totalTestimonials})</option>
                      <option value="active">Active Only ({activeTestimonialsCount})</option>
                      <option value="hidden">Hidden Only ({hiddenTestimonialsCount})</option>
                    </select>

                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={handleOpenAddTestimonial}
                    >
                      <Plus size={15} />
                      <span>Add Testimonial</span>
                    </button>
                  </div>
                </div>

                {/* Cloudinary Quota Tracker Banner */}
                <div className={`admin-cloud-banner ${isStorageQuotaExceeded ? 'admin-cloud-banner-danger' : ''}`}>
                  <div className="admin-cloud-banner-icon" style={{ background: isStorageQuotaExceeded ? 'rgba(239, 68, 68, 0.2)' : undefined, color: isStorageQuotaExceeded ? '#f87171' : undefined }}>
                    <HardDrive size={18} />
                  </div>
                  <div className="admin-cloud-banner-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <strong>
                        Storage Quota: {usedStorageMB} MB of {maxStorageMB} MB Used ({storageUsagePercent}%)
                      </strong>
                      <span style={{ fontSize: 11.5, color: isStorageQuotaExceeded ? '#f87171' : '#34d399', fontWeight: 700 }}>
                        {isStorageQuotaExceeded ? '⚠️ Storage Full (Upgrade Required)' : `● ${(maxStorageMB - Number(usedStorageMB)).toFixed(1)} MB Free remaining`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="admin-quota-bar-wrap">
                      <div
                        className={`admin-quota-bar-fill ${storageUsagePercent > 85 ? 'fill-danger' : storageUsagePercent > 60 ? 'fill-warning' : ''}`}
                        style={{ width: `${storageUsagePercent}%` }}
                      />
                    </div>

                    <p style={{ marginTop: 6, fontSize: 12 }}>
                      Free plan limit is capped at <strong>100 MB</strong> for video and photo testimonials. Need more space for high-resolution student success videos?
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <HardDrive size={14} />
                    <span>Upgrade to 1 GB (₹150/mo)</span>
                  </button>
                </div>

                {showCloudinarySettings && (
                  <div className="admin-cloud-settings-drawer">
                    <div className="admin-cloud-settings-header">
                      <h4>Cloudinary Upload Preset Configuration</h4>
                      <p>
                        Cloud name: <code>{CLOUDINARY_CLOUD_NAME}</code>. Cloudinary requires an <em>Unsigned</em> upload preset for direct frontend uploads. Default is <code>verbora_uploads</code>. If your preset has a different name, specify it below:
                      </p>
                    </div>
                    <div className="admin-cloud-settings-row">
                      <input
                        type="text"
                        value={customPreset}
                        onChange={e => setCustomPreset(e.target.value.trim())}
                        placeholder="e.g. verbora_uploads or ml_default"
                        className="admin-input-styled"
                      />
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={() => {
                          saveUploadPreset(customPreset)
                          showToast('Upload preset updated and saved in browser!')
                          setShowCloudinarySettings(false)
                        }}
                      >
                        Save Preset
                      </button>
                    </div>
                  </div>
                )}

                {/* Testimonials Cards Grid */}
                {filteredTestimonials.length === 0 ? (
                  <div className="admin-table-card">
                    <div className="admin-empty-state">
                      <Quote size={40} className="admin-empty-icon" />
                      <p>No testimonials found matching your filter.</p>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        style={{ marginTop: 14 }}
                        onClick={handleOpenAddTestimonial}
                      >
                        <Plus size={15} />
                        <span>Create First Testimonial</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-testimonials-grid">
                    {filteredTestimonials.map(t => (
                      <div
                        key={t.id}
                        className={`admin-testimonial-card ${!t.is_active ? 'card-inactive' : ''}`}
                      >
                        <div className="admin-testi-card-header">
                          <div className="admin-testi-avatar-wrap">
                            <img
                              src={t.image}
                              alt={t.name}
                              className="admin-testi-avatar-img"
                              onError={e => {
                                ;(e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                              }}
                            />
                            {t.video && (
                              <span className="admin-testi-video-badge" title="Has attached video story">
                                <Video size={11} />
                              </span>
                            )}
                          </div>

                          <div className="admin-testi-meta">
                            <div className="admin-testi-name-row">
                              <h3 className="admin-testi-name">{t.name}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {t.is_spotlight && (
                                  <span
                                    style={{
                                      background: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fcd34d',
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: 10,
                                    }}
                                  >
                                    ★ Spotlight
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className={`admin-status-pill ${t.is_active ? 'pill-active' : 'pill-hidden'}`}
                                  onClick={() => handleToggleTestimonialActive(t.id, t.is_active)}
                                  title={t.is_active ? 'Click to hide from website' : 'Click to show on website'}
                                >
                                  {t.is_active ? '● Active' : '○ Hidden'}
                                </button>
                              </div>
                            </div>
                            <p className="admin-testi-role">{t.role}</p>
                            {t.badge && (
                              <span className="admin-testi-tag">
                                {t.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="admin-testi-quote-wrap">
                          <Quote size={16} className="admin-testi-quote-icon" />
                          <p className="admin-testi-quote-text">"{t.text}"</p>
                        </div>

                        {t.video && (
                          <div className="admin-testi-video-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Video size={13} />
                              <a href={t.video} target="_blank" rel="noopener noreferrer">
                                Watch Video Story
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVideoDirect(t.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                              title="Delete attached video from Cloudinary and testimonial"
                            >
                              Remove Video
                            </button>
                          </div>
                        )}

                        <div className="admin-testi-card-footer">
                          <div className="admin-testi-date">
                            {new Date(t.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>

                          <div className="admin-testi-card-actions">
                            <button
                              type="button"
                              className="admin-action-btn admin-btn-edit"
                              onClick={() => handleOpenEditTestimonial(t)}
                              title="Edit testimonial"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="admin-action-btn admin-action-delete"
                              onClick={() => handleDeleteTestimonial(t.id, t.name)}
                              title="Delete testimonial"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  </div>

      {/* Spotlight Testimonial Selection Modal */}
      {showSpotlightModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: 440, padding: 22, borderRadius: 12 }}>
            <div className="admin-modal-header" style={{ marginBottom: 16, paddingBottom: 12 }}>
              <div className="admin-modal-title-group">
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    Spotlight Testimonial
                  </h3>
                  <p className="admin-modal-sub" style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
                    Select which student story is featured as Spotlight on /stories.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowSpotlightModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Choose Testimonial
                </label>
                <select
                  value={selectedSpotlightId}
                  onChange={e => setSelectedSpotlightId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13.5,
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">None (Use default latest story)</option>
                  {testimonials.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role}) {t.video ? '📹 Video' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowSpotlightModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpotlightSelection}
                  disabled={loading}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Limit Exceeded / Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: 500, padding: 24, borderRadius: 12 }}>
            <div className="admin-modal-header" style={{ marginBottom: 18, paddingBottom: 16 }}>
              <div className="admin-modal-title-group">
                <div className="admin-modal-icon" style={{ background: '#f1f5f9', color: '#0f172a', borderColor: '#cbd5e1' }}>
                  <HardDrive size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: 17 }}>Upgrade Video Storage</h3>
                  <p className="admin-modal-sub">
                    100 MB free quota limit reached for testimonial media.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowUpgradeModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Current Usage Snapshot */}
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Current Plan:</span>
                  <strong style={{ color: '#0f172a' }}>100 MB (Free Tier)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Used Space:</span>
                  <strong style={{ color: isStorageQuotaExceeded ? '#dc2626' : '#0f172a' }}>
                    {usedStorageMB} MB ({storageUsagePercent}%)
                  </strong>
                </div>
                <div className="admin-quota-bar-wrap" style={{ height: 6, background: '#e2e8f0', borderRadius: 4 }}>
                  <div
                    className="admin-quota-bar-fill"
                    style={{
                      width: `${storageUsagePercent}%`,
                      background: isStorageQuotaExceeded ? '#dc2626' : '#0f172a',
                      borderRadius: 4
                    }}
                  />
                </div>
              </div>

              {/* Upgrade Offer Card - Minimal Black & White */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #0f172a',
                borderRadius: 8,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      marginBottom: 4
                    }}>
                      Expanded Capacity
                    </span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>1 GB Video Storage</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>₹150</span>
                    <small style={{ color: '#64748b', display: 'block', fontSize: 11 }}>/ month</small>
                  </div>
                </div>

                <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 12.5, lineHeight: 1.5 }}>
                  <li>Store up to 10x more high quality video testimonials (1,024 MB).</li>
                  <li>Direct video uploads without size restriction errors.</li>
                  <li>Fast global CDN video streaming with instant load on Home page.</li>
                  <li>Cancel or adjust anytime with zero lock-in.</li>
                </ul>

                <a
                  href={`https://wa.me/919999999999?text=${encodeURIComponent('Hi, I want to upgrade my Verbora testimonial storage plan to 1 GB for ₹150/month.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn-primary"
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: '1px solid #0f172a',
                    justifyContent: 'center',
                    marginTop: 4,
                    padding: '10px 16px',
                    fontSize: 13,
                    borderRadius: 6,
                    textDecoration: 'none'
                  }}
                  onClick={() => {
                    showToast('Opening billing upgrade inquiry...')
                  }}
                >
                  <span>Upgrade to 1 GB (₹150 / mo)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-popup">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Background Upload Progress Pill (Visible on all admin routes) */}
      {uploadingVideo && activeUploadTask && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 340,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Upload size={16} className="spin" />
            <strong style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Uploading Video...
            </strong>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Background</span>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
            {activeUploadTask.file.name} ({((activeUploadTask.file.size) / (1024 * 1024)).toFixed(1)} MB)
          </div>
          <div style={{ width: '100%', height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: '#38bdf8', animation: 'progressPulse 1.5s infinite ease-in-out' }} />
          </div>
        </div>
      )}

      {/* Route-Independent Video Upload Completed Confirmation Modal */}
      {showVideoCompletedModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: 460, borderRadius: 10, padding: 24 }}>
            <div className="admin-modal-header" style={{ marginBottom: 16, paddingBottom: 14 }}>
              <div className="admin-modal-title-group">
                <div className="admin-modal-icon" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: 17 }}>Video Upload Complete</h3>
                  <p className="admin-modal-sub">
                    File uploaded & securely processed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => {
                  setShowVideoCompletedModal(null)
                  clearVideoUploadTask()
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#334155' }}>
                <div style={{ marginBottom: 4 }}><strong>File:</strong> {showVideoCompletedModal.file.name}</div>
                <div style={{ marginBottom: 4 }}><strong>Size:</strong> {((showVideoCompletedModal.resultBytes || showVideoCompletedModal.file.size) / (1024 * 1024)).toFixed(1)} MB</div>
                <div><strong>Status:</strong> Successfully linked to testimonial media</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ borderRadius: 6, padding: '8px 16px', fontSize: 13 }}
                  onClick={() => {
                    setShowVideoCompletedModal(null)
                    clearVideoUploadTask()
                  }}
                >
                  OK, Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RootLayout() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  const isAdmin = pathname.startsWith('/verbora-edu-admin') || pathname.startsWith('/shivam-admin') || pathname.startsWith('/admin')
  return (
    <>
      <Outlet />
      {!isAdmin && <WhatsAppFloatingButton />}
    </>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LandingPage })
const courseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses/$courseSlug', component: CourseDetail })
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: AboutPage })
const trainerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trainer', component: TrainerPage })
const trainersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trainers', component: TrainerPage })
const storiesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stories', component: StoriesPage })
const successStoriesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/success-stories', component: StoriesPage })
const contactRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contact', component: ContactPage })
const contactUsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contact-us', component: ContactPage })

// Admin Routes (Main portal, Leads, Testimonials, Add & Edit)
const verboraEduAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const verboraEduAdminLeadsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/leads', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const verboraEduAdminTestimonialsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/testimonials', component: () => <VerboraEduAdminPage defaultRoute="testimonials" /> })
const verboraEduAdminTestimonialsAddRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/testimonials/add', component: () => <VerboraEduAdminPage defaultRoute="testimonials-add" /> })
const verboraEduAdminTestimonialsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verbora-edu-admin/testimonials/edit/$id',
  component: () => <VerboraEduAdminPage defaultRoute="testimonials" />,
})

// Shivam-admin Aliases
const shivamAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const shivamAdminLeadsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/leads', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const shivamAdminTestimonialsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/testimonials', component: () => <VerboraEduAdminPage defaultRoute="testimonials" /> })
const shivamAdminTestimonialsAddRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/testimonials/add', component: () => <VerboraEduAdminPage defaultRoute="testimonials-add" /> })
const shivamAdminTestimonialsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shivam-admin/testimonials/edit/$id',
  component: () => <VerboraEduAdminPage defaultRoute="testimonials" />,
})

// General admin Aliases
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const adminLeadsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/leads', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const adminTestimonialsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/testimonials', component: () => <VerboraEduAdminPage defaultRoute="testimonials" /> })
const adminTestimonialsAddRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/testimonials/add', component: () => <VerboraEduAdminPage defaultRoute="testimonials-add" /> })
const adminTestimonialsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/testimonials/edit/$id',
  component: () => <VerboraEduAdminPage defaultRoute="testimonials" />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  courseRoute,
  aboutRoute,
  trainerRoute,
  trainersRoute,
  storiesRoute,
  successStoriesRoute,
  contactRoute,
  contactUsRoute,
  verboraEduAdminRoute,
  verboraEduAdminLeadsRoute,
  verboraEduAdminTestimonialsRoute,
  verboraEduAdminTestimonialsAddRoute,
  verboraEduAdminTestimonialsEditRoute,
  shivamAdminRoute,
  shivamAdminLeadsRoute,
  shivamAdminTestimonialsRoute,
  shivamAdminTestimonialsAddRoute,
  shivamAdminTestimonialsEditRoute,
  adminRoute,
  adminLeadsRoute,
  adminTestimonialsRoute,
  adminTestimonialsAddRoute,
  adminTestimonialsEditRoute,
])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' { interface Register { router: typeof router } }

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)
