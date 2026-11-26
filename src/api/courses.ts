import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, Course, CourseId, UpdateCourseInput } from '../types/database'

export const DEFAULT_INITIAL_COURSES: Course[] = [
  {
    id: 'spoken-english',
    title: 'Spoken English',
    tagline: 'Speak fluently. Connect naturally.',
    short: 'Speak fluently. Be confident.',
    summary: 'Build the confidence to express yourself clearly in everyday conversations, discussions, and new situations.',
    topics: ['Everyday conversation practice', 'Pronunciation and clarity', 'Vocabulary in real situations', 'Building fluency without hesitation'],
    iconClass: 'aqua',
    cover: '/assets/courses-cover/spoken-english.png',
    fee_amount: 4999,
    discount_percent: 20,
    display_order: 1,
  },
  {
    id: 'business-english',
    title: 'Business English',
    tagline: 'Sound clear. Work confidently.',
    short: 'Excel professionally.',
    summary: 'Communicate with clarity at work, from professional emails and meetings to presenting your ideas with confidence.',
    topics: ['Professional conversations', 'Meetings and workplace vocabulary', 'Email and written communication', 'Confident presentations'],
    iconClass: 'purple',
    cover: '/assets/courses-cover/business-english.png',
    fee_amount: 6999,
    discount_percent: 25,
    display_order: 2,
  },
  {
    id: 'public-speaking',
    title: 'Public Speaking',
    tagline: 'Find your voice. Own the room.',
    short: 'Speak with impact.',
    summary: 'Learn to organize your thoughts, speak with presence, and deliver a message that people remember.',
    topics: ['Structuring a compelling talk', 'Voice and body language', 'Handling nerves and questions', 'Storytelling and audience connection'],
    iconClass: 'mint',
    cover: '/assets/courses-cover/public-speaking.png',
    fee_amount: 5999,
    discount_percent: 15,
    display_order: 3,
  },
  {
    id: 'interview-preparation',
    title: 'Interview Preparation',
    tagline: 'Show your strengths. Get ready.',
    short: 'Get Hired.',
    summary: 'Practice answering questions, communicating your strengths, and approaching important interviews with greater confidence.',
    topics: ['Introducing yourself effectively', 'Common interview scenarios', 'Answer structure and delivery', 'Mock interviews and feedback'],
    iconClass: 'amber',
    cover: '/assets/courses-cover/interview-preparation.png',
    fee_amount: 4499,
    discount_percent: 20,
    display_order: 4,
  },
  {
    id: 'personality-development',
    title: 'Personality Development',
    tagline: 'Unlock your potential. Be your best.',
    short: 'Be Your Best.',
    summary: 'Develop personal presence, emotional intelligence, body language, and the mindset to succeed in personal and professional life.',
    topics: ['Body language and self-presence', 'Active listening and emotional intelligence', 'Overcoming self-doubt and hesitation', 'Etiquette and professional demeanor'],
    iconClass: 'teal',
    cover: '/assets/courses-cover/personality-development.png',
    fee_amount: 5499,
    discount_percent: 30,
    display_order: 5,
  },
]

// In-memory runtime cache
let inMemoryCourses: Course[] = [...DEFAULT_INITIAL_COURSES]
let lastCoursesDbError: string | null = null

export function getCoursesDbError(): string | null {
  return lastCoursesDbError
}

