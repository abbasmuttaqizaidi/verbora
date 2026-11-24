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
  BriefcaseBusiness, CalendarDays, Check,
  CheckCircle2, ChevronDown, CirclePlay, Clock, GraduationCap, Handshake,
  Headphones, Mail, Menu, MessageCircle, Mic2, MonitorPlay, Phone,
  Rocket, Search, ShieldCheck, Sparkles, Star, TrendingUp, UsersRound,
  X, ClipboardCheck, MoveRight, Instagram, Youtube, Linkedin,
  Quote,
} from 'lucide-react'
import './styles.css'
import './adjustments.css'

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

type DemoValues = { name: string; email: string; phone: string; course: CourseId | '' }

const initialValues: DemoValues = { name: '', email: '', phone: '', course: '' }

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

function DemoForm({ inModal = false }: { inModal?: boolean }) {
  const [values, setValues] = useState<DemoValues>(initialValues)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done' | 'preview'>('idle')

  function update<K extends keyof DemoValues>(key: K, value: DemoValues[K]) {
    setValues(old => ({ ...old, [key]: value }))
    if (error) setError('')
    if (phase !== 'idle') setPhase('idle')
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (values.name.trim().length < 2) return setError('Please enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return setError('Please enter a valid email address.')
    if (values.phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid phone number.')
    if (!values.course) return setError('Please select a course.')

    const endpoint = import.meta.env.VITE_DEMO_ENDPOINT as string | undefined
    if (!endpoint) {
      setPhase('preview')
      return
    }

    try {
      setPhase('sending')
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, name: values.name.trim(), email: values.email.trim() }),
      })
      if (!response.ok) throw new Error('Request could not be sent')
      setPhase('done')
      setValues(initialValues)
    } catch {
      setError('We could not submit your request. Please try again later.')
      setPhase('idle')
    }
  }

  return (
    <div className={`demo-card ${inModal ? 'demo-card-modal' : ''}`} id={inModal ? undefined : 'demo-form'}>
      <div className="demo-watermark" aria-hidden="true" />
      <div className="demo-heading-row">
        <div>
          <Brand compact />
          <h2>Book Free <em>Demo</em></h2>
          <p>Experience our approach and discover how VERBORA can support your communication goals.</p>
          <span className="yellow-rule" />
        </div>
        <div className="demo-illustration" aria-hidden="true">
          <div className="illustration-halo" />
          <div className="illustration-screen"><CirclePlay size={40} strokeWidth={1.6} /><span className="screen-line" /><span className="screen-line short" /></div>
          <span className="illustration-spark">✦</span>
        </div>
      </div>
      {phase === 'done' ? (
        <div className="form-result" role="status"><CheckCircle2 size={38} /><h3>Request received!</h3><p>Thank you. Your demo enquiry has been submitted.</p><button className="text-button" onClick={() => setPhase('idle')}>Book another demo</button></div>
      ) : phase === 'preview' ? (
        <div className="form-result" role="status"><ClipboardCheck size={38} /><h3>Form looks good!</h3><p>Your details passed validation. This preview is not yet connected to a CRM or email inbox, so nothing was sent.</p><button className="text-button" onClick={() => setPhase('idle')}>Edit my details</button></div>
      ) : (
        <form onSubmit={submit} noValidate>
          <label className="field"><UsersRound size={18} /><input aria-label="Your name" autoComplete="name" placeholder="Your Name" value={values.name} onChange={e => update('name', e.target.value)} required /></label>
          <label className="field"><Mail size={18} /><input aria-label="Your email" autoComplete="email" type="email" placeholder="Your Email" value={values.email} onChange={e => update('email', e.target.value)} required /></label>
          <label className="field"><Phone size={18} /><input aria-label="Your phone number" autoComplete="tel" type="tel" placeholder="Your Phone Number" value={values.phone} onChange={e => update('phone', e.target.value)} required /></label>
          <label className="field field-select"><GraduationCap size={19} /><select aria-label="Select course" value={values.course} onChange={e => update('course', e.target.value as CourseId | '')} required><option value="">Select Course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select><ChevronDown size={16} className="select-arrow" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button demo-submit" type="submit" disabled={phase === 'sending'}><CalendarDays size={18} />{phase === 'sending' ? 'Sending…' : 'Book My Free Demo'}</button>
          <div className="form-trust"><ShieldCheck size={15} /><span>Free enquiry</span><i /> <span>No spam intended</span></div>
          {!import.meta.env.VITE_DEMO_ENDPOINT && <p className="preview-note">Preview form · CRM connection pending</p>}
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

  const filtered = courses.filter(course => `${course.title} ${course.summary}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand compact />
        <nav className={`navigation ${menuOpen ? 'navigation-open' : ''}`} aria-label="Main navigation">
          <a href="/#home" className="nav-home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/#about" onClick={() => setMenuOpen(false)}>About Us</a>
          <div className="courses-menu-wrap">
            <button className="nav-dropdown" aria-expanded={coursesOpen} onClick={() => setCoursesOpen(open => !open)}>Courses <ChevronDown size={14} /></button>
            {coursesOpen && <div className="course-dropdown">{courses.map(course => <Link key={course.id} to="/courses/$courseSlug" params={{ courseSlug: course.id }} onClick={() => { setCoursesOpen(false); setMenuOpen(false) }}><course.icon size={18} /><span>{course.title}</span></Link>)}</div>}
          </div>
          <a href="/#trainers" onClick={() => setMenuOpen(false)}>Trainers</a>
          <a href="/#stories" onClick={() => setMenuOpen(false)}>Success Stories</a>
          <a href="/#resources" onClick={() => setMenuOpen(false)}>Blog</a>
          <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <button className="search-button" aria-label="Search courses" onClick={() => setSearchOpen(open => !open)}><Search size={20} /></button>
          <button className="primary-button header-join" onClick={onDemo}>Join Now <MoveRight size={15} /></button>
          <button className="mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {searchOpen && <div className="search-panel"><div className="search-input-row"><Search size={19} /><input aria-label="Search courses" autoFocus placeholder="Find the right program…" value={search} onChange={e => setSearch(e.target.value)} /><button aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={18} /></button></div><div className="search-results">{filtered.length ? filtered.map(course => <Link key={course.id} to="/courses/$courseSlug" params={{ courseSlug: course.id }}><course.icon size={18} />{course.title}<MoveRight size={16} /></Link>) : <p>No matching courses found.</p>}</div></div>}
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="home">
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
      <div className="hero-visual" role="img" aria-label="Learners together on a campus, based on the supplied VERBORA design reference" />
      <div className="hero-photo-gradient" aria-hidden="true" />
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

function FocusStrip() {
  return <section className="focus-strip"><div className="focus-heading"><span className="focus-line" /><BriefcaseBusiness size={21} /><h2>Speak English with VERBORA. Show up confidently wherever you go.</h2><span className="focus-line" /></div><div className="focus-tags"><span>Interviews</span><span>Workplace Meetings</span><span>Presentations</span><span>Networking</span><span>Everyday Life</span></div></section>
}

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
              <li><a href="/#home">Home</a></li>
              <li><a href="/#courses">Courses</a></li>
              <li><a href="/#about">Why VERBORA</a></li>
              <li><a href="/#stories">Stories</a></li>
              <li><a href="/#resources">Learning Desk</a></li>
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

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => { if (!open) return; const keyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', keyDown); return () => window.removeEventListener('keydown', keyDown) }, [open, onClose])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="modal-content" role="dialog" aria-modal="true" aria-label="Book a free demo"><button className="modal-close" aria-label="Close demo form" onClick={onClose}><X size={20} /></button><DemoForm inModal /></div></div>
}

function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const showDemo = () => setModalOpen(true)

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
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function CourseDetail() {
  const { courseSlug } = courseRoute.useParams()
  const course = courses.find(entry => entry.id === courseSlug)
  const [modalOpen, setModalOpen] = useState(false)
  if (!course) return <><SiteHeader onDemo={() => setModalOpen(true)} /><main className="not-found"><h1>Course not found</h1><p>We couldn't find that program.</p><Link to="/" className="primary-button">Back to Home</Link></main><SiteFooter onDemo={() => setModalOpen(true)} /><DemoModal open={modalOpen} onClose={() => setModalOpen(false)} /></>
  return <><SiteHeader onDemo={() => setModalOpen(true)} /><main className="course-detail-page"><div className="course-detail-banner"><div className="detail-crumb"><Link to="/">Home</Link><span>/</span><a href="/#courses">Courses</a><span>/</span><strong>{course.title}</strong></div><span className={`course-icon ${course.iconClass}`}><course.icon size={38} /></span><h1>{course.title}</h1><p>{course.tagline}</p><button className="primary-button" onClick={() => setModalOpen(true)}>Book a Free Demo</button></div><div className="course-detail-body"><div><span className="section-kicker">The Program</span><h2>Find your voice. <span>Grow your confidence.</span></h2><p>{course.summary}</p><p>Sessions are designed around communication practice and practical feedback. Contact VERBORA to confirm the batch schedule, course format, fees, and trainer details.</p></div><div className="topic-card"><h3>What you'll work on</h3>{course.topics.map(topic => <div key={topic}><Check size={18} /><span>{topic}</span></div>)}</div></div><div className="detail-other"><h2>Explore more programs</h2><div className="course-grid">{courses.filter(entry => entry.id !== course.id).map(entry => <Link key={entry.id} to="/courses/$courseSlug" params={{ courseSlug: entry.id }} className="course-card"><img src={entry.cover} alt={entry.title} className="course-card-img" /><div className="course-card-overlay"><span className="course-card-icon-wrap"><entry.icon size={19} strokeWidth={2.4} /></span><strong className="course-card-heading">{entry.title}</strong><span className="course-card-subheading">{entry.short}</span></div></Link>)}</div></div></main><SiteFooter onDemo={() => setModalOpen(true)} /><DemoModal open={modalOpen} onClose={() => setModalOpen(false)} /></>
}

function RootLayout() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return <Outlet />
}

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LandingPage })
const courseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses/$courseSlug', component: CourseDetail })
const routeTree = rootRoute.addChildren([indexRoute, courseRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' { interface Register { router: typeof router } }

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
