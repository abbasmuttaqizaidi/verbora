import { Suspense, lazy, useEffect, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
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
  CheckCircle2, ChevronDown, CirclePlay, Clock, GraduationCap,
  Mail, Menu, MessageCircle, Mic2, Phone,
  Rocket, Search, Sparkles, Star, UsersRound,
  X, MoveRight, ChevronLeft, ChevronRight, Instagram, Youtube, Linkedin,
  Quote, HeartHandshake, Target, Award, BadgeCheck, ShieldCheck,
  MapPin, Send, Lock, KeyRound, RefreshCw, Trash2, Download, LogOut,
  Eye, EyeOff, Database, Inbox, Calendar, AlertCircle, FileText,
  Plus, Edit3, Image, Upload, Video, ExternalLink, ArrowLeft, HardDrive, BookOpen, UserCheck, Trophy,
} from 'lucide-react'
import './styles.css'
import './adjustments.css'
import { api } from './api'
import {
  Lead,
  LeadStats,
  LeadStatus,
  LeadSummary,
  LeadsPageResult,
  Testimonial,
  Course,
  CourseId,
  TrainerStatItem,
  ContestPrizeItem,
  ContestStepItem,
} from './types/database'
import { sanitizeRichHtml, stripHtmlToText } from './lib/richText'
import { TrainerListEditor } from './components/TrainerListEditor'
import {
  readCachedCourses,
  readCachedTestimonials,
  readCachedTrainerProfile,
  writeCachedTrainerProfile,
  readCachedContestConfig,
  writeCachedContestConfig,
  clearHomeCache,
} from './lib/homeCache'

const LazyRichTextEditor = lazy(() =>
  import('./components/RichTextEditor').then(m => ({ default: m.RichTextEditor }))
)
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  deleteMediaFromCloudinary,
  getSavedUploadPreset,
  saveUploadPreset,
  CLOUDINARY_CLOUD_NAME,
  MAX_STORAGE_BYTES,
  MAX_STORAGE_MB,
} from './lib/cloudinary'
import {
  startBackgroundVideoUpload,
  subscribeToVideoUpload,
  clearVideoUploadTask,
  VideoUploadTask,
} from './lib/videoUploadManager'

// Course item static definition mapping
export const courseIconMap: Record<CourseId, any> = {
  'spoken-english': MessageCircle,
  'business-english': BriefcaseBusiness,
  'public-speaking': Mic2,
  'interview-preparation': UsersRound,
  'personality-development': Sparkles,
  'executive-communication': Target,
}