function mergeCourseRows(rows: any[]): Course[] {
  return DEFAULT_INITIAL_COURSES.map(def => {
    const row = rows.find((d: any) => d.id === def.id)
    if (!row) return def
    return {
      ...def,
      title: row.title || def.title,
      summary: row.summary || def.summary,
      tagline: row.tagline || def.tagline,
      short: row.short || def.short,
      fee_amount: Number(row.fee_amount ?? def.fee_amount),
      discount_percent: Number(row.discount_percent ?? def.discount_percent),
      display_order: Number(row.display_order ?? def.display_order),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

/**
 * Fetch all 5 official courses (ordered by display_order)
 * Dynamic via Supabase with auto-seed if table is empty, and graceful fallback if table is missing
 */
export async function getCourses(): Promise<ApiResponse<Course[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      lastCoursesDbError = error.message || 'Unable to reach public.courses table in Supabase.'
      return { data: inMemoryCourses, error: null }
    }

    lastCoursesDbError = null

    if (data && data.length > 0) {
      const merged = mergeCourseRows(data)
      inMemoryCourses = merged
      return { data: merged, error: null }
    }

    // Table exists but has 0 rows — seed the 5 fixed courses automatically
    const seedRows = DEFAULT_INITIAL_COURSES.map(c => ({
      id: c.id,
      title: c.title,
      tagline: c.tagline,
      short: c.short,
      summary: c.summary,
      fee_amount: c.fee_amount,
      discount_percent: c.discount_percent,
      display_order: c.display_order,
    }))

    const { data: seeded, error: seedError } = await supabase
      .from('courses')
      .upsert(seedRows)
      .select()

    if (!seedError && seeded && seeded.length > 0) {
      const merged = mergeCourseRows(seeded)
      inMemoryCourses = merged
      return { data: merged, error: null }
    }

    return { data: inMemoryCourses, error: null }
  }, inMemoryCourses)
}

/**
 * Update course details (description/summary, tagline, short, fees, discount)
 * Locked to the 5 official course IDs.
 */
export async function updateCourse(
  id: CourseId,
  updates: UpdateCourseInput
): Promise<ApiResponse<Course>> {
  const defaultDef = DEFAULT_INITIAL_COURSES.find(c => c.id === id)
  if (!defaultDef) {
    return {
      data: null,
      error: `Invalid course ID "${id}". Only the 5 official courses can be edited.`,
      success: false,
    }
  }

  const existing = inMemoryCourses.find(c => c.id === id) || defaultDef
  const safeFee = updates.fee_amount !== undefined
    ? Math.max(0, Math.round(Number(updates.fee_amount) || 0))
    : existing.fee_amount
  const safeDiscount = updates.discount_percent !== undefined
    ? Math.min(100, Math.max(0, Math.round(Number(updates.discount_percent) || 0)))
    : existing.discount_percent

  const updatedRecord: Course = {
    ...existing,
    title: updates.title !== undefined && updates.title.trim() ? updates.title.trim() : existing.title,
    summary: updates.summary !== undefined ? updates.summary.trim() : existing.summary,
    tagline: updates.tagline !== undefined ? updates.tagline.trim() : existing.tagline,
    short: updates.short !== undefined ? updates.short.trim() : existing.short,
    fee_amount: safeFee,
    discount_percent: safeDiscount,
    updated_at: new Date().toISOString(),
  }

  const res = await executeQuery(async () => {
    const { data, error } = await supabase
      .from('courses')
      .upsert({
        id,
        title: updatedRecord.title,
        tagline: updatedRecord.tagline,
        short: updatedRecord.short,
        summary: updatedRecord.summary,
        fee_amount: updatedRecord.fee_amount,
        discount_percent: updatedRecord.discount_percent,
        display_order: defaultDef.display_order,
        updated_at: updatedRecord.updated_at,
      })
      .select()
      .single()

    if (error) {
      lastCoursesDbError = error.message || 'Failed to save course to Supabase.'
      return { data: null, error }
    }

    lastCoursesDbError = null
    if (data) {
      const merged = mergeCourseRows([data]).find(c => c.id === id) || updatedRecord
      inMemoryCourses = inMemoryCourses.map(c => (c.id === id ? merged : c))
      return { data: merged, error: null }
    }

    inMemoryCourses = inMemoryCourses.map(c => (c.id === id ? updatedRecord : c))
    return { data: updatedRecord, error: null }
  }, updatedRecord)

  if (res.success && res.data) {
    inMemoryCourses = inMemoryCourses.map(c => (c.id === id ? res.data! : c))
  }

  return res
}
