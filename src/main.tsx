import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
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
} from 'lucide-react'
import './styles.css'
import './adjustments.css'
import { api } from './api'
import { DemoBooking, ContactMessage, NewsletterSubscriber } from './types/database'

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

function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''} ${compact ? 'brand-compact' : ''}`} aria-label="VERBORA home">
      <svg className="brand-symbol" viewBox="0 0 98 98" fill="none" aria-hidden="true">
        <circle cx="48" cy="49" r="34" stroke="currentColor" strokeWidth="2.4" opacity=".88" />
        <path d="M17 33c4-17 21-29 41-29 11 0 21 4 27 11M8 39C10 19 29 7 44 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".48" />
        <path d="M11 48c11-3 17 1 21 11l6 15 16-40 9 24 17-32" stroke="#11b7e8" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 48c11-3 17 1 21 11l6 15 16-40 9 24 17-32" stroke="#062656" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 74c13 16 41 17 55-2M63 88c19-6 29-22 27-40M67 12c7-5 13-7 21-8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" opacity=".65" />
      </svg>
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
    <header className="site-header">
      <div className="header-inner">
        <Brand compact />
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
            src="https://res.cloudinary.com/mtjv4nu9/video/upload/f_auto,q_auto:eco,ac_none,w_1280/v1795637076/VIDEO-2026-11-25-15-59-08.mp4"
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
      <div className="section-title-wrap">
        <span className="eyebrow centered">Our Courses</span>
        <h2>Comprehensive Programs for <span>Your Growth</span></h2>
        <p>Choose a learning path that matches where you want to go.</p>
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
  { icon: Rocket, title: 'Expert Trainers', text: 'Guidance that helps you keep improving.' },
  { icon: MonitorPlay, title: 'Interactive Classes', text: 'Learn by speaking and participating.' },
  { icon: TrendingUp, title: 'Practical Learning', text: 'Use your skills beyond the classroom.' },
  { icon: Handshake, title: 'Career Confidence', text: 'Communicate with purpose at work.' },
  { icon: Headphones, title: 'Continued Support', text: 'Stay motivated as your skills grow.' },
]

function WhySection({ onDemo }: { onDemo: () => void }) {
  return <section className="why-section" id="about"><div className="why-copy"><span className="section-kicker">Why Choose VERBORA?</span><h2>More Than Just an <span>English Institute</span></h2><p>We're here to help learners become comfortable communicators—through practice, constructive feedback, and skills that feel useful in the real world.</p><button className="lime-button" onClick={onDemo}>Know More</button></div><div className="benefits" id="trainers">{benefits.map(benefit => <div className="benefit" key={benefit.title}><span className="benefit-icon"><benefit.icon size={35} strokeWidth={1.8} /></span><strong>{benefit.title}</strong><small>{benefit.text}</small></div>)}</div></section>
}

interface StoryItem {
  name: string
  role: string
  image: string
  video: string
  text: string
  badge?: string
}

const stories: StoryItem[] = [
  {
    name: 'Rohit Verma',
    role: 'Software Engineer · Spoken English',
    image: '/assets/testimonials/rohit.jpg',
    video: '/assets/testimonials/sample-video.mp4',
    text: 'VERBORA helped me improve my communication and speak with genuine confidence in client calls and global team presentations.',
    badge: 'Fluency & Workplace English',
  },
  {
    name: 'Sneha Gupta',
    role: 'Marketing Lead · Business English',
    image: '/assets/testimonials/sneha.jpg',
    video: '/assets/testimonials/sample-video.mp4',
    text: 'A practical learning experience with engaging sessions, constructive feedback, and continuous supportive guidance.',
    badge: 'Leadership & Impact',
  },
  {
    name: 'Aman Singh',
    role: 'College Graduate · Interview Prep',
    image: '/assets/testimonials/aman.jpg',
    video: '/assets/testimonials/sample-video.mp4',
    text: 'The structured mock interviews and body language practice gave me the clarity and confidence to crack my dream job.',
    badge: 'Interview Success',
  },
  {
    name: 'Priya Sharma',
    role: 'Team Lead · Public Speaking',
    image: '/assets/testimonials/priya.jpg',
    video: '/assets/testimonials/sample-video.mp4',
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

function StoriesSection() {
  const [active, setActive] = useState(0)
  const [videoStory, setVideoStory] = useState<StoryItem | null>(null)

  return (
    <>
      <section className="stories-section" id="stories">
        <div className="stories-heading">
          <span className="section-kicker">Student Success Stories</span>
          <h2>Real People. Real Progress.</h2>
          <p>Hear how VERBORA learners developed confidence and clarity in everyday and professional communication.</p>
          <div className="story-controls">
            <button aria-label="Previous testimonial" onClick={() => setActive(index => (index + stories.length - 1) % stories.length)}>‹</button>
            <button aria-label="Next testimonial" onClick={() => setActive(index => (index + 1) % stories.length)}>›</button>
          </div>
        </div>

        <div className="story-cards">
          {[0, 1].map(offset => {
            const story = stories[(active + offset) % stories.length]
            return (
              <article className="story-card" key={story.name}>
                <div className="story-avatar-wrap">
                  <img src={story.image} alt={story.name} className="story-avatar-img" />
                </div>
                <div className="story-content">
                  <div className="story-quote-row">
                    <Quote size={18} fill="currentColor" />
                    <p>“{story.text}”</p>
                  </div>
                  <div className="story-footer-row">
                    <div className="story-author-info">
                      <strong>{story.name}</strong>
                      <small>{story.role}</small>
                    </div>
                    <button
                      type="button"
                      className="story-arrow-btn"
                      onClick={() => setVideoStory(story)}
                      aria-label={`Watch ${story.name}'s video story`}
                      title="Watch video story"
                    >
                      <span>Watch Story</span>
                      <MoveRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <StoryVideoModal story={videoStory} onClose={() => setVideoStory(null)} />
    </>
  )
}