const courses = [
  {
    id: 'spoken-english' as CourseId,
    title: 'Spoken English',
    tagline: 'Speak fluently. Connect naturally.',
    short: 'Speak fluently. Be confident.',
    summary: 'Build the confidence to express yourself clearly in everyday conversations, discussions, and new situations.',
    icon: MessageCircle,
    iconClass: 'aqua',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809123/verbora/courses/spoken-english.png',
    video: 'https://res.cloudinary.com/mtjv4nu9/video/upload/v1795853343/verbora/testimonials/p8rd7iph6tdmxu64psbq.mp4',
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
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809124/verbora/courses/business-english.png',
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
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809125/verbora/courses/public-speaking.png',
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
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809126/verbora/courses/interview-preparation.png',
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
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809128/verbora/courses/personality-development.png',
    topics: ['Body language and self-presence', 'Active listening and emotional intelligence', 'Overcoming self-doubt and hesitation', 'Etiquette and professional demeanor'],
  },
  {
    id: 'executive-communication' as CourseId,
    title: 'Executive Communication',
    tagline: 'Lead conversations. Influence rooms.',
    short: 'Lead with presence.',
    summary: 'Master high-stakes stakeholder conversations, strategic persuasion, leadership presence, and crisp executive storytelling.',
    icon: Target,
    iconClass: 'aqua',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809129/verbora/courses/executive-communication.png',
    topics: ['Boardroom & stakeholder pitching', 'Persuasive framing & conciseness', 'Handling tough Q&A with poise', 'Cross-cultural leadership fluency'],
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
        src="/assets/verbora-symbol-nav.png"
        alt="VERBORA Logo"
        className="brand-symbol"
        width={compact ? 44 : 52}
        height={compact ? 44 : 52}
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
  const { courses: dynamicCourses } = useMergedCourses()
  const [values, setValues] = useState<DemoValues>(() => ({
    name: '',
    email: '',
    phone: '',
    course: defaultCourse || '',
  }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'done'>('idle')

  function update<K extends keyof DemoValues>(key: K, value: DemoValues[K]) {
    setValues(old => ({ ...old, [key]: value }))
    if (error) setError('')
    if (phase !== 'idle') setPhase('idle')
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    if (values.name.trim().length < 2) {
      return setError('Please enter your full name.')
    }
    if (!values.course) {
      return setError('Please select a course to continue.')
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return setError('Please enter a valid email address.')
    }
    if (values.phone.replace(/\D/g, '').length < 10) {
      return setError('Please enter a valid 10-digit phone number.')
    }

    const selectedCourse = dynamicCourses.find(c => c.id === values.course)?.title || values.course
    setSubmitting(true)
    setError('')

    try {
      const res = await api.leads.createLead({
        lead_type: 'demo-booking',
        name: values.name.trim(),
        email: values.email.trim() || undefined,
        phone: values.phone.trim(),
        course: selectedCourse,
        source: inModal ? 'popup-modal' : 'floating-card',
        status: 'new',
      })

      if (!res.success) {
        setError(res.error || 'Could not submit your demo request. Please try again.')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lead-stats'] })
      setPhase('done')
      recordPopupDismissed()
    } catch (err: any) {
      setError(err?.message || 'Could not submit your demo request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`demo-card modern-demo-card ${inModal ? 'demo-card-modal' : ''}`} id={inModal ? undefined : 'demo-form'}>
      {/* Top Header */}
      <div className="modern-demo-header">
        <h2>Book Your Free <span>Demo Session</span></h2>
        <p>Experience our live spoken English coaching and get personalized feedback from our trainer desk.</p>
      </div>

      {phase === 'done' ? (
        <div className="modern-demo-success" role="status">
          <div className="success-icon-wrap">
            <CheckCircle2 size={44} />
          </div>
          <h3>Demo Request Received!</h3>
          <p>Thank you! Your free demo session request has been saved. Our team will reach out to you shortly to schedule your slot.</p>
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
                  {dynamicCourses.map(course => (
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
              <label className="field-label">Phone Number <span className="req">*</span></label>
              <div className="modern-input-field">
                <Phone size={16} />
                <input
                  aria-label="Your phone number"
                  autoComplete="tel"
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={values.phone}
                  onChange={e => update('phone', e.target.value)}
                  required
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

          <button className="primary-button modern-submit-btn" type="submit" disabled={submitting}>
            <Send size={16} />
            <span>{submitting ? 'Submitting Demo Request...' : 'Book Free Demo Session'}</span>
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
  const { courses: dynamicCourses } = useMergedCourses()
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

  const filtered = dynamicCourses.filter(course =>
    `${course.title} ${course.short} ${course.tagline} ${stripHtmlToText(course.summary)}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  const isHome = location === '/'
  const isAbout = location === '/about'
  const isTrainer = location === '/trainer' || location === '/trainers'
  const isStories = location === '/stories' || location === '/success-stories'
  const isContest = location === '/contest'
  const isContact = location === '/contact' || location === '/contact-us'
  const isCourses = location.startsWith('/courses')
  const { data: navContestConfig } = useContestConfigQuery()
  const showContestLink = navContestConfig ? navContestConfig.is_active : true

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
                {dynamicCourses.map(course => (
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
          {showContestLink && (
            <Link to="/contest" className={`nav-item nav-contest-link ${isContest ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
              <span className="nav-contest-label-wrap">
                <span className="nav-contest-dot" aria-hidden="true" />
                <span>Contest</span>
              </span>
              <ChevronRight size={15} className="mobile-link-arrow" />
            </Link>
          )}
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
  const { data: contestConfig } = useContestConfigQuery()
  const showContestCta = contestConfig?.is_active !== false
  const heroContestBtnText =
    contestConfig?.hero_pill_text?.trim() || api.contest.DEFAULT_CONTEST_CONFIG.hero_pill_text

  return (
    <section className="hero" id="home">
      <div className="hero-video-wrapper" aria-hidden="true">
        <video
          className="hero-video-element"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
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
        <h1>
          Speak Confidently.<br />Communicate{' '}
          <span className="hero-highlight-word">
            <span className="hero-highlight-text">Professionally.</span>
            <svg
              className="hero-word-underline"
              viewBox="0 0 240 16"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="heroWordUnderlineGrad" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="55%" stopColor="#bae6fd" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <path
                d="M3 11.5C68 3.5 162 2.5 237 9.5"
                stroke="url(#heroWordUnderlineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="hero-description">VERBORA helps you build essential communication skills with practical learning, expert guidance, and the confidence to express yourself.</p>
        <div className="hero-buttons">
          {showContestCta ? (
            <Link to="/contest" className="primary-button hero-primary hero-contest-cta">
              <Trophy size={17} />
              <span>{heroContestBtnText}</span>
            </Link>
          ) : (
            <a href="/#courses" className="primary-button hero-primary">Explore Courses</a>
          )}
          <a href="/#about" className="secondary-button"><CirclePlay size={19} fill="#0966bf" color="white" />How It Works</a>
        </div>
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

function CourseGridCard({ course }: { course: ReturnType<typeof useMergedCourses>['courses'][number] }) {
  if (course.is_upcoming) {
    return (
      <div className="course-card is-upcoming" aria-label={`${course.title} — Coming Soon`}>
        <div className="course-card-upcoming-body">
          <strong className="course-card-upcoming-title">{course.title}</strong>
          <span className="course-card-upcoming-badge">Coming Soon</span>
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/courses/$courseSlug"
      params={{ courseSlug: course.id }}
      className="course-card"
    >
      {course.cover && <img src={course.cover} alt={course.title} className="course-card-img" />}
      <div className="course-card-overlay">
        <span className="course-card-icon-wrap">
          <course.icon size={19} strokeWidth={2.4} />
        </span>
        <strong className="course-card-heading">{course.title}</strong>
        <span className="course-card-subheading">{course.short}</span>
      </div>
    </Link>
  )
}

function CoursesSection() {
  const { courses: displayCourses, isLoading } = useMergedCourses()

  if (!isLoading && displayCourses.length === 0) {
    return null
  }

  const gridCount = isLoading ? 6 : displayCourses.length

  return (
    <section className="courses-section" id="courses">
      <div className="home-row-header">
        <h2 className="home-row-title">Comprehensive Courses for Your Growth</h2>
        <p className="home-row-sub">Choose a structured program designed to build fluent, confident, and professional speech.</p>
      </div>

      <div
        className="course-grid"
        style={{ '--course-count': Math.max(1, gridCount) } as React.CSSProperties}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="course-card course-card-skeleton skeleton-shimmer-dark">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }} />
                  <div style={{ height: 16, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.22)' }} />
                  <div style={{ height: 12, width: '48%', borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
                </div>
              </div>
            ))
          : displayCourses.map(course => <CourseGridCard key={course.id} course={course} />)}
      </div>
    </section>
  )
}

const TRAINER_PILLAR_ICONS = [HeartHandshake, Mic2, Target, Sparkles]
const TRAINER_SPECIALIZATION_ICONS = [
  MessageCircle,
  BriefcaseBusiness,
  Mic2,
  Award,
  UsersRound,
  ShieldCheck,
]

function TrainerPortraitBox({
  name,
  photoUrl,
  imgClassName,
}: {
  name: string
  photoUrl?: string | null
  imgClassName: string
}) {
  const resolvedSrc = (photoUrl || '').trim() || api.trainer.DEFAULT_TRAINER_PHOTO_URL
  return (
    <img
      src={resolvedSrc}
      alt={`${name} - Master Communication Coach`}
      className={imgClassName}
      onError={e => {
        const target = e.currentTarget
        if (!target.src.endsWith(api.trainer.DEFAULT_TRAINER_PHOTO_URL)) {
          target.src = api.trainer.DEFAULT_TRAINER_PHOTO_URL
        }
      }}
    />
  )
}

function HomeTrainerSection({ onDemo }: { onDemo: () => void }) {
  const { data: loadedTrainerProfile, isLoading } = useTrainerProfileQuery()
  const showSkeleton = isLoading && !loadedTrainerProfile
  const trainerProfile = loadedTrainerProfile || api.trainer.DEFAULT_TRAINER_PROFILE
  const trainerStats = trainerProfile.stats || []

  if (showSkeleton) {
    return (
      <section className="home-row-section home-trainer-section" id="trainer-profile" aria-busy="true">
        <div className="home-row-header">
          <div className="skeleton-shimmer" style={{ height: 28, width: 250, borderRadius: 8 }} />
          <div className="skeleton-shimmer" style={{ height: 16, width: '60%', maxWidth: 460, borderRadius: 6, marginTop: 8 }} />
        </div>

        <div className="home-trainer-showcase">
          <div className="home-trainer-top-grid">
            <div className="home-trainer-photo-col">
              <div className="skeleton-shimmer" style={{ height: 340, width: '100%', maxWidth: 340, borderRadius: 20 }} />
            </div>
            <div className="home-trainer-info-col" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton-shimmer" style={{ height: 22, width: 170, borderRadius: 999 }} />
              <div className="skeleton-shimmer" style={{ height: 36, width: '58%', borderRadius: 8 }} />
              <div className="skeleton-shimmer" style={{ height: 18, width: '72%', borderRadius: 6 }} />
              <div className="skeleton-shimmer" style={{ height: 64, width: '100%', borderRadius: 12 }} />
              <div className="skeleton-shimmer" style={{ height: 76, width: '100%', borderRadius: 10 }} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="skeleton-shimmer" style={{ height: 30, width: 140, borderRadius: 999 }} />
                <div className="skeleton-shimmer" style={{ height: 30, width: 135, borderRadius: 999 }} />
                <div className="skeleton-shimmer" style={{ height: 30, width: 125, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <div className="skeleton-shimmer" style={{ height: 42, width: 195, borderRadius: 999 }} />
                <div className="skeleton-shimmer" style={{ height: 42, width: 175, borderRadius: 999 }} />
              </div>
            </div>
          </div>

          <div className="home-trainer-stats-row">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-trainer-stat-box" style={{ gap: 8 }}>
                <div className="skeleton-shimmer" style={{ height: 24, width: '48%', borderRadius: 6 }} />
                <div className="skeleton-shimmer" style={{ height: 14, width: '75%', borderRadius: 4 }} />
                <div className="skeleton-shimmer" style={{ height: 12, width: '90%', borderRadius: 4 }} />
              </div>
            ))}
          </div>

          <div className="home-trainer-story-block" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton-shimmer" style={{ height: 20, width: 180, borderRadius: 999 }} />
            <div className="skeleton-shimmer" style={{ height: 26, width: '70%', borderRadius: 6 }} />
            <div className="skeleton-shimmer" style={{ height: 16, width: '100%', borderRadius: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 16, width: '94%', borderRadius: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 16, width: '82%', borderRadius: 4 }} />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="home-row-section home-trainer-section" id="trainer-profile">
      <div className="home-row-header">
        <h2 className="home-row-title">{trainerProfile.hero_kicker || 'Meet Your Master Coach'}</h2>
        <p className="home-row-sub">
          Guided personally by {trainerProfile.name} — learn proven fluency frameworks, stage confidence, and practical mentorship.
        </p>
      </div>

      <div className="home-trainer-showcase">
        <div className="home-trainer-top-grid">
          <div className="home-trainer-photo-col">
            <div className="trainer-photo-card home-trainer-photo-card">
              <div className="trainer-photo-backdrop" />
              <TrainerPortraitBox
                name={trainerProfile.name}
                photoUrl={trainerProfile.photo_url}
                imgClassName="trainer-photo-img"
              />
              <div className="trainer-photo-overlay-badge">
                <Star size={17} className="star-fill" />
                <div>
                  <strong>{trainerProfile.experience_label}</strong>
                  <small>{trainerProfile.credential_label}</small>
                </div>
              </div>
              <div className="trainer-photo-floating-chip">
                <CheckCircle2 size={16} />
                <span>{trainerProfile.learners_label}</span>
              </div>
            </div>
          </div>

          <div className="home-trainer-info-col">
            <span className="section-kicker">{trainerProfile.hero_kicker || 'Meet Your Master Coach'}</span>
            <h3 className="home-trainer-name">{trainerProfile.name}</h3>
            <p className="trainer-title-sub">{trainerProfile.role_title}</p>

            {trainerProfile.quote && (
              <blockquote className="trainer-hero-quote">
                <Quote size={18} className="trainer-quote-icon" />
                <span>“{trainerProfile.quote}”</span>
              </blockquote>
            )}

            <div
              className="trainer-hero-lead trainer-hero-lead-rich"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trainerProfile.bio) }}
            />

            <div className="trainer-quick-chips">
              <span><BadgeCheck size={15} /> {trainerProfile.credential_label}</span>
              <span><Clock size={15} /> {trainerProfile.experience_label}</span>
              <span><UsersRound size={15} /> {trainerProfile.learners_label}</span>
              <span><Star size={15} /> {trainerProfile.rating_label}</span>
            </div>

            <div className="trainer-hero-actions">
              <button type="button" className="primary-button" onClick={onDemo}>
                <span>Book 1-on-1 Consultation</span>
                <MoveRight size={16} />
              </button>
              <Link to="/trainer" className="secondary-button">
                <span>View Full Trainer Profile</span>
                <MoveRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {trainerStats.length > 0 && (
          <div className="home-trainer-stats-row">
            {trainerStats.map((s, idx) => (
              <div className="home-trainer-stat-box" key={`${s.label}-${idx}`}>
                <strong>{s.number}</strong>
                <span>{s.label}</span>
                <small>{s.sub}</small>
              </div>
            ))}
          </div>
        )}

        {(trainerProfile.story_heading || trainerProfile.story_body) && (
          <div className="home-trainer-story-block">
            <span className="section-kicker">The Story Behind VERBORA</span>
            <h4>{trainerProfile.story_heading}</h4>
            <div
              className="trainer-story-text"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trainerProfile.story_body) }}
            />
          </div>
        )}
      </div>
    </section>
  )
}

const WHY_COMPARISONS = [
  {
    aspect: 'Speaking Time',
    typical: 'Crowded batches where you listen passively and speak for 2 minutes.',
    verbora: '1-on-1 live drills where you speak 80% of every session with instant fixes.',
  },
  {
    aspect: 'Thinking Process',
    typical: 'Mentally translating from Hindi or mother tongue mid-sentence.',
    verbora: 'PREP & STAR speech frameworks so ideas flow directly in English.',
  },
  {
    aspect: 'Between Classes',
    typical: 'No guidance once the video call ends until next week.',
    verbora: 'Daily WhatsApp voice-note critiques to wire clarity into daily habits.',
  },
  {
    aspect: 'Real Pressure',
    typical: 'Rehearsed textbook dialogues that fall apart in tough rooms.',
    verbora: 'Simulated client calls, interviews, and leadership Q&A pushback.',
  },
]

const WHY_PILLARS = [
  {
    num: '01',
    title: 'Safe, Judgment-Free Room',
    text: 'Hesitation vanishes when you have a dedicated mentor who corrects grammar and tone gently without classroom embarrassment.',
  },
  {
    num: '02',
    title: 'Vocal Authority & Clarity',
    text: 'Fluency is more than vocabulary. We refine pacing, strategic pauses, and word stress so colleagues listen the first time.',
  },
  {
    num: '03',
    title: 'Ready for Real Stakes',
    text: 'Train directly on your upcoming interviews, stakeholder updates, and client pitches rather than generic worksheets.',
  },
]

function WhySection({ onDemo }: { onDemo?: () => void } = {}) {
  return (
    <section className="home-row-section why-verbora-section" id="about">
      <div className="why-editorial-grid">
        <div className="why-editorial-lead">
          <span className="why-kicker">Why Verbora?</span>
          <h2 className="why-headline">
            You already know English grammar. <span>You just haven&apos;t trained the reflex to speak.</span>
          </h2>
          <p className="why-lead-copy">
            Most professionals read emails and understand meetings effortlessly — yet freeze, translate, or lose impact the moment all eyes turn to them. Verbora replaces passive rules with guided speaking mileage.
          </p>

          <div className="why-ratio-card" aria-label="Session practice breakdown: 80% active speaking and 20% practical frameworks">
            <div className="why-ratio-header">
              <span>Inside Every 1-on-1 Session</span>
              <strong>80% Speaking · 20% Frameworks</strong>
            </div>
            <div className="why-ratio-bar">
              <div className="why-ratio-fill" style={{ width: '80%' }} />
            </div>
            <div className="why-ratio-legend">
              <span>Live voice drills, interruptions &amp; feedback</span>
              <span>PREP / STAR structure</span>
            </div>
          </div>

          <div className="why-actions-row">
            {onDemo && (
              <button type="button" className="why-primary-btn" onClick={onDemo}>
                <span>Book Free 1-on-1 Assessment</span>
                <MoveRight size={16} strokeWidth={2.2} />
              </button>
            )}
            <Link className="why-secondary-link" to="/about">
              Explore our method
            </Link>
          </div>
        </div>

        <div className="why-compare-card">
          <div className="why-compare-top">
            <span className="why-compare-col-label muted">Typical Spoken Classes</span>
            <span className="why-compare-col-label brand">The VERBORA Method</span>
          </div>
          <div className="why-compare-list">
            {WHY_COMPARISONS.map(row => (
              <div className="why-compare-row" key={row.aspect}>
                <div className="why-compare-cell is-typical">
                  <X size={14} strokeWidth={2.3} aria-hidden="true" />
                  <div>
                    <span className="why-compare-tag">{row.aspect}</span>
                    <p>{row.typical}</p>
                  </div>
                </div>
                <div className="why-compare-cell is-verbora">
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  <div>
                    <span className="why-compare-tag">{row.aspect}</span>
                    <p>{row.verbora}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="why-pillars-strip">
        {WHY_PILLARS.map(pillar => (
          <div className="why-pillar-item" key={pillar.num}>
            <span className="why-pillar-num">{pillar.num}</span>
            <h3 className="why-pillar-title">{pillar.title}</h3>
            <p className="why-pillar-text">{pillar.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const placementCompanies = [
  {
    id: 'tcs',
    name: 'TCS',
    subtitle: 'Tata Consultancy Services',
    renderLogo: () => (
      <svg viewBox="0 0 110 34" className="placement-logo-svg" aria-hidden="true">
        <defs>
          <linearGradient id="tcsGrad" x1="0" y1="0" x2="110" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f4c9a" />
            <stop offset="55%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <text
          x="55"
          y="25"
          textAnchor="middle"
          fill="url(#tcsGrad)"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="26"
          fontWeight="900"
          letterSpacing="-1"
        >
          tcs
        </text>
      </svg>
    ),
  },
  {
    id: 'wipro',
    name: 'Wipro',
    subtitle: 'Technology & Consulting',
    renderLogo: () => (
      <svg viewBox="0 0 146 36" className="placement-logo-svg" aria-hidden="true">
        <circle cx="15" cy="11" r="2.3" fill="#0ea5e9" />
        <circle cx="22" cy="9" r="2.1" fill="#8b5cf6" />
        <circle cx="27" cy="14" r="2.2" fill="#ec4899" />
        <circle cx="25" cy="21" r="2.1" fill="#f59e0b" />
        <circle cx="18" cy="24" r="2.2" fill="#10b981" />
        <circle cx="12" cy="18" r="2.1" fill="#3b82f6" />
        <text
          x="36"
          y="25"
          fill="#0f2942"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="24"
          fontWeight="800"
          letterSpacing="-0.8"
        >
          wipro
        </text>
      </svg>
    ),
  },
  {
    id: 'infosys',
    name: 'Infosys',
    subtitle: 'Global Digital Services',
    renderLogo: () => (
      <svg viewBox="0 0 144 36" className="placement-logo-svg" aria-hidden="true">
        <text
          x="72"
          y="25"
          textAnchor="middle"
          fill="#007cc3"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="25"
          fontWeight="800"
          letterSpacing="-0.8"
        >
          Infosys
        </text>
      </svg>
    ),
  },
  {
    id: 'accenture',
    name: 'Accenture',
    subtitle: 'Strategy & Consulting',
    renderLogo: () => (
      <svg viewBox="0 0 164 38" className="placement-logo-svg" aria-hidden="true">
        <path
          d="M111 4L121 8.5L111 13"
          fill="none"
          stroke="#a100ff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="82"
          y="28"
          textAnchor="middle"
          fill="#111827"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="23"
          fontWeight="800"
          letterSpacing="-0.8"
        >
          accenture
        </text>
      </svg>
    ),
  },
  {
    id: 'genpact',
    name: 'Genpact',
    subtitle: 'Enterprise Operations',
    renderLogo: () => (
      <svg viewBox="0 0 154 36" className="placement-logo-svg" aria-hidden="true">
        <rect x="8" y="10" width="6" height="16" rx="2" fill="#f97316" />
        <rect x="16" y="14" width="6" height="12" rx="2" fill="#0f2942" />
        <text
          x="29"
          y="25"
          fill="#0f2942"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="23"
          fontWeight="800"
          letterSpacing="-0.7"
        >
          genpact
        </text>
      </svg>
    ),
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    subtitle: 'Audit, Tax & Advisory',
    renderLogo: () => (
      <svg viewBox="0 0 148 36" className="placement-logo-svg" aria-hidden="true">
        <text
          x="68"
          y="25"
          textAnchor="middle"
          fill="#111827"
          fontFamily="Manrope, 'DM Sans', sans-serif"
          fontSize="24"
          fontWeight="900"
          letterSpacing="-0.8"
        >
          Deloitte
        </text>
        <circle cx="121" cy="22.5" r="3.2" fill="#86bc25" />
      </svg>
    ),
  },
]

function PlacementsSection() {
  return (
    <section className="home-row-section placements-section" id="placements">
      <div className="home-row-header">
        <h2 className="home-row-title">Career Readiness for Leading Global Companies</h2>
        <p className="home-row-sub">
          Learners who complete our communication programs build the fluency and interview confidence needed to get hired and excel at top employers.
        </p>
      </div>

      <div className="placement-marquee-viewport" aria-label="Companies where VERBORA learners build careers">
        <div className="placement-marquee-track">
          {[0, 1].map(loopIdx => (
            <div
              key={loopIdx}
              className="placement-marquee-group"
              aria-hidden={loopIdx === 1}
            >
              {placementCompanies.map(company => (
                <div
                  key={`${loopIdx}-${company.id}`}
                  className="placement-logo-card"
                  title={company.name}
                >
                  {company.renderLogo()}
                  <span className="placement-logo-sub">{company.subtitle}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
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
    initialData: () => readCachedTestimonials(),
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.testimonials
    },
  })
}

export function useCoursesQuery() {
  return useQuery({
    queryKey: ['courses'],
    initialData: () => readCachedCourses(),
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.courses
    },
  })
}

export function useTrainerProfileQuery() {
  return useQuery({
    queryKey: ['trainer-profile'],
    initialData: () => readCachedTrainerProfile(),
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.trainerProfile
    },
  })
}

function normalizeExternalUrl(rawUrl?: string | null): string {
  const trimmed = (rawUrl || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function useContestConfigQuery(liveRefresh = false) {
  return useQuery({
    queryKey: liveRefresh ? ['contest-config', 'live'] : ['contest-config'],
    initialData: () => readCachedContestConfig(),
    initialDataUpdatedAt: 0,
    staleTime: liveRefresh ? 0 : 60_000,
    refetchOnMount: liveRefresh ? 'always' : false,
    refetchOnWindowFocus: liveRefresh,
    queryFn: async () => {
      if (liveRefresh) {
        const res = await api.contest.getContestConfig()
        const fresh = res.data || api.contest.DEFAULT_CONTEST_CONFIG
        writeCachedContestConfig(fresh)
        return fresh
      }
      const data = await api.home.getPublicHomeData()
      return data.contestConfig
    },
  })
}

function HomeContestSection() {
  const { data: loadedContest, isLoading } = useContestConfigQuery()
  const showSkeleton = isLoading && !loadedContest
  const contest = loadedContest || api.contest.DEFAULT_CONTEST_CONFIG

  if (showSkeleton) {
    return (
      <section className="home-row-section home-contest-section" id="contest" aria-busy="true">
        <div className="home-contest-card is-skeleton">
          <div className="home-contest-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="skeleton-shimmer-dark" style={{ height: 24, width: 170, borderRadius: 999 }} />
              <div className="skeleton-shimmer-dark" style={{ height: 38, width: '88%', borderRadius: 8 }} />
              <div className="skeleton-shimmer-dark" style={{ height: 42, width: '95%', borderRadius: 8 }} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="skeleton-shimmer-dark" style={{ height: 54, width: 170, borderRadius: 12 }} />
                <div className="skeleton-shimmer-dark" style={{ height: 54, width: 170, borderRadius: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="skeleton-shimmer-dark" style={{ height: 44, width: 175, borderRadius: 999 }} />
                <div className="skeleton-shimmer-dark" style={{ height: 44, width: 160, borderRadius: 999 }} />
              </div>
            </div>
            <div className="home-contest-steps-glass" style={{ gap: 12 }}>
              <div className="skeleton-shimmer-dark" style={{ height: 20, width: 150, borderRadius: 6 }} />
              <div className="skeleton-shimmer-dark" style={{ height: 54, width: '100%', borderRadius: 12 }} />
              <div className="skeleton-shimmer-dark" style={{ height: 54, width: '100%', borderRadius: 12 }} />
              <div className="skeleton-shimmer-dark" style={{ height: 54, width: '100%', borderRadius: 12 }} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!contest.is_active) return null

  const showHomePrizes = contest.show_prizes !== false && contest.prizes.length > 0
  const showHomeSteps = contest.show_steps !== false && contest.steps.length > 0

  return (
    <section className="home-row-section home-contest-section" id="contest">
      <div className="home-contest-card">
        <div className="home-contest-glow" aria-hidden="true" />
        <div className={`home-contest-grid ${showHomeSteps ? '' : 'is-single-col'}`}>
          <div className="home-contest-copy">
            <div className="home-contest-top-badges">
              <span className="home-contest-live-badge">
                <span className="home-contest-live-dot" aria-hidden="true" />
                <span>{contest.badge_text}</span>
              </span>
              <span className="home-contest-fee-pill">{contest.entry_fee_label}</span>
            </div>

            <h2 className="home-contest-title">{contest.title}</h2>
            <p className="home-contest-subtitle">{contest.subtitle}</p>

            {contest.topic && (
              <div className="home-contest-topic-box">
                <Mic2 size={16} />
                <div>
                  <span className="home-contest-topic-label">Speaking Topic</span>
                  <strong>{contest.topic}</strong>
                </div>
              </div>
            )}

            {showHomePrizes && (
              <div className="home-contest-prizes-row">
                {contest.prizes.slice(0, 3).map((prize, idx) => (
                  <div key={`${prize.rank}-${idx}`} className="home-contest-prize-chip">
                    <span className="home-contest-prize-rank">{prize.rank}</span>
                    <strong>{prize.title}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="home-contest-actions">
              <Link to="/contest" className="home-contest-cta-btn">
                <Trophy size={16} />
                <span>Enter Contest Now</span>
                <MoveRight size={16} />
              </Link>
              <Link to="/contest" className="home-contest-secondary-btn">
                <span>View Contest Details</span>
              </Link>
              <span className="home-contest-deadline">
                <Clock size={14} />
                <span>
                  {api.contest.formatContestSchedule(
                    contest.start_date,
                    contest.end_date,
                    contest.deadline_label
                  )}
                </span>
              </span>
            </div>
          </div>

          {showHomeSteps && (
            <div className="home-contest-steps-glass">
              <div className="home-contest-steps-head">
                <Sparkles size={15} />
                <span>How It Works</span>
              </div>
              <div className="home-contest-steps-list">
                {contest.steps.map((s, idx) => (
                  <div key={`${s.step}-${idx}`} className="home-contest-step-row">
                    <span className="home-contest-step-num">{s.step}</span>
                    <div>
                      <strong>{s.title}</strong>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function useMergedCourses() {
  const query = useCoursesQuery()
  const merged = useMemo(() => {
    if (Array.isArray(query.data)) {
      return query.data
        .filter(dynamic => dynamic.is_visible !== false)
        .map(dynamic => {
          const staticCourse = courses.find(c => c.id === dynamic.id)
          return {
            id: dynamic.id,
            title: dynamic.title || staticCourse?.title || dynamic.id,
            summary: dynamic.summary || staticCourse?.summary || '',
            tagline: dynamic.tagline || staticCourse?.tagline || '',
            short: dynamic.short || staticCourse?.short || '',
            icon: staticCourse?.icon || courseIconMap[dynamic.id] || BookOpen,
            iconClass: staticCourse?.iconClass || dynamic.iconClass || 'aqua',
            cover: dynamic.cover === undefined ? (staticCourse?.cover || '') : (dynamic.cover || ''),
            video: dynamic.video || staticCourse?.video || '',
            topics: staticCourse?.topics || dynamic.topics || [],
            fee_amount: dynamic.fee_amount ?? 4999,
            discount_percent: dynamic.discount_percent ?? 0,
            display_order: dynamic.display_order ?? 0,
            is_visible: dynamic.is_visible !== false,
            is_upcoming: Boolean(dynamic.is_upcoming),
          }
        })
    }

    return courses.map((staticCourse, index) => ({
      ...staticCourse,
      video: '',
      fee_amount: 4999,
      discount_percent: 0,
      display_order: index + 1,
      is_visible: true,
      is_upcoming: false,
    }))
  }, [query.data])

  return { ...query, courses: merged }
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
  const { courses: dynamicCourses } = useMergedCourses()
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
              {dynamicCourses.map(course => (
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
          <PlacementsSection />
          <HomeContestSection />
          <WhySection onDemo={showDemo} />
          <HomeTrainerSection onDemo={showDemo} />
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
  const { data: loadedTrainerProfile, isLoading } = useTrainerProfileQuery()
  const showTrainerSkeleton = isLoading && !loadedTrainerProfile
  const trainerProfile = loadedTrainerProfile || api.trainer.DEFAULT_TRAINER_PROFILE
  const showDemo = () => setModalOpen(true)
  const trainerFirstName = trainerProfile.name.trim().split(/\s+/)[0] || 'Coach'
  const stats = trainerProfile.stats || []

  const pillars = [
    {
      icon: TRAINER_PILLAR_ICONS[0],
      title: 'Hesitation Erasure & Psychological Ease',
      tag: 'Fear-Free Zone',
      desc: 'Most learners know grammar rules in their heads, but fear of judgment freezes their tongue. We first eliminate internal hesitation through psychological ease and patient speaking drills.',
    },
    {
      icon: TRAINER_PILLAR_ICONS[1],
      title: 'Vocal Modulation & Accent Clarity',
      tag: 'Diction & Delivery',
      desc: 'Master breath control, syllable stress, pitch variation, and natural pauses. Learn to project authority and sound engaging without putting on a fake accent.',
    },
    {
      icon: TRAINER_PILLAR_ICONS[2],
      title: 'Structured Thought-to-Speech Flow',
      tag: 'Stop Translating',
      desc: 'We train your brain to think directly in English using frameworks like PREP (Point, Reason, Example, Point) so you never run out of words during spontaneous discussions.',
    },
    {
      icon: TRAINER_PILLAR_ICONS[3],
      title: 'Real-World High-Stakes Simulations',
      tag: 'Practical Mastery',
      desc: 'Mock client demos, salary negotiations, leadership standups, and stage keynotes. Live scenario practice ensures you perform seamlessly when the stakes are real.',
    },
  ]

  const specializations = [
    {
      icon: TRAINER_SPECIALIZATION_ICONS[0],
      title: 'Spoken English & Fluency Acceleration',
      desc: 'Eliminating native language translation, filler words (um, ah, like), and pauses so your thoughts flow smoothly and effortlessly.',
    },
    {
      icon: TRAINER_SPECIALIZATION_ICONS[1],
      title: 'Executive Workplace Communication',
      desc: 'Mastering corporate diplomacy, team meetings, email clarity, client negotiations, and communicating with global stakeholders.',
    },
    {
      icon: TRAINER_SPECIALIZATION_ICONS[2],
      title: 'Public Speaking & Stage Presence',
      desc: 'Conquering stage fright, mastering microphone technique, purposeful stage movement, and captivating audiences of 5 to 500+ people.',
    },
    {
      icon: TRAINER_SPECIALIZATION_ICONS[3],
      title: 'Job Interview & Leadership Drills',
      desc: 'Behavioral STAR storytelling, cracking tricky situational questions, posture alignment, and negotiating top-bracket compensation.',
    },
    {
      icon: TRAINER_SPECIALIZATION_ICONS[4],
      title: 'Personality & Executive Presence',
      desc: 'Developing a commanding yet warm aura, confident eye contact, open body language, and professional charismatic demeanor.',
    },
    {
      icon: TRAINER_SPECIALIZATION_ICONS[5],
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
        {showTrainerSkeleton ? (
          <>
            <section className="trainer-hero" aria-busy="true">
              <div className="content-shell">
                <div className="trainer-hero-grid">
                  <div className="trainer-hero-copy" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="skeleton-shimmer" style={{ height: 24, width: 190, borderRadius: 999 }} />
                    <div className="skeleton-shimmer" style={{ height: 48, width: '65%', borderRadius: 10 }} />
                    <div className="skeleton-shimmer" style={{ height: 20, width: '78%', borderRadius: 6 }} />
                    <div className="skeleton-shimmer" style={{ height: 74, width: '100%', borderRadius: 12 }} />
                    <div className="skeleton-shimmer" style={{ height: 84, width: '100%', borderRadius: 10 }} />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div className="skeleton-shimmer" style={{ height: 32, width: 150, borderRadius: 999 }} />
                      <div className="skeleton-shimmer" style={{ height: 32, width: 140, borderRadius: 999 }} />
                      <div className="skeleton-shimmer" style={{ height: 32, width: 130, borderRadius: 999 }} />
                      <div className="skeleton-shimmer" style={{ height: 32, width: 110, borderRadius: 999 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <div className="skeleton-shimmer" style={{ height: 46, width: 215, borderRadius: 999 }} />
                      <div className="skeleton-shimmer" style={{ height: 46, width: 195, borderRadius: 999 }} />
                    </div>
                  </div>
                  <div className="trainer-photo-wrap">
                    <div className="skeleton-shimmer" style={{ height: 420, width: '100%', borderRadius: 24 }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="trainer-stats-strip">
              <div className="content-shell">
                <div className="trainer-stats-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="trainer-stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton-shimmer" style={{ height: 28, width: '50%', borderRadius: 6 }} />
                      <div className="skeleton-shimmer" style={{ height: 15, width: '72%', borderRadius: 4 }} />
                      <div className="skeleton-shimmer" style={{ height: 13, width: '88%', borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="content-shell">
              <section className="trainer-story-section">
                <div className="trainer-story-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skeleton-shimmer" style={{ height: 22, width: 200, borderRadius: 999 }} />
                  <div className="skeleton-shimmer" style={{ height: 34, width: '68%', borderRadius: 8 }} />
                  <div className="skeleton-shimmer" style={{ height: 16, width: '100%', borderRadius: 4 }} />
                  <div className="skeleton-shimmer" style={{ height: 16, width: '96%', borderRadius: 4 }} />
                  <div className="skeleton-shimmer" style={{ height: 16, width: '88%', borderRadius: 4 }} />
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            {/* 1. Hero Section */}
        <section className="trainer-hero">
          <div className="content-shell">
            <div className="trainer-hero-grid">
              {/* Left Column: Bio & Intro */}
              <div className="trainer-hero-copy">
                <span className="section-kicker">{trainerProfile.hero_kicker || 'Meet Your Master Coach'}</span>
                <h1>{trainerProfile.name}</h1>
                <p className="trainer-title-sub">{trainerProfile.role_title}</p>
                <blockquote className="trainer-hero-quote">
                  <Quote size={20} className="trainer-quote-icon" />
                  <span>“{trainerProfile.quote}”</span>
                </blockquote>
                <div
                  className="trainer-hero-lead trainer-hero-lead-rich"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trainerProfile.bio) }}
                />

                {/* Quick Credential Chips */}
                <div className="trainer-quick-chips">
                  <span><BadgeCheck size={16} /> {trainerProfile.credential_label}</span>
                  <span><Clock size={16} /> {trainerProfile.experience_label}</span>
                  <span><UsersRound size={16} /> {trainerProfile.learners_label}</span>
                  <span><Star size={16} /> {trainerProfile.rating_label}</span>
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
                  <TrainerPortraitBox
                    name={trainerProfile.name}
                    photoUrl={trainerProfile.photo_url}
                    imgClassName="trainer-photo-img"
                  />
                  <div className="trainer-photo-overlay-badge">
                    <Star size={17} className="star-fill" />
                    <div>
                      <strong>{trainerProfile.experience_label}</strong>
                      <small>{trainerProfile.credential_label}</small>
                    </div>
                  </div>
                  <div className="trainer-photo-floating-chip">
                    <CheckCircle2 size={16} />
                    <span>{trainerProfile.learners_label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Key Statistics Strip */}
        {stats.length > 0 && (
          <section className="trainer-stats-strip">
            <div className="content-shell">
              <div className="trainer-stats-grid">
                {stats.map((s, idx) => (
                  <div className="trainer-stat-card" key={`${s.label}-${idx}`}>
                    <strong>{s.number}</strong>
                    <span>{s.label}</span>
                    <small>{s.sub}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="content-shell">
          {/* 3. The Story & Vision Section */}
          <section className="trainer-story-section">
            <div className="trainer-story-card">
              <span className="section-kicker">The Story Behind VERBORA</span>
              <h2>{trainerProfile.story_heading}</h2>
              <div
                className="trainer-story-text"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(trainerProfile.story_body) }}
              />
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
              <h2>What You Can <span>Master With {trainerFirstName}</span></h2>
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
              <h2>What Students Say About <span>{trainerFirstName}</span></h2>
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
                  Book a free 1-on-1 speech diagnostic session directly with {trainerProfile.name}. Discuss your personal goals, receive immediate feedback, and map out your path to effortless fluency.
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
          </>
        )}
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
  const { courses: dynamicCourses } = useMergedCourses()
  const { data: trainerProfile = api.trainer.DEFAULT_TRAINER_PROFILE } = useTrainerProfileQuery()
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

  const courseTitles: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      '1-on-1-mentorship': '1-on-1 Master Mentorship',
    }
    for (const c of dynamicCourses) {
      map[c.id] = c.title
    }
    return map
  }, [dynamicCourses])

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
    if (form.phone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit WhatsApp / phone number.')
      return
    }
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

    // 2. Save to unified Supabase leads table
    try {
      const res = await api.leads.createLead({
        lead_type: 'contact-enquiry',
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        course: selectedCourseTitle,
        goal: selectedGoalTitle,
        message: form.message.trim() || 'Direct Enquiry: Book a Free 1-on-1 Diagnostic Call',
        source: 'contact-page',
        status: 'new',
      })
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
        queryClient.invalidateQueries({ queryKey: ['admin-lead-stats'] })
      }
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
                            {dynamicCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
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
                  Explore {trainerProfile.name}’s coaching experience, the 4-pillar speech methodology, verified student reviews, and global alumni achievements.
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
                <TrainerPortraitBox
                  name={trainerProfile.name}
                  photoUrl={trainerProfile.photo_url}
                  imgClassName="trainer-banner-img"
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
  const { courses: mergedCourses, isLoading } = useMergedCourses()
  const [modalOpen, setModalOpen] = useState(false)

  const course = useMemo(
    () => mergedCourses.find(entry => entry.id === courseSlug) || null,
    [mergedCourses, courseSlug]
  )

  if (isLoading) {
    return (
      <>
        <SiteHeader onDemo={() => setModalOpen(true)} />
        <main className="course-detail-page">
          <div className="course-detail-banner course-detail-banner-skeleton skeleton-shimmer">
            <div style={{ height: 20, width: 200, borderRadius: 4, background: '#cbd5e1' }} />
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#cbd5e1' }} />
            <div style={{ height: 36, width: 280, borderRadius: 6, background: '#cbd5e1' }} />
            <div style={{ height: 18, width: 340, borderRadius: 4, background: '#cbd5e1' }} />
            <div style={{ height: 84, width: 'min(560px, 100%)', borderRadius: 20, background: '#cbd5e1', marginTop: 8 }} />
          </div>
          <div className="course-detail-body-skeleton">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ height: 28, width: '60%', borderRadius: 6, background: '#e2e8f0' }} className="skeleton-shimmer" />
              <div style={{ height: 16, width: '100%', borderRadius: 4, background: '#e2e8f0' }} className="skeleton-shimmer" />
              <div style={{ height: 16, width: '90%', borderRadius: 4, background: '#e2e8f0' }} className="skeleton-shimmer" />
              <div style={{ height: 16, width: '80%', borderRadius: 4, background: '#e2e8f0' }} className="skeleton-shimmer" />
            </div>
            <div style={{ height: 200, borderRadius: 16, background: '#e2e8f0' }} className="skeleton-shimmer" />
          </div>
        </main>
        <SiteFooter onDemo={() => setModalOpen(true)} />
      </>
    )
  }

  if (!course) {
    return (
      <>
        <SiteHeader onDemo={() => setModalOpen(true)} />
        <main className="not-found">
          <h1>Course not found</h1>
          <p>We couldn't find that program.</p>
          <Link to="/" className="primary-button">Back to Home</Link>
        </main>
        <SiteFooter onDemo={() => setModalOpen(true)} />
        <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  const discountedPrice = Math.round(course.fee_amount * (1 - course.discount_percent / 100))

  return (
    <>
      <SiteHeader onDemo={() => setModalOpen(true)} />
      <main className="course-detail-page">
        <div className="course-detail-banner">
          <div className="detail-crumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <a href="/#courses">Courses</a>
            <span>/</span>
            <strong>{course.title}</strong>
          </div>
          <span className={`course-icon ${course.iconClass}`}>
            <course.icon size={38} />
          </span>
          <h1>{course.title}</h1>
          <p>{course.tagline}</p>

          {/* Dynamic Fees & Discount Card + CTA */}
          <div className="course-detail-price-box">
            <div className="course-detail-price-info">
              <div className="course-detail-price-meta">
                <span className="course-detail-price-label">Course Fee</span>
                {course.discount_percent > 0 && (
                  <span className="course-detail-discount-tag">
                    {course.discount_percent}% OFF
                  </span>
                )}
              </div>
              <div className="course-detail-price-row">
                <span className="course-detail-price-current">
                  ₹{discountedPrice.toLocaleString('en-IN')}
                </span>
                {course.discount_percent > 0 && (
                  <span className="course-detail-price-original">
                    ₹{course.fee_amount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {course.discount_percent > 0 && (
                <span className="course-detail-price-savings">
                  You save ₹{(course.fee_amount - discountedPrice).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <button
              type="button"
              className="primary-button course-detail-cta-btn"
              onClick={() => setModalOpen(true)}
            >
              <span>Book a Free Demo</span>
              <MoveRight size={16} />
            </button>
          </div>
        </div>

        {course.video && (
          <section className="course-detail-video-section" aria-label={`${course.title} preview video`}>
            <div className="course-detail-video-header">
              <span className="section-kicker">Program Preview</span>
              <h2>Watch what&apos;s inside <span>{course.title}</span></h2>
            </div>
            <div className="course-detail-video-frame">
              <video
                src={course.video}
                poster={course.cover || undefined}
                controls
                playsInline
                preload="metadata"
                className="course-detail-video-player"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </section>
        )}

        <div className="course-detail-body">
          <div>
            <span className="section-kicker">The Program</span>
            <h2>Find your voice. <span>Grow your confidence.</span></h2>
            <div
              className="course-detail-rich-text"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(course.summary) }}
            />
          </div>
          <div className="topic-card">
            <h3>What you'll work on</h3>
            {course.topics.map(topic => (
              <div key={topic}>
                <Check size={18} />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>

        {(() => {
          const otherCourses = mergedCourses.filter(entry => entry.id !== course.id)
          if (otherCourses.length === 0) return null
          return (
            <div className="detail-other">
              <h2>Explore more programs</h2>
              <div
                className="course-grid"
                style={{ '--course-count': otherCourses.length } as React.CSSProperties}
              >
                {otherCourses.map(entry => <CourseGridCard key={entry.id} course={entry} />)}
              </div>
            </div>
          )
        })()}
      </main>
      <SiteFooter onDemo={() => setModalOpen(true)} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} defaultCourse={course.id} />
    </>
  )
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

function ContestPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: loadedContest, isLoading } = useContestConfigQuery(true)
  const showSkeleton = isLoading && !loadedContest
  const contest = loadedContest || api.contest.DEFAULT_CONTEST_CONFIG
  const gmeetHref = normalizeExternalUrl(contest.gmeet_url)
  const hasRichDescription = Boolean(stripHtmlToText(contest.description).trim())
  const showContestPrizes = contest.show_prizes !== false && contest.prizes.length > 0
  const showContestSteps = contest.show_steps !== false && contest.steps.length > 0
  const scheduleDisplay = api.contest.formatContestSchedule(
    contest.start_date,
    contest.end_date,
    contest.deadline_label
  )

  const [entryForm, setEntryForm] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'Student / College Graduate',
    city_or_role: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submittedEntry, setSubmittedEntry] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const showDemo = () => setModalOpen(true)

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entryForm.name.trim() || !entryForm.phone.trim() || !entryForm.email.trim()) {
      setSubmitError('Please fill in your name, WhatsApp number, and email address.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await api.contest.submitContestEntry(entryForm)
      if (res.success && res.data) {
        setSubmittedEntry(entryForm.name.trim())
        setEntryForm({
          name: '',
          phone: '',
          email: '',
          category: 'Student / College Graduate',
          city_or_role: '',
          notes: '',
        })
      } else {
        setSubmitError(res.error || 'Could not complete registration. Please try again.')
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SiteHeader onDemo={showDemo} />
      <main className="contest-page">
        {showSkeleton ? (
          <section className="contest-hero-section" aria-busy="true">
            <div className="content-shell">
              <div className="contest-hero-skeleton">
                <div className="skeleton-shimmer" style={{ height: 26, width: 180, borderRadius: 999 }} />
                <div className="skeleton-shimmer" style={{ height: 48, width: '74%', borderRadius: 10 }} />
                <div className="skeleton-shimmer" style={{ height: 22, width: '62%', borderRadius: 6 }} />
                <div className="contest-page-grid" style={{ marginTop: 22 }}>
                  <div className="skeleton-shimmer" style={{ height: 340, borderRadius: 20 }} />
                  <div className="skeleton-shimmer" style={{ height: 340, borderRadius: 20 }} />
                </div>
              </div>
            </div>
          </section>
        ) : !contest.is_active ? (
          <section className="contest-closed-section">
            <div className="content-shell">
              <div className="contest-closed-card">
                <span className="section-kicker">VERBORA Contest</span>
                <h1>Next Speaking Challenge Coming Soon</h1>
                <p>
                  Registrations for the current round have closed. Explore our coaching programs or book a free 1-on-1 demo session to stay notified for the upcoming contest.
                </p>
                <div className="contest-closed-actions">
                  <button type="button" className="primary-button" onClick={showDemo}>
                    <span>Book Free Demo Session</span>
                    <MoveRight size={16} />
                  </button>
                  <Link to="/courses" className="secondary-button">
                    <span>Explore Courses</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="contest-hero-section">
              <div className="content-shell">
                <div className="contest-hero-banner">
                  <div className="contest-hero-badges">
                    <span className="home-contest-live-badge">
                      <span className="home-contest-live-dot" aria-hidden="true" />
                      <span>{contest.badge_text}</span>
                    </span>
                    <span className="home-contest-fee-pill">
                      <Clock size={13} /> {scheduleDisplay}
                    </span>
                  </div>
                  <h1>{contest.title}</h1>
                  <p className="contest-hero-sub">{contest.subtitle}</p>
                </div>
              </div>
            </section>

            <section className="contest-main-section">
              <div className="content-shell">
                <div className="contest-page-grid">
                  <div className="contest-info-col">
                    <div className="contest-block-card">
                      <div className="contest-details-strip">
                        {contest.topic && (
                          <div className="contest-detail-cell is-wide">
                            <span className="contest-detail-label">Speaking Topic</span>
                            <strong>{contest.topic}</strong>
                          </div>
                        )}
                        <div className="contest-detail-cell">
                          <span className="contest-detail-label">Contest Dates</span>
                          <strong>{scheduleDisplay}</strong>
                        </div>
                        <div className="contest-detail-cell">
                          <span className="contest-detail-label">Entry Fee</span>
                          <strong>{contest.entry_fee_label}</strong>
                        </div>
                        {gmeetHref && (
                          <div className="contest-detail-cell is-wide contest-detail-meet">
                            <div>
                              <span className="contest-detail-label">Live Google Meet Room</span>
                              <a
                                href={gmeetHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contest-gmeet-url-text"
                              >
                                {gmeetHref}
                              </a>
                            </div>
                            <a
                              href={gmeetHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="contest-meet-inline-btn"
                            >
                              <Video size={15} />
                              <span>Join Meet</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {hasRichDescription && (
                        <div className="contest-card-divider">
                          <h2 className="contest-section-title-sm">About the Challenge</h2>
                          <div
                            className="trainer-story-text"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(contest.description) }}
                          />
                        </div>
                      )}

                      {showContestPrizes && (
                        <div className="contest-card-divider">
                          <h2 className="contest-section-title-sm">Prizes & Recognition</h2>
                          <div className="contest-prizes-grid">
                            {contest.prizes.map((p, idx) => (
                              <div key={`${p.rank}-${idx}`} className="contest-prize-card">
                                <span className="contest-prize-badge">
                                  <Trophy size={13} /> {p.rank}
                                </span>
                                <h3>{p.title}</h3>
                                <p>{p.detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {(showContestSteps || contest.rules.length > 0) && (
                      <div className="contest-block-card">
                        {showContestSteps && (
                          <div>
                            <h2 className="contest-section-title-sm" style={{ marginTop: 0 }}>
                              How It Works
                            </h2>
                            <div className="contest-steps-3col">
                              {contest.steps.map((s, idx) => (
                                <div key={`${s.step}-${idx}`} className="contest-step-mini">
                                  <span className="trainer-step-num">{s.step}</span>
                                  <h3>{s.title}</h3>
                                  <p>{s.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {contest.rules.length > 0 && (
                          <div className={showContestSteps ? 'contest-card-divider' : ''}>
                            <h2 className="contest-section-title-sm">Eligibility & Guidelines</h2>
                            <ul className="contest-rules-list">
                              {contest.rules.map((rule, idx) => (
                                <li key={idx}>
                                  <CheckCircle2 size={16} className="contest-rule-check" />
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <aside className="contest-form-col">
                    <div className="contest-register-card">
                      {submittedEntry ? (
                        <div className="contest-register-success">
                          <div className="contest-success-icon">
                            <CheckCircle2 size={32} />
                          </div>
                          <h3>Registration Confirmed!</h3>
                          <p>
                            Thank you, <strong>{submittedEntry}</strong>! Your entry for{' '}
                            <strong>{contest.title}</strong> is recorded.
                            {gmeetHref
                              ? ' Join using the Google Meet button below at your slot time.'
                              : ' Session details will be sent shortly on WhatsApp and email.'}
                          </p>
                          {gmeetHref && (
                            <a
                              href={gmeetHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="primary-button"
                              style={{ width: '100%', justifyContent: 'center' }}
                            >
                              <Video size={17} />
                              <span>Join Google Meet</span>
                            </a>
                          )}
                          <a
                            href={`https://wa.me/919876543210?text=${encodeURIComponent(
                              `Hi VERBORA! I just registered for ${contest.title}. Name: ${submittedEntry}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={gmeetHref ? 'secondary-button' : 'primary-button'}
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            <MessageCircle size={17} />
                            <span>Confirm on WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setSubmittedEntry(null)}
                          >
                            Register Another Participant
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="contest-register-head">
                            <span className="contest-register-kicker">
                              Contest Registration
                            </span>
                            <h2>Reserve Your Spot</h2>
                            <p>Fill out your details to receive your speaking slot.</p>
                          </div>

                          {submitError && (
                            <div className="admin-error-box" style={{ marginBottom: 14 }}>
                              <AlertCircle size={16} />
                              <span>{submitError}</span>
                            </div>
                          )}

                          <form className="contest-register-form" onSubmit={handleSubmitEntry}>
                            <div className="contest-form-2col">
                              <div className="contact-field">
                                <label htmlFor="contest-name">Full Name *</label>
                                <input
                                  id="contest-name"
                                  type="text"
                                  required
                                  value={entryForm.name}
                                  onChange={e => setEntryForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Ananya Sharma"
                                />
                              </div>

                              <div className="contact-field">
                                <label htmlFor="contest-phone">WhatsApp Number *</label>
                                <input
                                  id="contest-phone"
                                  type="tel"
                                  required
                                  value={entryForm.phone}
                                  onChange={e => setEntryForm(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="+91 98765 43210"
                                />
                              </div>
                            </div>

                            <div className="contact-field">
                              <label htmlFor="contest-email">Email Address *</label>
                              <input
                                id="contest-email"
                                type="email"
                                required
                                value={entryForm.email}
                                onChange={e => setEntryForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="you@example.com"
                              />
                            </div>

                            <div className="contest-form-2col">
                              <div className="contact-field">
                                <label htmlFor="contest-category">Category *</label>
                                <select
                                  id="contest-category"
                                  value={entryForm.category}
                                  onChange={e => setEntryForm(prev => ({ ...prev, category: e.target.value }))}
                                >
                                  <option value="Student / College Graduate">Student / Graduate</option>
                                  <option value="Working Professional">Working Professional</option>
                                  <option value="Job Seeker">Job Seeker</option>
                                  <option value="Entrepreneur / Homemaker">Other / Entrepreneur</option>
                                </select>
                              </div>

                              <div className="contact-field">
                                <label htmlFor="contest-city">City / Role</label>
                                <input
                                  id="contest-city"
                                  type="text"
                                  value={entryForm.city_or_role}
                                  onChange={e => setEntryForm(prev => ({ ...prev, city_or_role: e.target.value }))}
                                  placeholder="Delhi / Engineer"
                                />
                              </div>
                            </div>

                            <div className="contact-field">
                              <label htmlFor="contest-notes">Goal (Optional)</label>
                              <input
                                id="contest-notes"
                                type="text"
                                value={entryForm.notes}
                                onChange={e => setEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Stage confidence, fluency, interviews..."
                              />
                            </div>

                            <button
                              type="submit"
                              className="primary-button"
                              disabled={submitting}
                              style={{ width: '100%', justifyContent: 'center' }}
                            >
                              <span>
                                {submitting ? 'Submitting Entry...' : 'Register Now'}
                              </span>
                              <MoveRight size={16} />
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter onDemo={showDemo} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function VerboraEduAdminPage({ defaultRoute }: { defaultRoute?: 'leads' | 'testimonials' | 'testimonials-add' | 'courses' | 'trainer' | 'contest' }) {
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

  const isContestRoute = pathname.includes('/contest') || defaultRoute === 'contest'
  const isTrainerRoute = pathname.includes('/trainer') || defaultRoute === 'trainer'
  const isCoursesRoute = pathname.includes('/courses') || defaultRoute === 'courses'
  const isTestimonialsRoute = isTestimonialsFormRoute || pathname.includes('/testimonials') || defaultRoute === 'testimonials'
  const activeSection: 'leads' | 'testimonials' | 'courses' | 'trainer' | 'contest' = isContestRoute
    ? 'contest'
    : isTrainerRoute
      ? 'trainer'
      : isCoursesRoute
        ? 'courses'
        : isTestimonialsRoute
          ? 'testimonials'
          : 'leads'

  // Determine base admin path (/verbora-edu-admin, /shivam-admin, /admin)
  const baseAdminPath = pathname.startsWith('/shivam-admin')
    ? '/shivam-admin'
    : pathname.startsWith('/admin')
      ? '/admin'
      : '/verbora-edu-admin'

  const leadsRoutePath = `${baseAdminPath}/leads`
  const testimonialsRoutePath = `${baseAdminPath}/testimonials`
  const addTestimonialRoutePath = `${baseAdminPath}/testimonials/add`
  const coursesRoutePath = `${baseAdminPath}/courses`
  const trainerRoutePath = `${baseAdminPath}/trainer`
  const contestRoutePath = `${baseAdminPath}/contest`

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Data states (backed by TanStack Query cache below)
  const [coursesDbError, setCoursesDbError] = useState<string | null>(() =>
    api.courses.getCoursesDbError()
  )
  const [trainerDbError, setTrainerDbError] = useState<string | null>(() =>
    api.trainer.getTrainerDbError()
  )
  const [trainerForm, setTrainerForm] = useState<{
    hero_kicker: string
    name: string
    role_title: string
    quote: string
    bio: string
    photo_url: string
    photo_size_bytes: number
    credential_label: string
    experience_label: string
    learners_label: string
    rating_label: string
    story_heading: string
    story_body: string
    stats: TrainerStatItem[]
  }>({
    hero_kicker: api.trainer.DEFAULT_TRAINER_PROFILE.hero_kicker,
    name: api.trainer.DEFAULT_TRAINER_PROFILE.name,
    role_title: api.trainer.DEFAULT_TRAINER_PROFILE.role_title,
    quote: api.trainer.DEFAULT_TRAINER_PROFILE.quote,
    bio: api.trainer.DEFAULT_TRAINER_PROFILE.bio,
    photo_url: api.trainer.DEFAULT_TRAINER_PROFILE.photo_url || '',
    photo_size_bytes: api.trainer.DEFAULT_TRAINER_PROFILE.photo_size_bytes || 0,
    credential_label: api.trainer.DEFAULT_TRAINER_PROFILE.credential_label,
    experience_label: api.trainer.DEFAULT_TRAINER_PROFILE.experience_label,
    learners_label: api.trainer.DEFAULT_TRAINER_PROFILE.learners_label,
    rating_label: api.trainer.DEFAULT_TRAINER_PROFILE.rating_label,
    story_heading: api.trainer.DEFAULT_TRAINER_PROFILE.story_heading,
    story_body: api.trainer.DEFAULT_TRAINER_PROFILE.story_body,
    stats: api.trainer.DEFAULT_TRAINER_PROFILE.stats,
  })
  const [savingTrainer, setSavingTrainer] = useState(false)
  const [trainerPhotoBusyMode, setTrainerPhotoBusyMode] = useState<'uploading' | 'removing' | null>(null)
  const [trainerPhotoError, setTrainerPhotoError] = useState<string | null>(null)
  const [contestDbError, setContestDbError] = useState<string | null>(() =>
    api.contest.getContestDbError()
  )
  const [contestEntriesDbError, setContestEntriesDbError] = useState<string | null>(() =>
    api.contest.getContestEntriesDbError()
  )
  const [contestForm, setContestForm] = useState<{
    is_active: boolean
    badge_text: string
    hero_pill_text: string
    title: string
    subtitle: string
    topic: string
    gmeet_url: string
    start_date: string
    end_date: string
    description: string
    deadline_label: string
    entry_fee_label: string
    show_prizes: boolean
    show_steps: boolean
    prizes: ContestPrizeItem[]
    steps: ContestStepItem[]
    rulesText: string
  }>({
    is_active: api.contest.DEFAULT_CONTEST_CONFIG.is_active,
    badge_text: api.contest.DEFAULT_CONTEST_CONFIG.badge_text,
    hero_pill_text: api.contest.DEFAULT_CONTEST_CONFIG.hero_pill_text,
    title: api.contest.DEFAULT_CONTEST_CONFIG.title,
    subtitle: api.contest.DEFAULT_CONTEST_CONFIG.subtitle,
    topic: api.contest.DEFAULT_CONTEST_CONFIG.topic,
    gmeet_url: api.contest.DEFAULT_CONTEST_CONFIG.gmeet_url,
    start_date: api.contest.DEFAULT_CONTEST_CONFIG.start_date,
    end_date: api.contest.DEFAULT_CONTEST_CONFIG.end_date,
    description: api.contest.DEFAULT_CONTEST_CONFIG.description,
    deadline_label: api.contest.DEFAULT_CONTEST_CONFIG.deadline_label,
    entry_fee_label: api.contest.DEFAULT_CONTEST_CONFIG.entry_fee_label,
    show_prizes: api.contest.DEFAULT_CONTEST_CONFIG.show_prizes,
    show_steps: api.contest.DEFAULT_CONTEST_CONFIG.show_steps,
    prizes: api.contest.DEFAULT_CONTEST_CONFIG.prizes,
    steps: api.contest.DEFAULT_CONTEST_CONFIG.steps,
    rulesText: api.contest.DEFAULT_CONTEST_CONFIG.rules.join('\n'),
  })
  const [savingContest, setSavingContest] = useState(false)
  const [contestSearch, setContestSearch] = useState('')
  const [pendingContestToggle, setPendingContestToggle] = useState<'start' | 'stop' | null>(null)
  const [leadsDbError, setLeadsDbError] = useState<string | null>(null)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState<{
    title: string
    summary: string
    tagline: string
    short: string
    cover: string
    cover_size_bytes: number
    video: string
    video_size_bytes: number
    fee_amount: number
    discount_percent: number
    is_visible: boolean
    is_upcoming: boolean
  }>({
    title: '',
    summary: '',
    tagline: '',
    short: '',
    cover: '',
    cover_size_bytes: 0,
    video: '',
    video_size_bytes: 0,
    fee_amount: 4999,
    discount_percent: 0,
    is_visible: true,
    is_upcoming: false,
  })
  const [savingCourse, setSavingCourse] = useState(false)
  const [courseCoverBusyMode, setCourseCoverBusyMode] = useState<'uploading' | 'removing' | null>(null)
  const uploadingCourseCover = courseCoverBusyMode !== null
  const [courseCoverError, setCourseCoverError] = useState<string | null>(null)
  const [courseVideoBusyMode, setCourseVideoBusyMode] = useState<'uploading' | 'removing' | null>(null)
  const uploadingCourseVideo = courseVideoBusyMode !== null
  const [courseVideoError, setCourseVideoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leadsPage, setLeadsPage] = useState(1)
  const [selectedLeadForDesc, setSelectedLeadForDesc] = useState<LeadSummary | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Testimonials filter & form state
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

  // Debounce search query and reset pagination when filters change
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setLeadsPage(1)
    }, 280)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setLeadsPage(1)
  }, [statusFilter])

  // Cached TanStack Query for Admin Testimonials & Courses across route switches
  const adminTestimonialsQuery = useQuery({
    queryKey: ['admin-testimonials'],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const res = await api.testimonials.getTestimonials()
      return res.data || []
    },
  })

  const adminCoursesQuery = useQuery({
    queryKey: ['admin-courses'],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const res = await api.courses.getCourses()
      setCoursesDbError(api.courses.getCoursesDbError())
      return res.data || []
    },
  })

  const adminTrainerQuery = useQuery({
    queryKey: ['admin-trainer-profile'],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const res = await api.trainer.getTrainerProfile()
      setTrainerDbError(api.trainer.getTrainerDbError())
      return res.data || api.trainer.DEFAULT_TRAINER_PROFILE
    },
  })

  const adminContestConfigQuery = useQuery({
    queryKey: ['admin-contest-config'],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const res = await api.contest.getContestConfig()
      setContestDbError(api.contest.getContestDbError())
      return res.data || api.contest.DEFAULT_CONTEST_CONFIG
    },
  })

  const adminContestEntriesQuery = useQuery({
    queryKey: ['admin-contest-entries'],
    enabled: isAuthenticated && activeSection === 'contest',
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const res = await api.contest.getContestEntries()
      setContestEntriesDbError(api.contest.getContestEntriesDbError())
      return res.data || []
    },
  })

  const testimonials = adminTestimonialsQuery.data || []
  const adminCourses = adminCoursesQuery.data || []
  const adminTrainerProfile = adminTrainerQuery.data || api.trainer.DEFAULT_TRAINER_PROFILE
  const contestEntries = adminContestEntriesQuery.data || []

  useEffect(() => {
    if (!adminContestConfigQuery.data) return
    const c = adminContestConfigQuery.data
    setContestForm({
      is_active: c.is_active,
      badge_text: c.badge_text,
      hero_pill_text: c.hero_pill_text,
      title: c.title,
      subtitle: c.subtitle,
      topic: c.topic,
      gmeet_url: c.gmeet_url,
      start_date: c.start_date,
      end_date: c.end_date,
      description: c.description,
      deadline_label: c.deadline_label,
      entry_fee_label: c.entry_fee_label,
      show_prizes: c.show_prizes,
      show_steps: c.show_steps,
      prizes: c.prizes,
      steps: c.steps,
      rulesText: (c.rules || []).join('\n'),
    })
  }, [adminContestConfigQuery.data])

  useEffect(() => {
    if (!adminTrainerQuery.data) return
    const p = adminTrainerQuery.data
    setTrainerForm({
      hero_kicker: p.hero_kicker,
      name: p.name,
      role_title: p.role_title,
      quote: p.quote,
      bio: p.bio,
      photo_url: p.photo_url || '',
      photo_size_bytes: p.photo_url ? (p.photo_size_bytes || 0) : 0,
      credential_label: p.credential_label,
      experience_label: p.experience_label,
      learners_label: p.learners_label,
      rating_label: p.rating_label,
      story_heading: p.story_heading,
      story_body: p.story_body,
      stats: p.stats,
    })
  }, [adminTrainerQuery.data])

  const setTestimonials = (
    updater: Testimonial[] | ((prev: Testimonial[]) => Testimonial[])
  ) => {
    queryClient.setQueryData<Testimonial[]>(['admin-testimonials'], old => {
      const current = old || []
      return typeof updater === 'function' ? updater(current) : updater
    })
  }

  const setAdminCourses = (updater: Course[] | ((prev: Course[]) => Course[])) => {
    queryClient.setQueryData<Course[]>(['admin-courses'], old => {
      const current = old || []
      return typeof updater === 'function' ? updater(current) : updater
    })
  }

  // Cached TanStack Query for paginated leads (only table columns, 20 per page)
  const leadsQuery = useQuery({
    queryKey: ['admin-leads', leadsPage, debouncedSearch, statusFilter],
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await api.leads.getLeadsPage({
        page: leadsPage,
        pageSize: api.leads.LEADS_PAGE_SIZE,
        search: debouncedSearch,
        status: statusFilter,
      })
      if (!res.success && res.error) {
        setLeadsDbError(res.error)
      } else {
        setLeadsDbError(null)
      }
      return (
        res.data || {
          items: [],
          totalCount: 0,
          page: leadsPage,
          pageSize: api.leads.LEADS_PAGE_SIZE,
        }
      )
    },
  })

  // Cached TanStack Query for lightweight KPI stats (zero-row-payload counts)
  const leadStatsQuery = useQuery({
    queryKey: ['admin-lead-stats'],
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await api.leads.getLeadStats()
      return (
        res.data || {
          totalLeads: 0,
          totalBookings: 0,
          totalContacts: 0,
          newLeadsCount: 0,
          newBookingsCount: 0,
          newContactsCount: 0,
          contactedLeadsCount: 0,
          leadActionRate: 0,
        }
      )
    },
  })

  // Cached TanStack Query for single lead description (fetched ONLY when clicking View Description)
  const leadDetailQuery = useQuery({
    queryKey: ['admin-lead-detail', selectedLeadForDesc?.id],
    enabled: isAuthenticated && !!selectedLeadForDesc?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!selectedLeadForDesc) return null
      const res = await api.leads.getLeadDetails(selectedLeadForDesc.id)
      return res.data
    },
  })

  const paginatedLeads = leadsQuery.data?.items || []
  const totalFilteredLeads = leadsQuery.data?.totalCount ?? 0
  const totalLeadPages = Math.max(1, Math.ceil(totalFilteredLeads / api.leads.LEADS_PAGE_SIZE))
  const isLeadsTableLoading = leadsQuery.isLoading || (leadsQuery.isFetching && paginatedLeads.length === 0)

  useEffect(() => {
    if (leadsPage > totalLeadPages) {
      setLeadsPage(totalLeadPages)
    }
  }, [leadsPage, totalLeadPages])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-lead-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-trainer-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['trainer-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-contest-config'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-contest-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['contest-config'] }),
      ])
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const syncPublicHomeCache = () => {
    clearHomeCache()
    void api.home.getPublicHomeData(true).then(fresh => {
      queryClient.setQueryData(['courses'], fresh.courses)
      queryClient.setQueryData(['testimonials'], fresh.testimonials)
      queryClient.setQueryData(['trainer-profile'], fresh.trainerProfile)
      queryClient.setQueryData(['contest-config'], fresh.contestConfig)
    })
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setCourseCoverError(null)
    setCourseVideoError(null)
    setCourseForm({
      title: course.title,
      summary: course.summary,
      tagline: course.tagline,
      short: course.short,
      cover: course.cover || '',
      cover_size_bytes: course.cover ? (course.cover_size_bytes || 0) : 0,
      video: course.video || '',
      video_size_bytes: course.video ? (course.video_size_bytes || 0) : 0,
      fee_amount: course.fee_amount,
      discount_percent: course.discount_percent,
      is_visible: course.is_visible !== false,
      is_upcoming: Boolean(course.is_upcoming),
    })
  }

  const handleUploadCourseCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editingCourse) return

    const netUsedBytes = Math.max(0, totalUsedStorageBytes - (editingCourse.cover_size_bytes || 0))
    const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - netUsedBytes)

    setCourseCoverBusyMode('uploading')
    setCourseCoverError(null)
    const unsavedDraftCover =
      courseForm.cover && courseForm.cover !== editingCourse.cover ? courseForm.cover : null

    try {
      saveUploadPreset(customPreset)
      const result = await uploadImageToCloudinary(
        file,
        customPreset,
        'verbora/courses',
        remainingBytes
      )
      if (result.url) {
        if (unsavedDraftCover && unsavedDraftCover.includes('cloudinary.com')) {
          deleteMediaFromCloudinary(unsavedDraftCover, 'image').catch(() => {})
        }
        setCourseForm(prev => ({
          ...prev,
          cover: result.url!,
          cover_size_bytes: result.bytes || file.size,
        }))
        showToast('Course cover image uploaded!')
      } else {
        setCourseCoverError(result.error || 'Failed to upload cover image.')
      }
    } catch (err: any) {
      setCourseCoverError(err?.message || 'Error uploading cover image.')
    } finally {
      setCourseCoverBusyMode(null)
    }
  }

  const handleRemoveCourseCover = async () => {
    if (!editingCourse) return
    const currentFormCover = courseForm.cover
    const dbCover = editingCourse.cover
    if (!currentFormCover && !dbCover) return
    if (!window.confirm(`Remove cover image from "${editingCourse.title}"? This will also delete it from Cloudinary.`)) {
      return
    }

    setCourseCoverBusyMode('removing')
    setCourseCoverError(null)
    try {
      const urlsToDestroy = Array.from(
        new Set(
          [currentFormCover, dbCover].filter(
            (u): u is string => Boolean(u && u.includes('cloudinary.com'))
          )
        )
      )

      const [res] = await Promise.all([
        api.courses.updateCourse(editingCourse.id, {
          cover: '',
          cover_size_bytes: 0,
        }),
        ...urlsToDestroy.map(u => deleteMediaFromCloudinary(u, 'image').catch(() => null)),
      ])
      setCoursesDbError(api.courses.getCoursesDbError())

      if (res.success && res.data) {
        setEditingCourse(res.data)
        setCourseForm(prev => ({ ...prev, cover: '', cover_size_bytes: 0 }))
        setAdminCourses(prev => prev.map(c => (c.id === editingCourse.id ? res.data! : c)))
        syncPublicHomeCache()
        showToast(`Cover image removed from "${editingCourse.title}"!`)
      } else {
        setCourseCoverError(res.error || 'Failed to clear course image in database.')
      }
    } catch (err: any) {
      setCourseCoverError(err?.message || 'Failed to remove course image.')
    } finally {
      setCourseCoverBusyMode(null)
    }
  }

  const handleUploadCourseVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editingCourse) return

    const netUsedBytes = Math.max(0, totalUsedStorageBytes - (editingCourse.video_size_bytes || 0))
    setCourseVideoBusyMode('uploading')
    setCourseVideoError(null)
    const unsavedDraftVideo =
      courseForm.video && courseForm.video !== editingCourse.video ? courseForm.video : null

    try {
      saveUploadPreset(customPreset)
      const result = await uploadVideoToCloudinary(
        file,
        netUsedBytes,
        customPreset,
        'verbora/courses/videos'
      )
      if (result.url) {
        if (unsavedDraftVideo && unsavedDraftVideo.includes('cloudinary.com')) {
          deleteMediaFromCloudinary(unsavedDraftVideo, 'video').catch(() => {})
        }
        setCourseForm(prev => ({
          ...prev,
          video: result.url!,
          video_size_bytes: result.bytes || file.size,
        }))
        showToast('Course video uploaded! Click Save Course Changes to publish.')
      } else {
        setCourseVideoError(result.error || 'Failed to upload course video.')
      }
    } catch (err: any) {
      setCourseVideoError(err?.message || 'Error uploading course video.')
    } finally {
      setCourseVideoBusyMode(null)
    }
  }

  const handleRemoveCourseVideo = async () => {
    if (!editingCourse) return
    const currentFormVideo = courseForm.video
    const dbVideo = editingCourse.video
    if (!currentFormVideo && !dbVideo) return
    if (!window.confirm(`Remove attached video from "${editingCourse.title}"? This will also delete it from Cloudinary.`)) {
      return
    }

    setCourseVideoBusyMode('removing')
    setCourseVideoError(null)
    try {
      const urlsToDestroy = Array.from(
        new Set(
          [currentFormVideo, dbVideo].filter(
            (u): u is string => Boolean(u && u.includes('cloudinary.com'))
          )
        )
      )

      const [res] = await Promise.all([
        api.courses.updateCourse(editingCourse.id, {
          video: '',
          video_size_bytes: 0,
        }),
        ...urlsToDestroy.map(u => deleteMediaFromCloudinary(u, 'video').catch(() => null)),
      ])
      setCoursesDbError(api.courses.getCoursesDbError())

      if (res.success && res.data) {
        setEditingCourse(res.data)
        setCourseForm(prev => ({ ...prev, video: '', video_size_bytes: 0 }))
        setAdminCourses(prev => prev.map(c => (c.id === editingCourse.id ? res.data! : c)))
        syncPublicHomeCache()
        showToast(`Video removed from "${editingCourse.title}"!`)
      } else {
        setCourseVideoError(res.error || 'Failed to clear course video in database.')
      }
    } catch (err: any) {
      setCourseVideoError(err?.message || 'Failed to remove course video.')
    } finally {
      setCourseVideoBusyMode(null)
    }
  }

  const handleUploadTrainerPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const netUsedBytes = Math.max(0, totalUsedStorageBytes - (adminTrainerProfile.photo_size_bytes || 0))
    const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - netUsedBytes)

    setTrainerPhotoBusyMode('uploading')
    setTrainerPhotoError(null)
    const unsavedDraftPhoto =
      trainerForm.photo_url && trainerForm.photo_url !== adminTrainerProfile.photo_url
        ? trainerForm.photo_url
        : null

    try {
      saveUploadPreset(customPreset)
      const result = await uploadImageToCloudinary(
        file,
        customPreset,
        'verbora/trainer',
        remainingBytes
      )
      if (result.url) {
        if (unsavedDraftPhoto && unsavedDraftPhoto.includes('cloudinary.com')) {
          deleteMediaFromCloudinary(unsavedDraftPhoto, 'image').catch(() => {})
        }
        setTrainerForm(prev => ({
          ...prev,
          photo_url: result.url!,
          photo_size_bytes: result.bytes || file.size,
        }))
        showToast('Trainer photo uploaded! Click Save Trainer Profile to publish.')
      } else {
        setTrainerPhotoError(result.error || 'Failed to upload trainer photo.')
      }
    } catch (err: any) {
      setTrainerPhotoError(err?.message || 'Error uploading trainer photo.')
    } finally {
      setTrainerPhotoBusyMode(null)
    }
  }

  const handleRemoveTrainerPhoto = async () => {
    const currentFormPhoto = trainerForm.photo_url
    const dbPhoto = adminTrainerProfile.photo_url
    if (!currentFormPhoto && !dbPhoto) return
    if (!window.confirm('Remove the trainer profile photo? Any Cloudinary copy will also be deleted.')) {
      return
    }

    setTrainerPhotoBusyMode('removing')
    setTrainerPhotoError(null)
    try {
      const urlsToDestroy = Array.from(
        new Set(
          [currentFormPhoto, dbPhoto].filter(
            (u): u is string => Boolean(u && u.includes('cloudinary.com'))
          )
        )
      )

      const [res] = await Promise.all([
        api.trainer.updateTrainerProfile({
          photo_url: api.trainer.DEFAULT_TRAINER_PHOTO_URL,
          photo_size_bytes: 0,
        }),
        ...urlsToDestroy.map(u => deleteMediaFromCloudinary(u, 'image').catch(() => null)),
      ])
      setTrainerDbError(api.trainer.getTrainerDbError())

      if (res.success && res.data) {
        writeCachedTrainerProfile(res.data)
        queryClient.setQueryData(['admin-trainer-profile'], res.data)
        queryClient.setQueryData(['trainer-profile'], res.data)
        syncPublicHomeCache()
        setTrainerForm(prev => ({
          ...prev,
          photo_url: res.data!.photo_url || api.trainer.DEFAULT_TRAINER_PHOTO_URL,
          photo_size_bytes: 0,
        }))
        showToast('Custom photo removed. Restored default local portrait!')
      } else {
        setTrainerPhotoError(res.error || 'Failed to reset trainer photo in database.')
      }
    } catch (err: any) {
      setTrainerPhotoError(err?.message || 'Failed to remove trainer photo.')
    } finally {
      setTrainerPhotoBusyMode(null)
    }
  }

  const handleSaveTrainerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trainerForm.name.trim()) {
      alert('Trainer name cannot be empty.')
      return
    }
    if (!trainerForm.role_title.trim()) {
      alert('Role title cannot be empty.')
      return
    }
    if (!stripHtmlToText(trainerForm.bio).trim()) {
      alert('Trainer bio cannot be empty.')
      return
    }

    setSavingTrainer(true)
    const previousPhoto = adminTrainerProfile.photo_url
    try {
      const cleanPhotoUrl = trainerForm.photo_url.trim()
      const res = await api.trainer.updateTrainerProfile({
        hero_kicker: trainerForm.hero_kicker.trim(),
        name: trainerForm.name.trim(),
        role_title: trainerForm.role_title.trim(),
        quote: trainerForm.quote.trim(),
        bio: trainerForm.bio.trim(),
        photo_url: cleanPhotoUrl,
        photo_size_bytes: cleanPhotoUrl ? trainerForm.photo_size_bytes : 0,
        credential_label: trainerForm.credential_label.trim(),
        experience_label: trainerForm.experience_label.trim(),
        learners_label: trainerForm.learners_label.trim(),
        rating_label: trainerForm.rating_label.trim(),
        story_heading: trainerForm.story_heading.trim(),
        story_body: trainerForm.story_body.trim(),
        stats: trainerForm.stats,
      })
      setTrainerDbError(api.trainer.getTrainerDbError())

      if (res.success && res.data) {
        if (
          previousPhoto &&
          previousPhoto !== res.data.photo_url &&
          previousPhoto.includes('cloudinary.com')
        ) {
          deleteMediaFromCloudinary(previousPhoto, 'image').catch(() => {})
        }
        writeCachedTrainerProfile(res.data)
        queryClient.setQueryData(['admin-trainer-profile'], res.data)
        queryClient.setQueryData(['trainer-profile'], res.data)
        syncPublicHomeCache()
        showToast('Trainer profile updated successfully!')
      } else {
        alert(`Error saving trainer profile: ${res.error || 'Could not save changes to Supabase.'}`)
      }
    } catch (err: any) {
      alert(`Error saving trainer profile: ${err?.message || 'Unknown error'}`)
    } finally {
      setSavingTrainer(false)
    }
  }

  const handleConfirmToggleContestActive = async () => {
    if (!pendingContestToggle) return
    const nextActive = pendingContestToggle === 'start'
    setSavingContest(true)
    setContestForm(prev => ({ ...prev, is_active: nextActive }))
    try {
      const res = await api.contest.updateContestConfig({ is_active: nextActive })
      setContestDbError(api.contest.getContestDbError())
      if (res.success && res.data) {
        writeCachedContestConfig(res.data)
        queryClient.setQueryData(['admin-contest-config'], res.data)
        queryClient.setQueryData(['contest-config'], res.data)
        queryClient.setQueryData(['contest-config', 'live'], res.data)
        syncPublicHomeCache()
        setPendingContestToggle(null)
        showToast(nextActive ? 'Contest started.' : 'Contest stopped.')
      } else {
        setContestForm(prev => ({ ...prev, is_active: !nextActive }))
        alert(`Failed to update contest status: ${res.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setContestForm(prev => ({ ...prev, is_active: !nextActive }))
      alert(`Failed to update contest status: ${err?.message || 'Unknown error'}`)
    } finally {
      setSavingContest(false)
    }
  }

  const handleSaveContestConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contestForm.title.trim()) {
      alert('Contest title cannot be empty.')
      return
    }
    setSavingContest(true)
    try {
      const rules = contestForm.rulesText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

      const res = await api.contest.updateContestConfig({
        is_active: contestForm.is_active,
        badge_text: contestForm.badge_text.trim(),
        hero_pill_text: contestForm.hero_pill_text.trim(),
        title: contestForm.title.trim(),
        subtitle: contestForm.subtitle.trim(),
        topic: contestForm.topic.trim(),
        gmeet_url: contestForm.gmeet_url.trim(),
        start_date: contestForm.start_date.trim(),
        end_date: contestForm.end_date.trim(),
        description: contestForm.description.trim(),
        deadline_label: contestForm.deadline_label.trim(),
        entry_fee_label: contestForm.entry_fee_label.trim(),
        show_prizes: contestForm.show_prizes,
        show_steps: contestForm.show_steps,
        prizes: contestForm.prizes,
        steps: contestForm.steps,
        rules,
      })
      setContestDbError(api.contest.getContestDbError())
      if (res.success && res.data) {
        writeCachedContestConfig(res.data)
        queryClient.setQueryData(['admin-contest-config'], res.data)
        queryClient.setQueryData(['contest-config'], res.data)
        queryClient.setQueryData(['contest-config', 'live'], res.data)
        syncPublicHomeCache()
        showToast('Contest settings saved and published!')
      } else {
        alert(`Error saving contest settings: ${res.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error saving contest: ${err?.message || 'Unknown error'}`)
    } finally {
      setSavingContest(false)
    }
  }

  const handleDeleteContestEntry = async (id: string, name: string) => {
    if (!window.confirm(`Delete contest registration from "${name}"?`)) return
    const res = await api.contest.deleteContestEntry(id)
    if (res.success) {
      queryClient.setQueryData<typeof contestEntries>(['admin-contest-entries'], old =>
        (old || []).filter(item => item.id !== id)
      )
      showToast(`Removed entry for "${name}".`)
    }
  }

  const handleExportContestCsv = () => {
    const headers = ['Date', 'Name', 'Phone', 'Email', 'Category', 'City / Role', 'Notes']
    const rows = contestEntries.map(entry => [
      `"${new Date(entry.created_at).toLocaleString()}"`,
      `"${entry.name}"`,
      `"${entry.phone}"`,
      `"${entry.email}"`,
      `"${entry.category}"`,
      `"${(entry.city_or_role || '').replace(/"/g, '""')}"`,
      `"${(entry.notes || '').replace(/"/g, '""')}"`,
    ])
    downloadCSV(`verbora-contest-entries-${new Date().toISOString().split('T')[0]}.csv`, [
      headers,
      ...rows,
    ])
  }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    if (!courseForm.title.trim()) {
      alert('Course name cannot be empty.')
      return
    }
    if (!stripHtmlToText(courseForm.summary).trim()) {
      alert('Course description cannot be empty.')
      return
    }
    setSavingCourse(true)
    const previousCover = editingCourse.cover
    const previousVideo = editingCourse.video
    try {
      const res = await api.courses.updateCourse(editingCourse.id, {
        title: courseForm.title,
        summary: courseForm.summary,
        tagline: courseForm.tagline,
        short: courseForm.short,
        cover: courseForm.cover.trim(),
        cover_size_bytes: courseForm.cover.trim() ? courseForm.cover_size_bytes : 0,
        video: courseForm.video.trim(),
        video_size_bytes: courseForm.video.trim() ? courseForm.video_size_bytes : 0,
        fee_amount: courseForm.fee_amount,
        discount_percent: courseForm.discount_percent,
        is_visible: courseForm.is_visible,
        is_upcoming: courseForm.is_upcoming,
      })
      setCoursesDbError(api.courses.getCoursesDbError())

      if (res.success && res.data) {
        if (
          previousCover &&
          previousCover !== res.data.cover &&
          previousCover.includes('cloudinary.com')
        ) {
          deleteMediaFromCloudinary(previousCover, 'image').catch(() => {})
        }
        if (
          previousVideo &&
          previousVideo !== res.data.video &&
          previousVideo.includes('cloudinary.com')
        ) {
          deleteMediaFromCloudinary(previousVideo, 'video').catch(() => {})
        }
        setAdminCourses(prev =>
          prev.map(c => (c.id === editingCourse.id ? res.data! : c))
        )
        syncPublicHomeCache()
        const updatedTitle = res.data.title
        setEditingCourse(null)
        showToast(`Course "${updatedTitle}" updated successfully!`)
      } else {
        alert(`Error saving course: ${res.error || 'Could not save changes to Supabase.'}`)
      }
    } catch (err: any) {
      alert(`Error saving course: ${err.message || 'Unknown error'}`)
    } finally {
      setSavingCourse(false)
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
      syncPublicHomeCache()
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
      syncPublicHomeCache()
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
      syncPublicHomeCache()
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
      syncPublicHomeCache()
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
          syncPublicHomeCache()
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
          syncPublicHomeCache()
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

  // Status Handlers
  const handleUpdateLeadStatus = async (
    id: string,
    newStatus: LeadStatus,
    currentStatus?: LeadStatus
  ) => {
    if (newStatus === 'new' && currentStatus !== 'new') {
      showToast('Once changed, a lead cannot be reassigned back to New Lead.')
      return
    }
    setUpdatingId(id)
    const res = await api.leads.updateLeadStatus(id, newStatus)
    if (res.success) {
      queryClient.setQueryData<LeadsPageResult>(
        ['admin-leads', leadsPage, debouncedSearch, statusFilter],
        old =>
          old
            ? {
                ...old,
                items: old.items.map(l => (l.id === id ? { ...l, status: newStatus } : l)),
              }
            : old
      )
      queryClient.setQueryData<Lead | null>(['admin-lead-detail', id], old =>
        old ? { ...old, status: newStatus } : old
      )
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lead-stats'] })
      showToast(`Lead status updated to "${newStatus}"`)
    } else if (res.error) {
      showToast(res.error)
    }
    setUpdatingId(null)
  }

  const handleDeleteLead = async (id: string, name: string) => {
    if (!window.confirm(`Delete lead entry for "${name}"?`)) return
    setUpdatingId(id)
    const res = await api.leads.deleteLead(id)
    if (res.success) {
      queryClient.setQueryData<LeadsPageResult>(
        ['admin-leads', leadsPage, debouncedSearch, statusFilter],
        old =>
          old
            ? {
                ...old,
                items: old.items.filter(l => l.id !== id),
                totalCount: Math.max(0, old.totalCount - 1),
              }
            : old
      )
      queryClient.removeQueries({ queryKey: ['admin-lead-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lead-stats'] })
      if (selectedLeadForDesc?.id === id) setSelectedLeadForDesc(null)
      showToast(`Lead for "${name}" deleted.`)
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

  // KPI Metrics from cached zero-row-payload stats query
  const leadStats: LeadStats = leadStatsQuery.data || {
    totalLeads: 0,
    totalBookings: 0,
    totalContacts: 0,
    newLeadsCount: 0,
    newBookingsCount: 0,
    newContactsCount: 0,
    contactedLeadsCount: 0,
    leadActionRate: 0,
  }
  const {
    totalLeads,
    totalBookings,
    totalContacts,
    newLeadsCount,
    newBookingsCount,
    newContactsCount: unreadContactsCount,
    contactedLeadsCount,
    leadActionRate,
  } = leadStats

  // Calculate Testimonials Metrics & Storage Usage
  const totalTestimonials = testimonials.length
  const activeTestimonialsCount = testimonials.filter(t => t.is_active).length
  const hiddenTestimonialsCount = totalTestimonials - activeTestimonialsCount
  const videoTestimonialsCount = testimonials.filter(t => !!t.video).length

  const testimonialStorageBytes = testimonials.reduce((acc, t) => {
    let bytes = 0
    if (t.video_size_bytes) bytes += t.video_size_bytes
    if (t.image_size_bytes) bytes += t.image_size_bytes
    return acc + bytes
  }, 0)

  const courseStorageBytes = adminCourses.reduce((acc, c) => {
    let bytes = 0
    if (c.cover && c.cover.includes('cloudinary.com')) {
      bytes += c.cover_size_bytes || 0
    }
    if (c.video && c.video.includes('cloudinary.com')) {
      bytes += c.video_size_bytes || 0
    }
    return acc + bytes
  }, 0)

  const trainerStorageBytes =
    adminTrainerProfile.photo_url && adminTrainerProfile.photo_url.includes('cloudinary.com')
      ? adminTrainerProfile.photo_size_bytes || 0
      : 0

  const totalUsedStorageBytes = testimonialStorageBytes + courseStorageBytes + trainerStorageBytes

  const usedStorageMB = (totalUsedStorageBytes / (1024 * 1024)).toFixed(1)
  const maxStorageMB = MAX_STORAGE_MB
  const storageUsagePercent = Math.min(100, Math.round((totalUsedStorageBytes / MAX_STORAGE_BYTES) * 100))
  const isStorageQuotaExceeded = totalUsedStorageBytes >= MAX_STORAGE_BYTES

  const filteredTestimonials = testimonials.filter(t => {
    const q = searchQuery.toLowerCase().trim()
    return (
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.role.toLowerCase().includes(q) ||
      t.text.toLowerCase().includes(q) ||
      (t.badge && t.badge.toLowerCase().includes(q))
    )
  })

  const handleExportAllLeads = async () => {
    setExportingCsv(true)
    try {
      const res = await api.leads.getAllLeadsForExport({
        search: debouncedSearch,
        status: statusFilter,
      })
      const rowsData = res.data || []
      const headers = ['Lead Type', 'ID', 'Date', 'Name', 'Phone', 'Email', 'Course', 'Status', 'Inquiry Details']
      const rows = rowsData.map(l => {
        const details =
          l.lead_type === 'demo-booking'
            ? `${l.time_slot ? `Slot: ${l.time_slot}` : 'Anytime slot'}${l.notes ? ` | ${l.notes}` : ''}`
            : `${l.goal ? `Goal: ${l.goal} | ` : ''}${l.message || 'No written message'}`
        return [
          l.lead_type === 'demo-booking' ? 'Demo Booking' : 'Contact Message',
          l.id,
          `"${new Date(l.created_at).toLocaleString()}"`,
          `"${l.name || ''}"`,
          `"${l.phone || ''}"`,
          `"${l.email || ''}"`,
          `"${l.course || ''}"`,
          `"${l.status}"`,
          `"${details.replace(/"/g, '""')}"`,
        ]
      })
      downloadCSV(`verbora-all-leads-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows])
    } finally {
      setExportingCsv(false)
    }
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
              {newLeadsCount > 0 ? (
                <span className="admin-sidebar-pill">
                  {newLeadsCount}
                </span>
              ) : (
                <span className="admin-sidebar-pill-subtle">
                  {totalLeads}
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

            <Link
              to={coursesRoutePath}
              className={`admin-sidebar-link ${activeSection === 'courses' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <BookOpen size={18} />
              <span className="admin-sidebar-link-text">
                Courses ({adminCourses.length || api.courses.DEFAULT_INITIAL_COURSES.length})
              </span>
              <span className="admin-sidebar-pill admin-sidebar-pill-secondary">
                {adminCourses.length || api.courses.DEFAULT_INITIAL_COURSES.length}
              </span>
            </Link>

            <Link
              to={trainerRoutePath}
              className={`admin-sidebar-link ${activeSection === 'trainer' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <UserCheck size={18} />
              <span className="admin-sidebar-link-text">Trainer Profile</span>
            </Link>

            <Link
              to={contestRoutePath}
              className={`admin-sidebar-link ${activeSection === 'contest' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Trophy size={18} />
              <span className="admin-sidebar-link-text">Contest</span>
              <span className="admin-sidebar-pill admin-sidebar-pill-secondary">
                {contestForm.is_active ? 'Live' : 'Off'}
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
                    {activeSection === 'leads'
                      ? 'Leads & Inquiries'
                      : activeSection === 'courses'
                        ? 'Courses Management'
                        : activeSection === 'trainer'
                          ? 'Trainer Profile'
                          : activeSection === 'contest'
                            ? 'Contest & Entries'
                            : 'Home Testimonials'}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-topbar-right">
              <div
                className={`admin-topbar-storage ${isStorageQuotaExceeded ? 'is-danger' : storageUsagePercent > 75 ? 'is-warning' : ''}`}
                title={`Storage Quota: ${usedStorageMB} MB of ${maxStorageMB} MB used (${storageUsagePercent}%)`}
              >
                <div className="admin-topbar-storage-info">
                  <HardDrive size={13} className="admin-topbar-storage-icon" />
                  <span className="admin-topbar-storage-text">
                    <strong>{usedStorageMB}</strong> / {maxStorageMB} MB
                  </span>
                  <div className="admin-topbar-storage-bar" aria-hidden="true">
                    <div
                      className="admin-topbar-storage-fill"
                      style={{ width: `${storageUsagePercent}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-topbar-upgrade-btn"
                  onClick={() => setShowUpgradeModal(true)}
                  title="Upgrade storage to 1 GB (₹150/mo)"
                >
                  Upgrade
                </button>
              </div>

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
              <span className="admin-stat-sub-badge">{unreadContactsCount} New</span>
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
              <button
                type="button"
                className="admin-icon-btn"
                onClick={handleExportAllLeads}
                disabled={exportingCsv}
              >
                <Download size={14} />
                <span>{exportingCsv ? 'Exporting...' : 'Export All Leads CSV'}</span>
              </button>

              {/* Status Dropdown Filter */}
              <select
                className="admin-filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="new">● New ({newLeadsCount})</option>
                <option value="contacted">● Contacted</option>
                <option value="scheduled">● Scheduled</option>
                <option value="completed">● Completed</option>
                <option value="cancelled">● Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Unified Leads Table */}
        {leadsDbError && (
          <div className="admin-db-warning-banner">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>
                  Supabase <code>public.leads</code> query error ({leadsDbError})
                </strong>
                <span>
                  Run the unified <code>public.leads</code> SQL in <code>supabase/schema.sql</code> inside Supabase Dashboard SQL Editor so leads from <code>demo_bookings</code> and <code>contact_messages</code> migrate into <code>public.leads</code>.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="admin-icon-btn"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="admin-table-card">
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-lead-info-col">Lead Info</th>
                    <th>Type</th>
                    <th className="admin-lead-course-col">Course</th>
                    <th className="admin-lead-details-col">Inquiry Details</th>
                    <th>Status</th>
                    <th>Date Received</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLeadsTableLoading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <tr key={`lead-skel-${idx}`} className="admin-lead-skeleton-row">
                        <td>
                          <div className="admin-user-cell" style={{ gap: 6 }}>
                            <div className="skeleton-shimmer" style={{ height: 14, width: 120, borderRadius: 4 }} />
                            <div className="skeleton-shimmer" style={{ height: 11, width: 98, borderRadius: 4 }} />
                            <div className="skeleton-shimmer" style={{ height: 11, width: 142, borderRadius: 4 }} />
                          </div>
                        </td>
                        <td>
                          <div className="skeleton-shimmer" style={{ height: 24, width: 102, borderRadius: 999 }} />
                        </td>
                        <td>
                          <div className="skeleton-shimmer" style={{ height: 14, width: 118, borderRadius: 4 }} />
                        </td>
                        <td>
                          <div className="skeleton-shimmer" style={{ height: 16, width: 106, borderRadius: 4 }} />
                        </td>
                        <td>
                          <div className="skeleton-shimmer" style={{ height: 30, width: 116, borderRadius: 8 }} />
                        </td>
                        <td>
                          <div className="skeleton-shimmer" style={{ height: 13, width: 112, borderRadius: 4 }} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div className="skeleton-shimmer" style={{ height: 28, width: 88, borderRadius: 8 }} />
                            <div className="skeleton-shimmer" style={{ height: 28, width: 30, borderRadius: 8 }} />
                            <div className="skeleton-shimmer" style={{ height: 28, width: 30, borderRadius: 8 }} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="admin-empty-state">
                          <Database size={40} className="admin-empty-icon" />
                          <p>No leads found matching your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map(lead => {
                      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '')
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            lead.lead_type === 'demo-booking'
                              ? `Hi ${lead.name}, thank you for booking your Free Diagnostic Session with Verbora for ${lead.course}. When would be a good time to connect?`
                              : `Hi ${lead.name}, thank you for reaching out to Verbora regarding ${lead.course}. How can we assist you?`
                          )}`
                        : null
                      const isUnreadNew = lead.status === 'new'

                      return (
                        <tr
                          key={lead.id}
                          className={isUnreadNew ? 'admin-lead-row-unread' : undefined}
                        >
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{lead.name}</span>
                              <div className="admin-user-meta-vertical">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} title="Call phone">
                                    <Phone size={11} />
                                    <span>{lead.phone}</span>
                                  </a>
                                )}
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} title="Email student">
                                    <Mail size={11} />
                                    <span>{lead.email}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="admin-lead-type-pill-black">
                              {lead.lead_type === 'demo-booking' ? (
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
                          </td>

                          <td>
                            <span className="admin-lead-course-name">
                              {lead.course}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-desc-link-btn"
                              onClick={() => setSelectedLeadForDesc(lead)}
                            >
                              <FileText size={13} />
                              <span>View Description</span>
                            </button>
                          </td>

                          <td>
                            <select
                              className={`admin-status-select status-${lead.status}`}
                              value={lead.status}
                              disabled={updatingId === lead.id}
                              onChange={e =>
                                handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus, lead.status)
                              }
                            >
                              {lead.status === 'new' && <option value="new">● New Lead</option>}
                              <option value="contacted">● Contacted</option>
                              <option value="scheduled">● Scheduled</option>
                              <option value="completed">● Completed</option>
                              <option value="cancelled">● Cancelled</option>
                            </select>
                          </td>

                          <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
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
                                onClick={() => handleDeleteLead(lead.id, lead.name)}
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

            {totalFilteredLeads > 0 && (
              <div className="admin-pagination-bar">
                <span className="admin-pagination-info">
                  Showing{' '}
                  <strong>{(leadsPage - 1) * api.leads.LEADS_PAGE_SIZE + 1}</strong>
                  –
                  <strong>
                    {Math.min(leadsPage * api.leads.LEADS_PAGE_SIZE, totalFilteredLeads)}
                  </strong>{' '}
                  of <strong>{totalFilteredLeads}</strong> leads
                </span>

                <div className="admin-pagination-controls">
                  <button
                    type="button"
                    className="admin-page-btn"
                    disabled={leadsPage <= 1 || leadsQuery.isFetching}
                    onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalLeadPages }, (_, i) => i + 1)
                    .filter(
                      p =>
                        p === 1 ||
                        p === totalLeadPages ||
                        Math.abs(p - leadsPage) <= 1
                    )
                    .map((p, idx, arr) => (
                      <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="admin-page-ellipsis">...</span>
                        )}
                        <button
                          type="button"
                          className={`admin-page-btn ${p === leadsPage ? 'is-active' : ''}`}
                          onClick={() => setLeadsPage(p)}
                          disabled={leadsQuery.isFetching}
                        >
                          {p}
                        </button>
                      </span>
                    ))}

                  <button
                    type="button"
                    className="admin-page-btn"
                    disabled={leadsPage >= totalLeadPages || leadsQuery.isFetching}
                    onClick={() => setLeadsPage(p => Math.min(totalLeadPages, p + 1))}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
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
                        background: '#059669',
                        border: '1px solid #047857',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                      onClick={handleOpenSpotlightModal}
                      title="Select which testimonial is featured as the Spotlight on /stories"
                    >
                      <Star size={15} style={{ fill: '#ffffff', color: '#ffffff' }} />
                      <span>Spotlight Testimonial</span>
                      {testimonials.find(t => t.is_spotlight) && (
                        <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
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

                    <button
                      type="button"
                      className="admin-btn-secondary"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onClick={handleOpenAddTestimonial}
                    >
                      <Plus size={15} />
                      <span>Add Testimonial</span>
                    </button>
                  </div>
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
                                    Spotlight
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

            {/* Courses Management Section */}
            {activeSection === 'courses' && (
              <>
                {coursesDbError && (
                  <div className="admin-db-warning-banner">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} />
                      <div>
                        <strong style={{ display: 'block', marginBottom: 2 }}>
                          Supabase <code>public.courses</code> table not ready ({coursesDbError})
                        </strong>
                        <span>
                          Run <code>supabase/schema.sql</code> in your Supabase Dashboard SQL Editor to create and seed the <code>courses</code> table so edits persist to the database.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={loadData}
                      disabled={loading}
                    >
                      <RefreshCw size={13} className={loading ? 'spin' : ''} />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                )}

                {adminCoursesQuery.isLoading && adminCourses.length === 0 ? (
                  <div className="admin-courses-grid">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="admin-course-skeleton">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            <div className="skeleton-shimmer" style={{ height: 16, width: '65%', borderRadius: 4 }} />
                            <div className="skeleton-shimmer" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                          </div>
                          <div className="skeleton-shimmer" style={{ height: 22, width: 84, borderRadius: 6 }} />
                        </div>
                        <div className="skeleton-shimmer" style={{ height: 68, width: '100%', borderRadius: 8 }} />
                        <div className="skeleton-shimmer" style={{ height: 54, width: '100%', borderRadius: 8 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                          <div className="skeleton-shimmer" style={{ height: 14, width: 120, borderRadius: 4 }} />
                          <div className="skeleton-shimmer" style={{ height: 32, width: 108, borderRadius: 6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-courses-grid">
                    {(adminCourses.length > 0 ? adminCourses : api.courses.DEFAULT_INITIAL_COURSES).map(c => {
                      const discountedPrice = Math.round((c.fee_amount || 0) * (1 - (c.discount_percent || 0) / 100))
                      const isCourseVisible = c.is_visible !== false

                      return (
                        <div key={c.id} className={`admin-course-card ${isCourseVisible ? '' : 'is-hidden'}`}>
                          <div className="admin-course-card-header">
                            <div>
                              <h3 className="admin-course-title">{c.title}</h3>
                              <p className="admin-course-tagline">{c.tagline}</p>
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {c.short}
                            </span>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                              Course Description (Summary)
                            </label>
                            <div className="admin-course-description-box" title={stripHtmlToText(c.summary)}>
                              {stripHtmlToText(c.summary)}
                            </div>
                          </div>

                          <div className="admin-course-pricing-strip">
                            <div className="admin-course-price-col">
                              <span className="admin-course-price-label">Live Pricing</span>
                              <div className="admin-course-effective-price">
                                <span>₹{discountedPrice.toLocaleString('en-IN')}</span>
                                {(c.discount_percent || 0) > 0 && (
                                  <span className="admin-course-original-price">
                                    ₹{(c.fee_amount || 0).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {(c.discount_percent || 0) > 0 ? (
                              <span className="admin-course-discount-badge">
                                {c.discount_percent}% OFF
                              </span>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                                Regular Price
                              </span>
                            )}
                          </div>

                          <div className="admin-course-actions">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span
                                className={`admin-course-visibility-badge ${isCourseVisible ? 'is-visible' : 'is-hidden'}`}
                              >
                                {isCourseVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                <span>{isCourseVisible ? 'Visible on Site' : 'Hidden from Site'}</span>
                              </span>
                              {c.is_upcoming && (
                                <span className="admin-course-visibility-badge is-upcoming-admin">
                                  <span>Upcoming</span>
                                </span>
                              )}
                              {c.video && (
                                <span className="admin-course-visibility-badge is-video-admin">
                                  <Video size={12} />
                                  <span>Video</span>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="admin-action-btn admin-btn-edit"
                              style={{ padding: '6px 14px', borderRadius: 6, gap: 6 }}
                              onClick={() => handleEditCourse(c)}
                            >
                              <Edit3 size={13} />
                              <span>Edit Course</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {activeSection === 'trainer' && (
              <>
                <div className="admin-section-header">
                  <div>
                    <h2 className="admin-section-title">Master Trainer Profile</h2>
                    <p className="admin-section-subtitle">
                      Customize trainer details, portrait photo, credentials, and coaching philosophy shown on the Trainer & Contact pages.
                    </p>
                  </div>
                  <button
                    type="submit"
                    form="admin-trainer-profile-form"
                    className="admin-trainer-save-btn"
                    disabled={savingTrainer || trainerPhotoBusyMode !== null || (adminTrainerQuery.isLoading && !adminTrainerQuery.data)}
                  >
                    {savingTrainer ? 'Saving Trainer Profile...' : 'Save Trainer Profile'}
                  </button>
                </div>

                {trainerDbError && (
                  <div className="admin-trainer-db-alert" role="alert">
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Supabase Table Notice:</strong> {trainerDbError} — Make sure{' '}
                      <code>public.trainer_profile</code> is created from <code>supabase/schema.sql</code>.
                    </div>
                  </div>
                )}

                <div className="admin-trainer-card">
                  {adminTrainerQuery.isLoading && !adminTrainerQuery.data ? (
                    <div className="admin-trainer-form" aria-busy="true">
                      <div className="skeleton-shimmer" style={{ height: 68, width: '100%', borderRadius: 10 }} />
                      <div className="admin-trainer-2col">
                        <div className="skeleton-shimmer" style={{ height: 42, borderRadius: 8 }} />
                        <div className="skeleton-shimmer" style={{ height: 42, borderRadius: 8 }} />
                      </div>
                      <div className="skeleton-shimmer" style={{ height: 42, borderRadius: 8 }} />
                      <div className="skeleton-shimmer" style={{ height: 150, borderRadius: 10 }} />
                      <div className="skeleton-shimmer" style={{ height: 54, borderRadius: 10 }} />
                    </div>
                  ) : (
                  <form id="admin-trainer-profile-form" className="admin-trainer-form" onSubmit={handleSaveTrainerProfile}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                        Trainer Portrait Photo
                      </label>
                      {(() => {
                        const resolvedAdminPhoto =
                          (trainerForm.photo_url || '').trim() || api.trainer.DEFAULT_TRAINER_PHOTO_URL
                        const isCustomPhoto =
                          resolvedAdminPhoto !== api.trainer.DEFAULT_TRAINER_PHOTO_URL
                        return (
                          <div className="admin-course-cover-row">
                            <div className="admin-course-cover-left">
                              <img
                                src={resolvedAdminPhoto}
                                alt={trainerForm.name || 'Trainer portrait'}
                                className="admin-course-cover-thumb"
                              />
                              <div className="admin-course-cover-meta">
                                <strong>
                                  {isCustomPhoto ? 'Custom Portrait Uploaded' : 'Default Local Photo'}
                                </strong>
                                <span>
                                  {isCustomPhoto
                                    ? trainerForm.photo_size_bytes > 0
                                      ? `${(trainerForm.photo_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                                      : 'Cloudinary Hosted'
                                    : '0 MB · Local Asset'}
                                </span>
                              </div>
                            </div>

                            <div className="admin-course-cover-btns">
                              <label className="admin-course-cover-upload-btn">
                                <Upload size={13} />
                                <span>{isCustomPhoto ? 'Change' : 'Upload Custom'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={trainerPhotoBusyMode !== null || savingTrainer}
                                  onChange={handleUploadTrainerPhotoFile}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              {isCustomPhoto && (
                                <button
                                  type="button"
                                  className="admin-course-cover-remove-btn"
                                  disabled={trainerPhotoBusyMode !== null || savingTrainer}
                                  onClick={handleRemoveTrainerPhoto}
                                >
                                  <Trash2 size={12} />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                      {trainerPhotoError && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>
                          {trainerPhotoError}
                        </span>
                      )}
                    </div>

                    <div className="admin-trainer-2col">
                      <div className="admin-trainer-field">
                        <label htmlFor="trainer-kicker-input">Hero Kicker Badge</label>
                        <input
                          id="trainer-kicker-input"
                          type="text"
                          value={trainerForm.hero_kicker}
                          onChange={e => setTrainerForm(prev => ({ ...prev, hero_kicker: e.target.value }))}
                          placeholder="e.g. Meet Your Master Coach"
                        />
                      </div>

                      <div className="admin-trainer-field">
                        <label htmlFor="trainer-name-input">
                          Trainer Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          id="trainer-name-input"
                          type="text"
                          required
                          value={trainerForm.name}
                          onChange={e => setTrainerForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Bijay Adhikari"
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-field">
                      <label htmlFor="trainer-role-input">
                        Role / Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="trainer-role-input"
                        type="text"
                        required
                        value={trainerForm.role_title}
                        onChange={e => setTrainerForm(prev => ({ ...prev, role_title: e.target.value }))}
                        placeholder="e.g. Lead Spoken English Coach & Founder"
                      />
                    </div>

                    <div className="admin-trainer-field">
                      <label htmlFor="trainer-quote-input">Signature Quote</label>
                      <input
                        id="trainer-quote-input"
                        type="text"
                        value={trainerForm.quote}
                        onChange={e => setTrainerForm(prev => ({ ...prev, quote: e.target.value }))}
                        placeholder="Inspirational coaching quote displayed on hero"
                      />
                    </div>

                    <div className="admin-trainer-field">
                      <label>
                        Short Bio / Hero Introduction <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <Suspense
                        fallback={
                          <div className="tiptap-editor-wrap">
                            <div className="tiptap-editor-content" style={{ minHeight: 140, color: '#94a3b8', fontSize: 13 }}>
                              Loading rich text editor...
                            </div>
                          </div>
                        }
                      >
                        <LazyRichTextEditor
                          key={`bio-${adminTrainerQuery.dataUpdatedAt || 'initial'}`}
                          value={trainerForm.bio}
                          onChange={html => setTrainerForm(prev => ({ ...prev, bio: html }))}
                        />
                      </Suspense>
                    </div>

                    <div className="admin-trainer-section-divider">
                      <h3 className="admin-trainer-section-title">Highlight Chips & Credentials</h3>
                      <div className="admin-trainer-2col">
                        <div className="admin-trainer-field">
                          <label htmlFor="trainer-credential-input">Credential Badge</label>
                          <input
                            id="trainer-credential-input"
                            type="text"
                            value={trainerForm.credential_label}
                            onChange={e => setTrainerForm(prev => ({ ...prev, credential_label: e.target.value }))}
                            placeholder="e.g. TESOL Certified Trainer"
                          />
                        </div>

                        <div className="admin-trainer-field">
                          <label htmlFor="trainer-experience-input">Experience Chip</label>
                          <input
                            id="trainer-experience-input"
                            type="text"
                            value={trainerForm.experience_label}
                            onChange={e => setTrainerForm(prev => ({ ...prev, experience_label: e.target.value }))}
                            placeholder="e.g. 10+ Years Experience"
                          />
                        </div>

                        <div className="admin-trainer-field">
                          <label htmlFor="trainer-learners-input">Learners Highlight</label>
                          <input
                            id="trainer-learners-input"
                            type="text"
                            value={trainerForm.learners_label}
                            onChange={e => setTrainerForm(prev => ({ ...prev, learners_label: e.target.value }))}
                            placeholder="e.g. 12,000+ Professionals Trained"
                          />
                        </div>

                        <div className="admin-trainer-field">
                          <label htmlFor="trainer-rating-input">Rating Chip</label>
                          <input
                            id="trainer-rating-input"
                            type="text"
                            value={trainerForm.rating_label}
                            onChange={e => setTrainerForm(prev => ({ ...prev, rating_label: e.target.value }))}
                            placeholder="e.g. 4.9/5 Student Rating"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="admin-trainer-section-divider">
                      <h3 className="admin-trainer-section-title">Coaching Philosophy & Story</h3>
                      <div className="admin-trainer-form" style={{ gap: 12 }}>
                        <div className="admin-trainer-field">
                          <label htmlFor="trainer-story-heading-input">Story Section Heading</label>
                          <input
                            id="trainer-story-heading-input"
                            type="text"
                            value={trainerForm.story_heading}
                            onChange={e => setTrainerForm(prev => ({ ...prev, story_heading: e.target.value }))}
                            placeholder="e.g. Why Most People Know English, Yet Still Freeze"
                          />
                        </div>

                        <div className="admin-trainer-field">
                          <label>The Story Behind VERBORA (Story Body)</label>
                          <Suspense
                            fallback={
                              <div className="tiptap-editor-wrap">
                                <div className="tiptap-editor-content" style={{ minHeight: 140, color: '#94a3b8', fontSize: 13 }}>
                                  Loading rich text editor...
                                </div>
                              </div>
                            }
                          >
                            <LazyRichTextEditor
                              key={`story-${adminTrainerQuery.dataUpdatedAt || 'initial'}`}
                              value={trainerForm.story_body}
                              onChange={html => setTrainerForm(prev => ({ ...prev, story_body: html }))}
                            />
                          </Suspense>
                        </div>
                      </div>
                    </div>

                    <TrainerListEditor<TrainerStatItem>
                      title="Key Statistics Strip"
                      subtitle="Shown on the Home page Trainer showcase and the /trainer stats bar."
                      items={trainerForm.stats}
                      allowAddRemove={false}
                      itemPrefix="Stat Card"
                      collapsible
                      defaultExpanded={false}
                      onChange={stats => setTrainerForm(prev => ({ ...prev, stats }))}
                      fields={[
                        { key: 'number', label: 'Stat Value', placeholder: 'e.g. 10+ Yrs' },
                        { key: 'label', label: 'Stat Label', placeholder: 'e.g. Coaching Experience' },
                        { key: 'sub', label: 'Subtitle', placeholder: 'e.g. Executive speech & voice mentorship', fullWidth: true },
                      ]}
                    />

                    <div className="admin-trainer-footer">
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          href="/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-trainer-preview-link"
                        >
                          <ExternalLink size={14} />
                          <span>Preview Home Page</span>
                        </a>
                        <a
                          href="/trainer"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-trainer-preview-link"
                        >
                          <ExternalLink size={14} />
                          <span>Preview Trainer Page</span>
                        </a>
                      </div>
                    </div>
                  </form>
                  )}
                </div>
              </>
            )}

            {activeSection === 'contest' && (
              <>
                <div className="admin-section-header">
                  <div>
                    <h2 className="admin-section-title">Contest Management & Entries</h2>
                    <p className="admin-section-subtitle">
                      Control contest visibility, prizes, steps, rules, and review participant registrations from /contest.
                    </p>
                  </div>
                  <button
                    type="submit"
                    form="admin-contest-settings-form"
                    className="admin-trainer-save-btn"
                    disabled={savingContest}
                  >
                    {savingContest ? 'Saving Contest...' : 'Save Contest Settings'}
                  </button>
                </div>

                {(contestDbError || contestEntriesDbError) && (
                  <div className="admin-trainer-db-alert" role="alert">
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Supabase Table Notice:</strong> {contestDbError || contestEntriesDbError} — Make sure{' '}
                      <code>public.contest_config</code> and <code>public.contest_entries</code> are created from{' '}
                      <code>supabase/schema.sql</code>.
                    </div>
                  </div>
                )}

                <div className="admin-trainer-card" style={{ marginBottom: 22 }}>
                  <form id="admin-contest-settings-form" className="admin-trainer-form" onSubmit={handleSaveContestConfig}>
                    <div className="admin-contest-status-row">
                      <div>
                        <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>
                          Contest Status: {contestForm.is_active ? 'LIVE (Started)' : 'STOPPED (Hidden)'}
                        </strong>
                        <span className="admin-trainer-hint" style={{ marginTop: 2 }}>
                          Start ya Stop karte hi website (Hero button, Navbar, Home & /contest) turant update ho jayega.
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={savingContest}
                        className={`admin-contest-toggle-btn ${contestForm.is_active ? 'is-live' : 'is-stopped'}`}
                        onClick={() => setPendingContestToggle(contestForm.is_active ? 'stop' : 'start')}
                      >
                        <span className="admin-contest-btn-dot" aria-hidden="true" />
                        <span>{contestForm.is_active ? 'Stop Contest' : 'Start Contest'}</span>
                      </button>
                    </div>

                    <div className="admin-trainer-2col">
                      <div className="admin-trainer-field">
                        <label htmlFor="contest-topic-input">Speaking Topic *</label>
                        <input
                          id="contest-topic-input"
                          type="text"
                          value={contestForm.topic}
                          onChange={e => setContestForm(prev => ({ ...prev, topic: e.target.value }))}
                          placeholder="e.g. My Biggest Career Turning Point (2 Mins)"
                        />
                      </div>

                      <div className="admin-trainer-field">
                        <label htmlFor="contest-gmeet-input">Google Meet Link (GMeet URL)</label>
                        <input
                          id="contest-gmeet-input"
                          type="url"
                          value={contestForm.gmeet_url}
                          onChange={e => setContestForm(prev => ({ ...prev, gmeet_url: e.target.value }))}
                          placeholder="https://meet.google.com/xxx-yyyy-zzz"
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-2col">
                      <div className="admin-trainer-field">
                        <label htmlFor="contest-fee-input">Entry Fee</label>
                        <input
                          id="contest-fee-input"
                          type="text"
                          value={contestForm.entry_fee_label}
                          onChange={e => setContestForm(prev => ({ ...prev, entry_fee_label: e.target.value }))}
                          placeholder="e.g. Free or ₹199"
                        />
                      </div>

                      <div className="admin-trainer-field">
                        <label htmlFor="contest-badge-input">Status Badge Text</label>
                        <input
                          id="contest-badge-input"
                          type="text"
                          value={contestForm.badge_text}
                          onChange={e => setContestForm(prev => ({ ...prev, badge_text: e.target.value }))}
                          placeholder="e.g. Registrations Open"
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-2col">
                      <div className="admin-trainer-field">
                        <label htmlFor="contest-start-date-input">Start Date</label>
                        <input
                          id="contest-start-date-input"
                          type="date"
                          value={contestForm.start_date}
                          onChange={e => setContestForm(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>

                      <div className="admin-trainer-field">
                        <label htmlFor="contest-end-date-input">End Date</label>
                        <input
                          id="contest-end-date-input"
                          type="date"
                          value={contestForm.end_date}
                          onChange={e => setContestForm(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-2col">
                      <div className="admin-trainer-field">
                        <label htmlFor="contest-hero-pill-input">Hero CTA Button Text</label>
                        <input
                          id="contest-hero-pill-input"
                          type="text"
                          value={contestForm.hero_pill_text}
                          onChange={e => setContestForm(prev => ({ ...prev, hero_pill_text: e.target.value }))}
                          placeholder="e.g. Join Speech Contest"
                        />
                      </div>

                      <div className="admin-trainer-field">
                        <label htmlFor="contest-deadline-input">Deadline Label</label>
                        <input
                          id="contest-deadline-input"
                          type="text"
                          value={contestForm.deadline_label}
                          onChange={e => setContestForm(prev => ({ ...prev, deadline_label: e.target.value }))}
                          placeholder="e.g. Limited Seats · Closes Soon"
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-field">
                      <label htmlFor="contest-title-input">
                        Contest Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="contest-title-input"
                        type="text"
                        required
                        value={contestForm.title}
                        onChange={e => setContestForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. All-India Spoken English & Confidence Challenge 2026"
                      />
                    </div>

                    <div className="admin-trainer-field">
                      <label htmlFor="contest-subtitle-input">Subtitle</label>
                      <textarea
                        id="contest-subtitle-input"
                        rows={2}
                        value={contestForm.subtitle}
                        onChange={e => setContestForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="Short persuasive description shown under the contest heading"
                      />
                    </div>

                    <div className="admin-trainer-field">
                      <label>About the Challenge</label>
                      <Suspense
                        fallback={
                          <div className="tiptap-editor-wrap">
                            <div className="tiptap-editor-content" style={{ minHeight: 140, color: '#94a3b8', fontSize: 13 }}>
                              Loading rich text editor...
                            </div>
                          </div>
                        }
                      >
                        <LazyRichTextEditor
                          key={`contest-${adminContestConfigQuery.dataUpdatedAt || 'initial'}`}
                          value={contestForm.description}
                          onChange={html => setContestForm(prev => ({ ...prev, description: html }))}
                        />
                      </Suspense>
                    </div>

                    <TrainerListEditor<ContestPrizeItem>
                      title="Prizes & Recognition"
                      subtitle="Shown on the Home contest banner and /contest page."
                      items={contestForm.prizes}
                      itemPrefix="Prize"
                      addLabel="Add Prize Tier"
                      createEmptyItem={() => ({ rank: '', title: '', detail: '' })}
                      collapsible
                      defaultExpanded={false}
                      visibilityToggle={{
                        checked: contestForm.show_prizes,
                        onChange: checked => setContestForm(prev => ({ ...prev, show_prizes: checked })),
                      }}
                      onChange={prizes => setContestForm(prev => ({ ...prev, prizes }))}
                      fields={[
                        { key: 'rank', label: 'Tier / Rank', placeholder: 'e.g. 1st Prize' },
                        { key: 'title', label: 'Reward Title', placeholder: 'e.g. ₹15,000 + Scholarship' },
                        { key: 'detail', label: 'Reward Details', placeholder: 'Describe perks included...', fullWidth: true },
                      ]}
                    />

                    <TrainerListEditor<ContestStepItem>
                      title="How It Works"
                      subtitle="3-step participation guide shown on Home & /contest."
                      items={contestForm.steps}
                      itemPrefix="Step"
                      addLabel="Add Step"
                      createEmptyItem={() => ({
                        step: String(contestForm.steps.length + 1).padStart(2, '0'),
                        title: '',
                        desc: '',
                      })}
                      collapsible
                      defaultExpanded={false}
                      visibilityToggle={{
                        checked: contestForm.show_steps,
                        onChange: checked => setContestForm(prev => ({ ...prev, show_steps: checked })),
                      }}
                      onChange={steps => setContestForm(prev => ({ ...prev, steps }))}
                      fields={[
                        { key: 'step', label: 'Step Number', placeholder: 'e.g. 01' },
                        { key: 'title', label: 'Step Title', placeholder: 'e.g. Register Online Free' },
                        { key: 'desc', label: 'Description', placeholder: 'Explain what participant does...', fullWidth: true },
                      ]}
                    />

                    <div className="admin-trainer-section-divider">
                      <div className="admin-trainer-field">
                        <label htmlFor="contest-rules-input">Eligibility & Guidelines (one per line)</label>
                        <textarea
                          id="contest-rules-input"
                          rows={4}
                          value={contestForm.rulesText}
                          onChange={e => setContestForm(prev => ({ ...prev, rulesText: e.target.value }))}
                          placeholder="One rule per line..."
                        />
                      </div>
                    </div>

                    <div className="admin-trainer-footer">
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          href="/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-trainer-preview-link"
                        >
                          <ExternalLink size={14} />
                          <span>Preview Home Banner</span>
                        </a>
                        <a
                          href="/contest"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-trainer-preview-link"
                        >
                          <ExternalLink size={14} />
                          <span>Preview /contest Page</span>
                        </a>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Registered Contest Entries Card */}
                <div className="admin-trainer-card">
                  <div className="admin-trainer-list-head">
                    <div>
                      <h3 className="admin-trainer-section-title" style={{ marginBottom: 3 }}>
                        Registered Contest Participants ({contestEntries.length})
                      </h3>
                      <span className="admin-trainer-hint" style={{ marginTop: 0 }}>
                        Submissions from the /contest registration form.
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="search"
                        value={contestSearch}
                        onChange={e => setContestSearch(e.target.value)}
                        placeholder="Search participants..."
                        style={{
                          padding: '7px 11px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                        }}
                      />
                      <button
                        type="button"
                        className="admin-trainer-add-btn"
                        onClick={handleExportContestCsv}
                        disabled={contestEntries.length === 0}
                      >
                        <Download size={14} />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {adminContestEntriesQuery.isLoading ? (
                    <div className="skeleton-shimmer" style={{ height: 110, borderRadius: 10 }} />
                  ) : contestEntries.length === 0 ? (
                    <p className="admin-trainer-empty-note">
                      No contest registrations yet. Once visitors register on /contest, they will appear here.
                    </p>
                  ) : (
                    <div className="admin-contest-entries-table-wrap">
                      <table className="admin-contest-entries-table">
                        <thead>
                          <tr>
                            <th>Participant</th>
                            <th>Contact</th>
                            <th>Category & Info</th>
                            <th>Date</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {contestEntries
                            .filter(entry => {
                              const q = contestSearch.trim().toLowerCase()
                              if (!q) return true
                              return `${entry.name} ${entry.email} ${entry.phone} ${entry.category} ${entry.city_or_role || ''}`
                                .toLowerCase()
                                .includes(q)
                            })
                            .map(entry => (
                              <tr key={entry.id}>
                                <td>
                                  <strong>{entry.name}</strong>
                                  {entry.city_or_role && (
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{entry.city_or_role}</div>
                                  )}
                                </td>
                                <td>
                                  <div>{entry.phone}</div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>{entry.email}</div>
                                </td>
                                <td>
                                  <span className="admin-trainer-count-pill">{entry.category}</span>
                                  {entry.notes && (
                                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{entry.notes}</div>
                                  )}
                                </td>
                                <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {new Date(entry.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-course-cover-remove-btn"
                                    onClick={() => handleDeleteContestEntry(entry.id, entry.name)}
                                    title="Delete entry"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
      </main>
    </div>
  </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="admin-modal-overlay" onClick={() => setEditingCourse(null)}>
          <div
            className="admin-modal-dialog admin-course-edit-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-modal-header admin-course-edit-header">
              <div className="admin-modal-title-group">
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    Edit {editingCourse.title}
                  </h3>
                  <p className="admin-modal-sub" style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                    Update course name, description, visibility, fee amount, and discount %.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingCourse(null)}
                aria-label="Close edit course modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="admin-course-edit-form"
              onSubmit={e => {
                e.preventDefault()
                handleSaveCourse()
              }}
            >
              <div className="admin-course-edit-grid">
                {/* Left Column: Rich Text Description + Course Cover Image */}
                <div className="admin-course-edit-col">
                  <div className="admin-course-edit-field">
                    <label>
                      Course Description / Summary <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <Suspense
                      fallback={
                        <div className="tiptap-editor-wrap">
                          <div className="tiptap-editor-content" style={{ minHeight: 140, color: '#94a3b8', fontSize: 13 }}>
                            Loading rich text editor...
                          </div>
                        </div>
                      }
                    >
                      <LazyRichTextEditor
                        key={editingCourse.id}
                        value={courseForm.summary}
                        onChange={html => setCourseForm(prev => ({ ...prev, summary: html }))}
                      />
                    </Suspense>
                  </div>

                  <div className="admin-course-edit-field admin-course-cover-field">
                    <label>Course Cover Image</label>
                    <div className="admin-course-cover-row">
                      <div className="admin-course-cover-left">
                        {courseForm.cover ? (
                          <img
                            src={courseForm.cover}
                            alt={courseForm.title || editingCourse.title}
                            className="admin-course-cover-thumb"
                          />
                        ) : (
                          <div className="admin-course-cover-empty" title="No cover image">
                            <Image size={17} />
                          </div>
                        )}
                        <div className="admin-course-cover-meta">
                          <strong>{courseForm.cover ? 'Cover Image Ready' : 'No Cover Image'}</strong>
                          <span>
                            {courseForm.cover
                              ? courseForm.cover_size_bytes > 0
                                ? `${(courseForm.cover_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                                : 'Attached'
                              : 'Upload JPG, PNG or WEBP'}
                          </span>
                        </div>
                      </div>

                      <div className="admin-course-cover-btns">
                        <label className="admin-course-cover-upload-btn">
                          <Upload size={13} />
                          <span>{courseForm.cover ? 'Change' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingCourseCover}
                            onChange={handleUploadCourseCoverFile}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {courseForm.cover && (
                          <button
                            type="button"
                            className="admin-course-cover-remove-btn"
                            disabled={uploadingCourseCover}
                            onClick={handleRemoveCourseCover}
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {courseCoverError && (
                      <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        {courseCoverError}
                      </span>
                    )}
                  </div>

                  <div className="admin-course-edit-field admin-course-cover-field">
                    <label>Course Preview Video (Optional)</label>
                    <div className="admin-course-cover-row">
                      <div className="admin-course-cover-left">
                        {courseForm.video ? (
                          <video
                            src={courseForm.video}
                            muted
                            playsInline
                            preload="metadata"
                            className="admin-course-cover-thumb"
                          />
                        ) : (
                          <div className="admin-course-cover-empty" title="No course video attached">
                            <Video size={17} />
                          </div>
                        )}
                        <div className="admin-course-cover-meta">
                          <strong>
                            {courseVideoBusyMode === 'uploading'
                              ? 'Uploading Video...'
                              : courseVideoBusyMode === 'removing'
                                ? 'Removing Video...'
                                : courseForm.video
                                  ? 'Course Video Ready'
                                  : 'No Course Video'}
                          </strong>
                          <span>
                            {courseForm.video
                              ? courseForm.video_size_bytes > 0
                                ? `${(courseForm.video_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                                : 'Attached'
                              : 'Upload MP4, MOV or WEBM'}
                          </span>
                        </div>
                      </div>

                      <div className="admin-course-cover-btns">
                        <label className="admin-course-cover-upload-btn">
                          <Upload size={13} className={courseVideoBusyMode === 'uploading' ? 'spin' : ''} />
                          <span>
                            {courseVideoBusyMode === 'uploading'
                              ? 'Uploading...'
                              : courseForm.video
                                ? 'Change'
                                : 'Upload'}
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            disabled={uploadingCourseVideo}
                            onChange={handleUploadCourseVideoFile}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {courseForm.video && (
                          <button
                            type="button"
                            className="admin-course-cover-remove-btn"
                            disabled={uploadingCourseVideo}
                            onClick={handleRemoveCourseVideo}
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {courseVideoError && (
                      <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        {courseVideoError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Column: Title, Meta, Pricing & Visibility */}
                <div className="admin-course-edit-col">
                  <div className="admin-course-edit-field">
                    <label>
                      Course Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={courseForm.title}
                      onChange={e => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Spoken English"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="admin-course-edit-2col">
                    <div className="admin-course-edit-field">
                      <label>Tagline (Banner)</label>
                      <input
                        type="text"
                        value={courseForm.tagline}
                        onChange={e => setCourseForm(prev => ({ ...prev, tagline: e.target.value }))}
                        placeholder="e.g. Speak fluently."
                      />
                    </div>

                    <div className="admin-course-edit-field">
                      <label>Short Subtitle (Card)</label>
                      <input
                        type="text"
                        value={courseForm.short}
                        onChange={e => setCourseForm(prev => ({ ...prev, short: e.target.value }))}
                        placeholder="e.g. Lead with presence."
                      />
                    </div>
                  </div>

                  <div className="admin-course-edit-2col">
                    <div className="admin-course-edit-field">
                      <label>
                        Fee Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={courseForm.fee_amount}
                        onChange={e => setCourseForm(prev => ({ ...prev, fee_amount: Math.max(0, Number(e.target.value) || 0) }))}
                        placeholder="4999"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div className="admin-course-edit-field">
                      <label>Discount Percentage (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={courseForm.discount_percent}
                        onChange={e => setCourseForm(prev => ({ ...prev, discount_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                        placeholder="0"
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  {/* Visibility & Pre-Launch Toggles */}
                  <div className="admin-course-edit-2col">
                    <label className="admin-course-visibility-toggle">
                      <div>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          Visible on Website
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          Fetch &amp; show on public site.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={courseForm.is_visible}
                        onChange={e => setCourseForm(prev => ({ ...prev, is_visible: e.target.checked }))}
                      />
                    </label>

                    <label className="admin-course-visibility-toggle">
                      <div>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          Pre-Launch / Upcoming
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          Hide photo, show teaser only.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={courseForm.is_upcoming}
                        onChange={e => setCourseForm(prev => ({ ...prev, is_upcoming: e.target.checked }))}
                      />
                    </label>
                  </div>

                  {/* Live Preview Box */}
                  <div className="admin-course-price-preview">
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Live Price Preview
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>
                        ₹{Math.round(courseForm.fee_amount * (1 - courseForm.discount_percent / 100)).toLocaleString('en-IN')}
                      </span>
                      {courseForm.discount_percent > 0 && (
                        <>
                          <span style={{ fontSize: 12.5, color: '#94a3b8', textDecoration: 'line-through' }}>
                            ₹{courseForm.fee_amount.toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a' }}>
                            ({courseForm.discount_percent}% OFF • Save ₹{(courseForm.fee_amount - Math.round(courseForm.fee_amount * (1 - courseForm.discount_percent / 100))).toLocaleString('en-IN')})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-course-edit-footer">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  {savingCourse ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Confirmation Modal for Start / Stop Contest */}
      {pendingContestToggle && (
        <div
          className="admin-modal-overlay"
          onClick={() => {
            if (!savingContest) setPendingContestToggle(null)
          }}
        >
          <div
            className="admin-contest-confirm-modal"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <h3>{pendingContestToggle === 'stop' ? 'Stop Contest?' : 'Start Contest?'}</h3>
            <p>
              {pendingContestToggle === 'stop'
                ? 'Contest will be hidden from the website.'
                : 'Contest will be live on the website.'}
            </p>
            <div className="admin-contest-confirm-actions">
              <button
                type="button"
                className="admin-contest-cancel-btn"
                disabled={savingContest}
                onClick={() => setPendingContestToggle(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-contest-confirm-btn ${pendingContestToggle === 'stop' ? 'is-stop' : 'is-start'}`}
                disabled={savingContest}
                onClick={handleConfirmToggleContestActive}
              >
                {savingContest
                  ? 'Updating...'
                  : pendingContestToggle === 'stop'
                    ? 'Stop Contest'
                    : 'Start Contest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Loader for Course Cover / Trainer Photo Upload or Removal */}
      {(courseCoverBusyMode || trainerPhotoBusyMode) && (
        <div className="admin-fullscreen-loader-overlay" role="status" aria-live="polite">
          <div className="admin-fullscreen-loader-card">
            <div className="admin-loader-spinner-wrap" aria-hidden="true">
              <div className="admin-loader-ring" />
            </div>
            <strong>
              {courseCoverBusyMode === 'uploading'
                ? 'Uploading Course Cover Image...'
                : courseCoverBusyMode === 'removing'
                  ? 'Removing Course Cover Image...'
                  : trainerPhotoBusyMode === 'uploading'
                    ? 'Uploading Trainer Profile Photo...'
                    : 'Removing Trainer Profile Photo...'}
            </strong>
            <span>Please wait while Cloudinary and database update.</span>
            <div className="admin-loader-progress-track" aria-hidden="true">
              <div className="admin-loader-progress-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Lead Description Modal (Minimal, Cached On-Demand Fetch) */}
      {selectedLeadForDesc && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedLeadForDesc(null)}
        >
          <div
            className="admin-modal-dialog admin-lead-desc-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="admin-modal-title-group">
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    {selectedLeadForDesc.name}
                  </h3>
                  <p className="admin-modal-sub" style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
                    {selectedLeadForDesc.course}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedLeadForDesc(null)}
                aria-label="Close description"
              >
                <X size={18} />
              </button>
            </div>

            {leadDetailQuery.isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                <div className="skeleton-shimmer" style={{ height: 14, width: '48%', borderRadius: 4 }} />
                <div className="skeleton-shimmer" style={{ height: 68, width: '100%', borderRadius: 8 }} />
              </div>
            ) : (
              <div className="admin-lead-desc-body">
                {(() => {
                  const detail = leadDetailQuery.data
                  if (!detail) {
                    return <p className="admin-lead-desc-empty">No description available.</p>
                  }
                  const hasGoal = !!detail.goal
                  const hasSlot = !!detail.time_slot
                  const text =
                    detail.lead_type === 'demo-booking'
                      ? detail.notes || 'Free demo session requested via website.'
                      : detail.message || 'No written message provided.'
                  return (
                    <>
                      {(hasGoal || hasSlot) && (
                        <div className="admin-lead-desc-meta">
                          {hasGoal && <span><strong>Goal:</strong> {detail.goal}</span>}
                          {hasSlot && <span><strong>Slot:</strong> {detail.time_slot}</span>}
                        </div>
                      )}
                      <p className="admin-lead-desc-text">{text}</p>
                    </>
                  )
                })()}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ padding: '6px 14px', fontSize: 12.5, borderRadius: 6 }}
                onClick={() => setSelectedLeadForDesc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundColor: '#ffffff',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '14px 14px',
                    padding: '9px 34px 9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13.5,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer',
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
                    {maxStorageMB} MB free quota limit reached for testimonial media.
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
                  <strong style={{ color: '#0f172a' }}>{maxStorageMB} MB (Free Tier)</strong>
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
                  <li>Store up to 1,024 MB of high quality video testimonials.</li>
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

function CoursesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <>
      <SiteHeader onDemo={() => setModalOpen(true)} />
      <main className="subpage-shell" style={{ paddingTop: 110, paddingBottom: 60 }}>
        <div className="content-shell without-demo">
          <CoursesSection />
        </div>
      </main>
      <SiteFooter onDemo={() => setModalOpen(true)} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function NotFoundPage() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <>
      <SiteHeader onDemo={() => setModalOpen(true)} />
      <main className="not-found">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="primary-button">Back to Home</Link>
      </main>
      <SiteFooter onDemo={() => setModalOpen(true)} />
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

const SITE_ORIGIN = 'https://verbora.in'

const STATIC_ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'VERBORA — Spoken English, Public Speaking & Communication Coaching',
    description: 'VERBORA (verbora.in) — Spoken English, Business English, Public Speaking, Interview Preparation & Executive Communication Coaching.',
  },
  '/courses': {
    title: 'Courses | VERBORA — Spoken English & Communication Programs',
    description: 'Explore VERBORA structured communication programs: Spoken English, Business English, Public Speaking, Interview Preparation, and Personality Development.',
  },
  '/about': {
    title: 'About VERBORA | Speak · Express · Grow',
    description: 'Learn how VERBORA builds confident, fluent communicators through 80% active speaking practice and personalized coaching.',
  },
  '/trainer': {
    title: 'Meet Our Master Trainer | VERBORA',
    description: 'Meet Bijay Adhikari and the certified speech & voice coaching desk at VERBORA.',
  },
  '/trainers': {
    title: 'Meet Our Master Trainer | VERBORA',
    description: 'Meet Bijay Adhikari and the certified speech & voice coaching desk at VERBORA.',
  },
  '/stories': {
    title: 'Student Success Stories | VERBORA',
    description: 'Read verified transformations from VERBORA learners who mastered fluent English, presentations, and interviews.',
  },
  '/success-stories': {
    title: 'Student Success Stories | VERBORA',
    description: 'Read verified transformations from VERBORA learners who mastered fluent English, presentations, and interviews.',
  },
  '/contact': {
    title: 'Contact & Book Free Demo | VERBORA',
    description: 'Book a free 1-on-1 diagnostic call or reach out to VERBORA admissions for batch schedules and coaching details.',
  },
  '/contact-us': {
    title: 'Contact & Book Free Demo | VERBORA',
    description: 'Book a free 1-on-1 diagnostic call or reach out to VERBORA admissions for batch schedules and coaching details.',
  },
}

function RootLayout() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { courses: mergedCourses } = useMergedCourses()
  const isAdmin = pathname.startsWith('/verbora-edu-admin') || pathname.startsWith('/shivam-admin') || pathname.startsWith('/admin')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    let pageTitle = 'VERBORA | Speak · Express · Grow'
    let pageDesc = 'VERBORA (verbora.in) — Spoken English, Business English, Public Speaking, Interview Preparation & Executive Communication Coaching.'

    if (isAdmin) {
      pageTitle = 'Admin Portal | VERBORA'
    } else if (pathname.startsWith('/courses/')) {
      const slug = pathname.replace('/courses/', '').split('/')[0]
      const matched = mergedCourses.find(c => c.id === slug)
      if (matched) {
        pageTitle = `${matched.title} Course | VERBORA`
        pageDesc = `${matched.title} at VERBORA — ${matched.tagline} ${stripHtmlToText(matched.summary)}`.slice(0, 160)
      }
    } else if (STATIC_ROUTE_SEO[pathname]) {
      pageTitle = STATIC_ROUTE_SEO[pathname].title
      pageDesc = STATIC_ROUTE_SEO[pathname].description
    }

    document.title = pageTitle

    const canonicalHref = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname}`
    const canonicalEl = document.querySelector('link[rel="canonical"]')
    if (canonicalEl) canonicalEl.setAttribute('href', canonicalHref)

    const robotsEl = document.querySelector('meta[name="robots"]')
    if (robotsEl) robotsEl.setAttribute('content', isAdmin ? 'noindex, nofollow' : 'index, follow')

    const descEl = document.querySelector('meta[name="description"]')
    if (descEl) descEl.setAttribute('content', pageDesc)
  }, [pathname, isAdmin, mergedCourses])

  return (
    <>
      <Outlet />
      {!isAdmin && <WhatsAppFloatingButton />}
    </>
  )
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LandingPage })
const coursesIndexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses', component: CoursesPage })
const courseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses/$courseSlug', component: CourseDetail })
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: AboutPage })
const trainerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trainer', component: TrainerPage })
const trainersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trainers', component: TrainerPage })
const storiesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stories', component: StoriesPage })
const successStoriesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/success-stories', component: StoriesPage })
const contactRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contact', component: ContactPage })
const contactUsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contact-us', component: ContactPage })
const contestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contest', component: ContestPage })

// Admin Routes (Main portal, Leads, Testimonials, Add & Edit, Courses, Trainer, Contest)
const verboraEduAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const verboraEduAdminLeadsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/leads', component: () => <VerboraEduAdminPage defaultRoute="leads" /> })
const verboraEduAdminTestimonialsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/testimonials', component: () => <VerboraEduAdminPage defaultRoute="testimonials" /> })
const verboraEduAdminTestimonialsAddRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/testimonials/add', component: () => <VerboraEduAdminPage defaultRoute="testimonials-add" /> })
const verboraEduAdminTestimonialsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verbora-edu-admin/testimonials/edit/$id',
  component: () => <VerboraEduAdminPage defaultRoute="testimonials" />,
})
const verboraEduAdminCoursesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/courses', component: () => <VerboraEduAdminPage defaultRoute="courses" /> })
const verboraEduAdminTrainerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/trainer', component: () => <VerboraEduAdminPage defaultRoute="trainer" /> })
const verboraEduAdminContestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verbora-edu-admin/contest', component: () => <VerboraEduAdminPage defaultRoute="contest" /> })

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
const shivamAdminCoursesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/courses', component: () => <VerboraEduAdminPage defaultRoute="courses" /> })
const shivamAdminTrainerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/trainer', component: () => <VerboraEduAdminPage defaultRoute="trainer" /> })
const shivamAdminContestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shivam-admin/contest', component: () => <VerboraEduAdminPage defaultRoute="contest" /> })

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
const adminCoursesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/courses', component: () => <VerboraEduAdminPage defaultRoute="courses" /> })
const adminTrainerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/trainer', component: () => <VerboraEduAdminPage defaultRoute="trainer" /> })
const adminContestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/contest', component: () => <VerboraEduAdminPage defaultRoute="contest" /> })

const routeTree = rootRoute.addChildren([
  indexRoute,
  coursesIndexRoute,
  courseRoute,
  aboutRoute,
  trainerRoute,
  trainersRoute,
  storiesRoute,
  successStoriesRoute,
  contactRoute,
  contactUsRoute,
  contestRoute,
  verboraEduAdminRoute,
  verboraEduAdminLeadsRoute,
  verboraEduAdminTestimonialsRoute,
  verboraEduAdminTestimonialsAddRoute,
  verboraEduAdminTestimonialsEditRoute,
  verboraEduAdminCoursesRoute,
  verboraEduAdminTrainerRoute,
  verboraEduAdminContestRoute,
  shivamAdminRoute,
  shivamAdminLeadsRoute,
  shivamAdminTestimonialsRoute,
  shivamAdminTestimonialsAddRoute,
  shivamAdminTestimonialsEditRoute,
  shivamAdminCoursesRoute,
  shivamAdminTrainerRoute,
  shivamAdminContestRoute,
  adminRoute,
  adminLeadsRoute,
  adminTestimonialsRoute,
  adminTestimonialsAddRoute,
  adminTestimonialsEditRoute,
  adminCoursesRoute,
  adminTrainerRoute,
  adminContestRoute,
])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' { interface Register { router: typeof router } }

// Start fetching home courses & active testimonials in parallel before React finishes mounting
const isInitialAdminPath =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/shivam-admin') ||
    window.location.pathname.startsWith('/verbora-edu-admin'))

if (!isInitialAdminPath) {
  void queryClient.prefetchQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.courses
    },
  })
  void queryClient.prefetchQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.testimonials
    },
  })
  void queryClient.prefetchQuery({
    queryKey: ['trainer-profile'],
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.trainerProfile
    },
  })
  void queryClient.prefetchQuery({
    queryKey: ['contest-config'],
    queryFn: async () => {
      const data = await api.home.getPublicHomeData()
      return data.contestConfig
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)
