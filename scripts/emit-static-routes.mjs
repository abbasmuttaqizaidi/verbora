import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ORIGIN = 'https://verbora.in'
const dist = resolve('dist')
const baseHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')

function buildRouteHtml({ path, title, description, noindex = false }) {
  const canonical = `${ORIGIN}${path === '/' ? '/' : path}`
  const robots = noindex ? 'noindex, nofollow' : 'index, follow'

  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/>/,
      `<meta name="robots" content="${robots}" />`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${canonical}" />`
    )
    .replace(
      /<meta name="twitter:url" content="[^"]*"\s*\/>/,
      `<meta name="twitter:url" content="${canonical}" />`
    )
}

const courseMeta = [
  {
    slug: 'spoken-english',
    title: 'Spoken English Course | VERBORA',
    description: 'Build fluency and everyday speaking confidence with VERBORA Spoken English coaching.',
  },
  {
    slug: 'business-english',
    title: 'Business English Course | VERBORA',
    description: 'Master workplace communication, meetings, emails, and presentations with VERBORA Business English.',
  },
  {
    slug: 'public-speaking',
    title: 'Public Speaking Course | VERBORA',
    description: 'Overcome stage fear and command any audience with VERBORA Public Speaking training.',
  },
  {
    slug: 'interview-preparation',
    title: 'Interview Preparation Course | VERBORA',
    description: 'Crack job interviews with structured answers and mock drills at VERBORA.',
  },
  {
    slug: 'personality-development',
    title: 'Personality Development Course | VERBORA',
    description: 'Develop executive presence, body language, and self-confidence with VERBORA.',
  },
  {
    slug: 'executive-communication',
    title: 'Executive Communication Course | VERBORA',
    description: 'Master high-stakes stakeholder conversations, strategic persuasion, and leadership presence with VERBORA.',
  },
]

for (const course of courseMeta) {
  const directory = resolve(dist, 'courses', course.slug)
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    resolve(directory, 'index.html'),
    buildRouteHtml({
      path: `/courses/${course.slug}`,
      title: course.title,
      description: course.description,
    })
  )
}

const pages = [
  {
    path: 'courses',
    title: 'Courses | VERBORA — Spoken English & Communication Programs',
    description: 'Explore VERBORA programs in Spoken English, Business English, Public Speaking, Interview Prep, and Personality Development.',
  },
  {
    path: 'about',
    title: 'About VERBORA | Speak · Express · Grow',
    description: 'Discover VERBORA 80% practice-driven English speaking and executive communication training.',
  },
  {
    path: 'trainer',
    title: 'Meet Our Master Trainer | VERBORA',
    description: 'Meet Bijay Adhikari and the certified speech coaching team at VERBORA.',
  },
  {
    path: 'trainers',
    title: 'Meet Our Master Trainer | VERBORA',
    description: 'Meet Bijay Adhikari and the certified speech coaching team at VERBORA.',
  },
  {
    path: 'stories',
    title: 'Student Success Stories | VERBORA',
    description: 'Read verified student success stories and speech transformations at VERBORA.',
  },
  {
    path: 'success-stories',
    title: 'Student Success Stories | VERBORA',
    description: 'Read verified student success stories and speech transformations at VERBORA.',
  },
  {
    path: 'contact',
    title: 'Contact & Book Free Demo | VERBORA',
    description: 'Book a free 1-on-1 diagnostic demo session with VERBORA.',
  },
  {
    path: 'contact-us',
    title: 'Contact & Book Free Demo | VERBORA',
    description: 'Book a free 1-on-1 diagnostic demo session with VERBORA.',
  },
  {
    path: 'contest',
    title: 'Fluency & Speaking Contest | VERBORA',
    description: 'Participate in the VERBORA Spoken English & Confidence Challenge to win scholarships, prizes, and expert speech feedback.',
  },
  { path: 'verbora-edu-admin', title: 'Admin Portal | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/leads', title: 'Admin Leads | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/testimonials', title: 'Admin Testimonials | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/testimonials/add', title: 'Add Testimonial | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/courses', title: 'Admin Courses | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/trainer', title: 'Admin Trainer Profile | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'verbora-edu-admin/contest', title: 'Admin Contest | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin', title: 'Admin Portal | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/leads', title: 'Admin Leads | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/testimonials', title: 'Admin Testimonials | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/testimonials/add', title: 'Add Testimonial | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/courses', title: 'Admin Courses | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/trainer', title: 'Admin Trainer Profile | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'shivam-admin/contest', title: 'Admin Contest | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin', title: 'Admin Portal | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/leads', title: 'Admin Leads | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/testimonials', title: 'Admin Testimonials | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/testimonials/add', title: 'Add Testimonial | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/courses', title: 'Admin Courses | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/trainer', title: 'Admin Trainer Profile | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
  { path: 'admin/contest', title: 'Admin Contest | VERBORA', description: 'VERBORA Admin Portal', noindex: true },
]

for (const page of pages) {
  const directory = resolve(dist, ...page.path.split('/'))
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    resolve(directory, 'index.html'),
    buildRouteHtml({
      path: `/${page.path}`,
      title: page.title,
      description: page.description,
      noindex: page.noindex,
    })
  )
}