/* Deliberately removed FocusStrip as per latest commit */
/*
function FocusStrip() {
  return <section className="focus-strip"><div className="focus-heading"><span className="focus-line" /><BriefcaseBusiness size={21} /><h2>Speak English with VERBORA. Show up confidently wherever you go.</h2><span className="focus-line" /></div><div className="focus-tags"><span>Interviews</span><span>Workplace Meetings</span><span>Presentations</span><span>Networking</span><span>Everyday Life</span></div></section>
}
*/

function ResourcesSection() {
  const [active, setActive] = useState(0)
  const tips = [
    { category: 'Communication Tip', title: 'Speak clearly, not quickly.', text: 'Pause between ideas. A steady pace helps listeners follow your message.' },
    { category: 'Interview Tip', title: 'Tell a story with your answer.', text: 'Describe the situation, your action, and what changed as a result.' },
    { category: 'Confidence Tip', title: 'Practice out loud every day.', text: 'Even a few intentional minutes can help you become more comfortable speaking.' },
  ]
  return <section className="resources-section" id="resources"><div><span className="section-kicker">From The Learning Desk</span><h2>A little practice.<br /><span>A lot of progress.</span></h2><p>Small ideas to help you communicate more confidently, one day at a time.</p><div className="tip-dots">{tips.map((tip, index) => <button key={tip.title} className={index === active ? 'active' : ''} aria-label={`Show tip ${index + 1}`} onClick={() => setActive(index)} />)}</div></div><article className="tip-card"><h3>{tips[active].title}</h3><p>{tips[active].text}</p><div className="tip-abstract"><span /><span /><span /></div></article></section>
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
          {/* Removing deliberately */}
          {/* <FocusStrip /> */}
          <ResourcesSection />
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
      quote: 'Abbas Sir completely transformed my confidence on US client calls. I used to translate every Hindi word in my head before speaking. In 4 weeks, that hesitation vanished.',
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
      quote: 'I had 3 rejections due to communication anxiety. Abbas Sir coached me through mock interviews and body language. Cleared my Deloitte interview on the first attempt!',
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
                  With over 10 years of intensive speech mentorship and 12,000+ students coached, Syed Abbas has helped engineers, managers, founders, and students break through English anxiety, master executive presence, and unlock their full career potential.
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
              <h2>What Students Say About <span>Abbas Sir</span></h2>
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

  const detailedStories = [
    {
      id: 'rohit-verma',
      name: 'Rohit Verma',
      role: 'Senior Software Engineer',
      company: 'TechCorp Global',
      category: 'spoken-english' as const,
      badge: 'Fluency Breakthrough',
      image: '/assets/testimonials/rohit.jpg',
      video: '/assets/testimonials/sample-video.mp4',
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
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Hesitated to speak in high-stakes executive meetings and held back strategic ideas due to lack of corporate vocal polish.',
      breakthrough: 'Mastered executive tonality, strategic pauses, and persuasive meeting vocabulary. Promoted to Regional Lead within 3 months.',
      quote: 'Abbas Sir taught me how to command the room with composure. I learned that pausing with poise is a mark of confidence, not hesitation.',
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
      video: '/assets/testimonials/sample-video.mp4',
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
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Trembling voice, fast heartbeat, and severe stage fright when speaking in front of more than 5 colleagues.',
      breakthrough: 'Mastered diaphragmatic breathing, purposeful stage movement, and vocal projection. Delivered a 300+ attendee tech keynote.',
      quote: 'Conquering stage fright was something I thought was impossible for me. The patient coaching at VERBORA gave me my authentic voice.',
      metric: '300+ Attendee Keynote',
      metricLabel: 'Zero Stage Fright',
    },
    {
      id: 'kavita-nair',
      name: 'Kavita Nair',
      role: 'HR Business Partner',
      company: 'Nexus Global',
      category: 'business-english' as const,
      badge: 'Executive Diplomacy',
      image: '/assets/testimonials/sneha.jpg',
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Struggled to stay assertive during difficult appraisals, salary negotiations, and high-pressure leadership townhalls.',
      breakthrough: 'Acquired assertive diplomacy phrasing, vocal modulation, and emotional equilibrium during conflict discussions.',
      quote: 'Daily WhatsApp voice note coaching with direct corrections made sure I practiced every single day. My authority at work multiplied.',
      metric: 'Appointed People Ops Head',
      metricLabel: 'Assertive Negotiation',
    },
    {
      id: 'arjun-mehta',
      name: 'Arjun Mehta',
      role: 'Founder & CEO',
      company: 'CloudFlow SaaS',
      category: 'public-speaking' as const,
      badge: 'Seed Round Pitch',
      image: '/assets/testimonials/rohit.jpg',
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Over-explaining technical details and failing to convey concise business vision to international venture capitalists.',
      breakthrough: 'Refined narrative hooks, dynamic vocal inflection, and investor Q&A defense. Successfully closed $1.2M seed round.',
      quote: 'Investors bet on the clarity and charisma of the founder. VERBORA turned my confusing technical talk into an inspiring business story.',
      metric: 'Closed $1.2M Funding',
      metricLabel: 'Global VC Buy-In',
    },
    {
      id: 'rhea-sen',
      name: 'Rhea Sen',
      role: 'Clinical Liaison Specialist',
      company: 'BioHealth International',
      category: 'spoken-english' as const,
      badge: 'Accent Neutralization',
      image: '/assets/testimonials/priya.jpg',
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Heavy mother-tongue influence and rushing words caused overseas doctors to frequently ask her to repeat herself.',
      breakthrough: 'Neutralized vowel elongation, smoothed consonants, and developed crisp, globally understood articulation.',
      quote: 'I used to feel self-conscious every time I opened my mouth. Now, my speech is crisp, natural, and respected across international teams.',
      metric: '100% Speech Clarity',
      metricLabel: 'International Recognition',
    },
    {
      id: 'vikram-malhotra',
      name: 'Vikram Malhotra',
      role: 'Senior Financial Analyst',
      company: 'Apex Capital',
      category: 'interview-prep' as const,
      badge: 'Executive Switch',
      image: '/assets/testimonials/aman.jpg',
      video: '/assets/testimonials/sample-video.mp4',
      challenge: 'Constant filler words (“um”, “like”, “basically”) weakened his impact during executive investment briefings.',
      breakthrough: 'Eliminated verbal crutches using Thought-Pause training. Aced executive panel interviews for a Director-level role.',
      quote: 'Hearing my before and after voice recordings was shocking. The poise, crispness, and maturity in my speech increased tenfold.',
      metric: 'Director Promotion',
      metricLabel: 'Zero Verbal Crutches',
    },
  ]

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

  const spotlight = detailedStories[0]

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
              <div className="spotlight-media-wrap" onClick={() => setVideoStory({ ...spotlight, text: spotlight.quote })}>
                <img src={spotlight.image} alt={spotlight.name} className="spotlight-img" />
                <div className="spotlight-play-overlay">
                  <span className="spotlight-play-btn">
                    <CirclePlay size={36} fill="#ffffff" color="#0284c7" />
                  </span>
                  <span className="spotlight-play-label">Watch Transformation Video</span>
                </div>
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
                  <button className="primary-button spotlight-video-btn" onClick={() => setVideoStory({ ...spotlight, text: spotlight.quote })}>
                    <CirclePlay size={17} />
                    <span>Watch Story</span>
                  </button>
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
                    <div className="story-card-media" onClick={() => setVideoStory({ ...story, text: story.quote })}>
                      <img src={story.image} alt={story.name} className="story-card-img" />
                      <button className="story-card-play" aria-label={`Play video of ${story.name}`}>
                        <CirclePlay size={24} fill="#ffffff" color="#0284c7" />
                      </button>
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
                    <button className="story-watch-link" onClick={() => setVideoStory({ ...story, text: story.quote })}>
                      <CirclePlay size={16} />
                      <span>Watch Video</span>
                    </button>
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
      `Hi Syed Abbas & Verbora team, I would like to book my Free 1-on-1 Diagnostic Call. Please confirm my slot!`,
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
      // 3. Open WhatsApp directly in new window/tab
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const faqs = [
    {
      q: 'How soon can I start my sessions after contacting?',
      a: 'Our small-cohort batches start every single Monday. If you opt for 1-on-1 executive mentorship with Syed Abbas Zaidi, your sessions can begin within 48 hours following your initial speech diagnostic evaluation.',
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
                Have questions about our course batches, fees, or 1-on-1 mentorship with Syed Abbas Zaidi? Connect directly with our counselor and speech coaching desk.
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
                  Explore Syed Abbas Zaidi’s 10+ years of executive coaching experience, the 4-pillar speech methodology, verified student reviews, and global alumni achievements.
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
                  alt="Syed Abbas Zaidi"
                  className="trainer-banner-img"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
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

function VerboraEduAdminPage() {
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

  // Data states
  const [activeTab, setActiveTab] = useState<'bookings' | 'contacts' | 'subscribers'>('bookings')
  const [bookings, setBookings] = useState<DemoBooking[]>([])
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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
      const [bRes, cRes, sRes] = await Promise.all([
        api.bookings.getDemoBookings(),
        api.contact.getContactMessages(),
        api.subscribers.getSubscribers(),
      ])
      if (bRes.data) setBookings(bRes.data)
      if (cRes.data) setContacts(cRes.data)
      if (sRes.data) setSubscribers(sRes.data)
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
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

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!window.confirm(`Delete subscriber "${email}"?`)) return
    setUpdatingId(id)
    const res = await api.subscribers.deleteSubscriber(id)
    if (res.success) {
      setSubscribers(prev => prev.filter(s => s.id !== id))
      showToast(`Subscriber "${email}" deleted.`)
    }
    setUpdatingId(null)
  }

  // Export CSV functions
  const handleExportBookings = () => {
    const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Course', 'Time Slot', 'Status', 'Source', 'Notes']
    const rows = bookings.map(b => [
      b.id,
      `"${new Date(b.created_at).toLocaleString()}"`,
      `"${b.name || ''}"`,
      `"${b.phone || ''}"`,
      `"${b.email || ''}"`,
      `"${b.course || ''}"`,
      `"${b.time_slot || ''}"`,
      `"${b.status}"`,
      `"${b.source || ''}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`
    ])
    downloadCSV(`verbora-bookings-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows])
  }

  const handleExportContacts = () => {
    const headers = ['ID', 'Date', 'Name', 'Email', 'Phone', 'Course', 'Goal', 'Status', 'Message']
    const rows = contacts.map(c => [
      c.id,
      `"${new Date(c.created_at).toLocaleString()}"`,
      `"${c.name || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.course || ''}"`,
      `"${c.goal || ''}"`,
      `"${c.status}"`,
      `"${(c.message || '').replace(/"/g, '""')}"`
    ])
    downloadCSV(`verbora-contacts-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows])
  }

  const handleExportSubscribers = () => {
    const headers = ['ID', 'Date', 'Email', 'Status']
    const rows = subscribers.map(s => [
      s.id,
      `"${new Date(s.created_at).toLocaleString()}"`,
      `"${s.email || ''}"`,
      `"${s.status}"`
    ])
    downloadCSV(`verbora-subscribers-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows])
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

  // Calculate Metrics
  const totalBookings = bookings.length
  const newBookingsCount = bookings.filter(b => b.status === 'new').length
  const totalContacts = contacts.length
  const unreadContactsCount = contacts.filter(c => c.status === 'unread').length
  const totalSubscribers = subscribers.length
  const contactedRate = totalBookings > 0 ? Math.round(((totalBookings - newBookingsCount) / totalBookings) * 100) : 0

  // Filter lists
  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      b.name.toLowerCase().includes(q) ||
      (b.phone && b.phone.includes(q)) ||
      (b.email && b.email.toLowerCase().includes(q)) ||
      b.course.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.message && c.message.toLowerCase().includes(q)) ||
      (c.course && c.course.toLowerCase().includes(q))
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredSubscribers = subscribers.filter(s => {
    const q = searchQuery.toLowerCase().trim()
    return !q || s.email.toLowerCase().includes(q)
  })

  return (
    <div className="admin-page-root">
      {/* Admin Sticky Navigation */}
      <header className="admin-nav">
        <div className="admin-nav-brand">
          <Link to="/" className="admin-nav-logo">VERBORA</Link>
          <span className="admin-nav-badge">Edu Admin</span>
        </div>

        <div className="admin-nav-actions">
          <div className="admin-live-indicator" title="Connected to Supabase PostgreSQL">
            <span className="admin-live-dot" />
            <span>Database Live</span>
          </div>

          <button
            type="button"
            className="admin-icon-btn"
            onClick={loadData}
            disabled={loading}
            title="Refresh Leads Data"
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

      {/* Main Container */}
      <main className="admin-container">
        {/* KPI Stats Overview */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Diagnostic Bookings</span>
              <div className="admin-stat-icon"><Calendar size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalBookings}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{newBookingsCount} New</span>
              <span>awaiting response</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Contact Inquiries</span>
              <div className="admin-stat-icon"><Inbox size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalContacts}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{unreadContactsCount} Unread</span>
              <span>messages received</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Newsletter Audience</span>
              <div className="admin-stat-icon"><Mail size={18} /></div>
            </div>
            <div className="admin-stat-value">{totalSubscribers}</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">100% Active</span>
              <span>subscribers</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <span className="admin-stat-label">Lead Action Rate</span>
              <div className="admin-stat-icon"><Target size={18} /></div>
            </div>
            <div className="admin-stat-value">{contactedRate}%</div>
            <div className="admin-stat-sub">
              <span className="admin-stat-sub-badge">{totalBookings - newBookingsCount} Contacted</span>
              <span>conversion pipeline</span>
            </div>
          </div>
        </section>

        {/* Tab Switcher & Filter Controls */}
        <div className="admin-controls-card">
          <div className="admin-tabs-row">
            <div className="admin-tabs-list">
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('bookings'); setStatusFilter('all'); }}
              >
                <Calendar size={15} />
                <span>Demo Bookings</span>
                <span className="admin-tab-badge">{totalBookings}</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => { setActiveTab('contacts'); setStatusFilter('all'); }}
              >
                <Inbox size={15} />
                <span>Contact Messages</span>
                <span className="admin-tab-badge">{unreadContactsCount > 0 ? `${unreadContactsCount} new` : totalContacts}</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
                onClick={() => { setActiveTab('subscribers'); setStatusFilter('all'); }}
              >
                <Mail size={15} />
                <span>Subscribers</span>
                <span className="admin-tab-badge">{totalSubscribers}</span>
              </button>
            </div>

            {/* Export CSV Button */}
            <div>
              {activeTab === 'bookings' && (
                <button type="button" className="admin-icon-btn" onClick={handleExportBookings}>
                  <Download size={14} />
                  <span>Export Bookings CSV</span>
                </button>
              )}
              {activeTab === 'contacts' && (
                <button type="button" className="admin-icon-btn" onClick={handleExportContacts}>
                  <Download size={14} />
                  <span>Export Contacts CSV</span>
                </button>
              )}
              {activeTab === 'subscribers' && (
                <button type="button" className="admin-icon-btn" onClick={handleExportSubscribers}>
                  <Download size={14} />
                  <span>Export Subscribers CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="admin-filter-row">
            <div className="admin-search-wrap">
              <Search size={15} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder={activeTab === 'subscribers' ? 'Search by email address...' : 'Search student by name, phone, course...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === 'bookings' && (
              <div className="admin-status-filters">
                {(['all', 'new', 'contacted', 'scheduled', 'completed', 'cancelled'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`admin-filter-pill ${statusFilter === st ? 'active' : ''}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'all' ? 'All Bookings' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="admin-status-filters">
                {(['all', 'unread', 'read', 'replied', 'archived'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`admin-filter-pill ${statusFilter === st ? 'active' : ''}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'all' ? 'All Inquiries' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Bookings Table */}
        {activeTab === 'bookings' && (
          <div className="admin-table-card">
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student / Lead</th>
                    <th>Course & Time Slot</th>
                    <th>Status</th>
                    <th>Date Received</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="admin-empty-state">
                          <Database size={40} className="admin-empty-icon" />
                          <p>No booking leads found matching your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => {
                      const cleanPhone = (b.phone || '').replace(/[^0-9]/g, '')
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${b.name}, thank you for booking your Free Diagnostic Session with Verbora for ${b.course}. When would be a good time to connect?`)}`
                        : null

                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{b.name}</span>
                              <div className="admin-user-meta">
                                {b.phone && (
                                  <a href={`tel:${b.phone}`} title="Call phone">
                                    {b.phone}
                                  </a>
                                )}
                                {b.email && (
                                  <a href={`mailto:${b.email}`} title="Email student">
                                    {b.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="admin-user-cell">
                              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{b.course}</span>
                              <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                                {b.time_slot || 'Anytime'} · <small style={{ color: '#64748b' }}>{b.source || 'web'}</small>
                              </span>
                              {b.notes && (
                                <span style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>
                                  {b.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <select
                              className={`admin-status-select status-${b.status}`}
                              value={b.status}
                              disabled={updatingId === b.id}
                              onChange={e => handleUpdateBookingStatus(b.id, e.target.value as DemoBooking['status'])}
                            >
                              <option value="new">● New Lead</option>
                              <option value="contacted">● Contacted</option>
                              <option value="scheduled">● Scheduled</option>
                              <option value="completed">● Completed</option>
                              <option value="cancelled">● Cancelled</option>
                            </select>
                          </td>

                          <td style={{ color: '#94a3b8', fontSize: 12 }}>
                            {new Date(b.created_at).toLocaleString('en-US', {
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
                                  title="Chat with student on WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {b.phone && (
                                <a
                                  href={`tel:${b.phone}`}
                                  className="admin-action-btn"
                                  title="Call phone directly"
                                >
                                  <Phone size={13} />
                                  <span>Call</span>
                                </a>
                              )}

                              <button
                                type="button"
                                className="admin-action-btn admin-action-delete"
                                title="Delete booking entry"
                                disabled={updatingId === b.id}
                                onClick={() => handleDeleteBooking(b.id, b.name)}
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
        )}

        {/* Tab 2: Contact Inquiries Table */}
        {activeTab === 'contacts' && (
          <div className="admin-table-card">
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sender Info</th>
                    <th>Program & Goal</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="admin-empty-state">
                          <Inbox size={40} className="admin-empty-icon" />
                          <p>No contact messages found matching your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map(c => {
                      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '')
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${c.name}, thank you for reaching out to Verbora regarding ${c.course || 'our coaching programs'}.`)}`
                        : null

                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{c.name}</span>
                              <div className="admin-user-meta">
                                <a href={`mailto:${c.email}`} title="Email sender">
                                  {c.email}
                                </a>
                                {c.phone && (
                                  <a href={`tel:${c.phone}`} title="Call sender">
                                    {c.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="admin-user-cell">
                              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.course || 'General'}</span>
                              <span style={{ fontSize: 11.5, color: '#38bdf8' }}>Goal: {c.goal || 'General'}</span>
                            </div>
                          </td>

                          <td style={{ maxWidth: 300 }}>
                            <p style={{ margin: 0, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                              {c.message || 'No written message provided.'}
                            </p>
                          </td>

                          <td>
                            <select
                              className={`admin-status-select status-${c.status}`}
                              value={c.status}
                              disabled={updatingId === c.id}
                              onChange={e => handleUpdateContactStatus(c.id, e.target.value as ContactMessage['status'])}
                            >
                              <option value="unread">● Unread</option>
                              <option value="read">● Read</option>
                              <option value="replied">● Replied</option>
                              <option value="archived">● Archived</option>
                            </select>
                          </td>

                          <td style={{ color: '#94a3b8', fontSize: 12 }}>
                            {new Date(c.created_at).toLocaleString('en-US', {
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
                              <a
                                href={`mailto:${c.email}?subject=Regarding%20your%20Verbora%20Inquiry`}
                                className="admin-action-btn"
                                title="Reply via Email"
                              >
                                <Mail size={13} />
                                <span>Email</span>
                              </a>

                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-action-btn admin-action-whatsapp"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                </a>
                              )}

                              <button
                                type="button"
                                className="admin-action-btn admin-action-delete"
                                title="Delete inquiry"
                                disabled={updatingId === c.id}
                                onClick={() => handleDeleteContact(c.id, c.name)}
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
        )}

        {/* Tab 3: Newsletter Subscribers Table */}
        {activeTab === 'subscribers' && (
          <div className="admin-table-card">
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber Email</th>
                    <th>Status</th>
                    <th>Subscribed On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="admin-empty-state">
                          <Mail size={40} className="admin-empty-icon" />
                          <p>No newsletter subscribers found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div className="admin-user-cell">
                            <span className="admin-user-name">{s.email}</span>
                          </div>
                        </td>

                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: s.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: s.status === 'active' ? '#34d399' : '#f87171',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700
                          }}>
                            ● {s.status.toUpperCase()}
                          </span>
                        </td>

                        <td style={{ color: '#94a3b8', fontSize: 12 }}>
                          {new Date(s.created_at).toLocaleString('en-US', {
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
                            <a
                              href={`mailto:${s.email}`}
                              className="admin-action-btn"
                              title="Send Email"
                            >
                              <Mail size={13} />
                              <span>Email</span>
                            </a>

                            <button
                              type="button"
                              className="admin-action-btn admin-action-delete"
                              title="Delete subscriber"
                              disabled={updatingId === s.id}
                              onClick={() => handleDeleteSubscriber(s.id, s.email)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-popup">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

function RootLayout() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  const isAdmin = pathname.startsWith('/verbora-edu-admin') || pathname.startsWith('/shivam-admin')
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
const verboraEduAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin', component: VerboraEduAdminPage })
const shivamAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin', component: VerboraEduAdminPage })
const routeTree = rootRoute.addChildren([indexRoute, courseRoute, aboutRoute, trainerRoute, trainersRoute, storiesRoute, successStoriesRoute, contactRoute, contactUsRoute, verboraEduAdminRoute, shivamAdminRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' { interface Register { router: typeof router } }

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
