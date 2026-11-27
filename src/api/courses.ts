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
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809123/verbora/courses/spoken-english.png',
    cover_size_bytes: 1951266,
    fee_amount: 4999,
    discount_percent: 20,
    display_order: 1,
    is_visible: true,
  },
  {
    id: 'business-english',
    title: 'Business English',
    tagline: 'Sound clear. Work confidently.',
    short: 'Excel professionally.',
    summary: 'Communicate with clarity at work, from professional emails and meetings to presenting your ideas with confidence.',
    topics: ['Professional conversations', 'Meetings and workplace vocabulary', 'Email and written communication', 'Confident presentations'],
    iconClass: 'purple',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809124/verbora/courses/business-english.png',
    cover_size_bytes: 1772573,
    fee_amount: 6999,
    discount_percent: 25,
    display_order: 2,
    is_visible: true,
  },
  {
    id: 'public-speaking',
    title: 'Public Speaking',
    tagline: 'Find your voice. Own the room.',
    short: 'Speak with impact.',
    summary: 'Learn to organize your thoughts, speak with presence, and deliver a message that people remember.',
    topics: ['Structuring a compelling talk', 'Voice and body language', 'Handling nerves and questions', 'Storytelling and audience connection'],
    iconClass: 'mint',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809125/verbora/courses/public-speaking.png',
    cover_size_bytes: 1959697,
    fee_amount: 5999,
    discount_percent: 15,
    display_order: 3,
    is_visible: true,
  },
  {
    id: 'interview-preparation',
    title: 'Interview Preparation',
    tagline: 'Show your strengths. Get ready.',
    short: 'Get Hired.',
    summary: 'Practice answering questions, communicating your strengths, and approaching important interviews with greater confidence.',
    topics: ['Introducing yourself effectively', 'Common interview scenarios', 'Answer structure and delivery', 'Mock interviews and feedback'],
    iconClass: 'amber',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809126/verbora/courses/interview-preparation.png',
    cover_size_bytes: 2007908,
    fee_amount: 4499,
    discount_percent: 20,
    display_order: 4,
    is_visible: true,
  },
  {
    id: 'personality-development',
    title: 'Personality Development',
    tagline: 'Unlock your potential. Be your best.',
    short: 'Be Your Best.',
    summary: 'Develop personal presence, emotional intelligence, body language, and the mindset to succeed in personal and professional life.',
    topics: ['Body language and self-presence', 'Active listening and emotional intelligence', 'Overcoming self-doubt and hesitation', 'Etiquette and professional demeanor'],
    iconClass: 'teal',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809128/verbora/courses/personality-development.png',
    cover_size_bytes: 1853331,
    fee_amount: 5499,
    discount_percent: 30,
    display_order: 5,
    is_visible: true,
  },
  {
    id: 'executive-communication',
    title: 'Executive Communication',
    tagline: 'Lead conversations. Influence rooms.',
    short: 'Lead with presence.',
    summary: 'Master high-stakes stakeholder conversations, strategic persuasion, leadership presence, and crisp executive storytelling.',
    topics: ['Boardroom & stakeholder pitching', 'Persuasive framing & conciseness', 'Handling tough Q&A with poise', 'Cross-cultural leadership fluency'],
    iconClass: 'aqua',
    cover: 'https://res.cloudinary.com/mtjv4nu9/image/upload/v1795809129/verbora/courses/executive-communication.png',
    cover_size_bytes: 1499167,
    fee_amount: 7999,
    discount_percent: 20,
    display_order: 6,
    is_visible: true,
  },
]

// In-memory runtime cache
let inMemoryCourses: Course[] = [...DEFAULT_INITIAL_COURSES]
let lastCoursesDbError: string | null = null

export function getCoursesDbError(): string | null {
  return lastCoursesDbError
}

function mapCourseRow(row: any, def: Course): Course {
  const hasExplicitCoverField = row.cover !== undefined
  const resolvedCover = hasExplicitCoverField ? (row.cover || '') : def.cover
  const resolvedCoverBytes =
    !resolvedCover
      ? 0
      : row.cover_size_bytes !== undefined && row.cover_size_bytes !== null
        ? Number(row.cover_size_bytes)
        : (def.cover_size_bytes ?? 0)

  return {
    ...def,
    title: row.title || def.title,
    summary: row.summary || def.summary,
    tagline: row.tagline || def.tagline,
    short: row.short || def.short,
    cover: resolvedCover,
    cover_size_bytes: resolvedCoverBytes,
    fee_amount: Number(row.fee_amount ?? def.fee_amount),
    discount_percent: Number(row.discount_percent ?? def.discount_percent),
    display_order: Number(row.display_order ?? def.display_order),
    is_visible: row.is_visible === undefined ? true : Boolean(row.is_visible),
    is_upcoming: row.is_upcoming === undefined ? false : Boolean(row.is_upcoming),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mergeCourseRows(rows: any[]): Course[] {
  return DEFAULT_INITIAL_COURSES.map(def => {
    const row = rows.find((d: any) => d.id === def.id)
    if (!row) return def
    return mapCourseRow(row, def)
  })
}

/**
 * Maps ONLY courses returned by the API whose visibility is enabled (is_visible !== false).
 * Does NOT resurrect hidden courses from DEFAULT_INITIAL_COURSES.
 */
export function mergeVisibleCourseRows(rows: any[]): Course[] {
  const mapped: Course[] = []
  for (const row of rows) {
    if (row?.is_visible === false) continue
    const def = DEFAULT_INITIAL_COURSES.find(d => d.id === row?.id)
    if (!def) continue
    mapped.push(mapCourseRow(row, def))
  }
  return mapped.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
}

const LEGACY_COURSE_COLUMNS =
  'id,title,tagline,short,summary,fee_amount,discount_percent,display_order,created_at,updated_at'
const COURSE_COLUMNS =
  'id,title,tagline,short,summary,cover,cover_size_bytes,fee_amount,discount_percent,display_order,is_visible,is_upcoming,created_at,updated_at'

function isMissingCourseColumnError(error: any): boolean {
  const msg = String(error?.message || error?.details || '').toLowerCase()
  return (
    msg.includes('is_visible') ||
    msg.includes('is_upcoming') ||
    msg.includes('cover') ||
    msg.includes('cover_size_bytes')
  )
}

/**
 * Fetch all official courses for Admin (ordered by display_order, including hidden ones)
 */
export async function getCourses(): Promise<ApiResponse<Course[]>> {
  return executeQuery(async () => {
    let { data, error } = await supabase
      .from('courses')
      .select(COURSE_COLUMNS)
      .order('display_order', { ascending: true })

    let missingSchemaColumn = false
    if (error && isMissingCourseColumnError(error)) {
      missingSchemaColumn = true
      const fallback = await supabase
        .from('courses')
        .select(LEGACY_COURSE_COLUMNS)
        .order('display_order', { ascending: true })
      data = fallback.data as any
      error = fallback.error
    }

    if (error) {
      lastCoursesDbError = error.message || 'Unable to reach public.courses table in Supabase.'
      return { data: inMemoryCourses, error: null }
    }

    lastCoursesDbError = missingSchemaColumn
      ? 'Course columns (cover / cover_size_bytes / is_visible / is_upcoming) not found yet — run supabase/schema.sql to enable persistent course settings.'
      : null

    if (data && data.length > 0) {
      // Auto-seed any newly added official courses missing from Supabase (only when schema is up-to-date)
      const existingIds = new Set(data.map((d: any) => d.id))
      const missingDefs = DEFAULT_INITIAL_COURSES.filter(def => !existingIds.has(def.id))
      let workingRows = data

      if (!missingSchemaColumn && missingDefs.length > 0) {
        const { data: insertedMissing } = await supabase
          .from('courses')
          .upsert(
            missingDefs.map(c => ({
              id: c.id,
              title: c.title,
              tagline: c.tagline,
              short: c.short,
              summary: c.summary,
              fee_amount: c.fee_amount,
              discount_percent: c.discount_percent,
              display_order: c.display_order,
              is_visible: c.is_visible ?? true,
              is_upcoming: c.is_upcoming ?? false,
            }))
          )
          .select(COURSE_COLUMNS)

        if (insertedMissing && insertedMissing.length > 0) {
          workingRows = [...data, ...insertedMissing]
        }
      }

      const merged = mergeCourseRows(workingRows)
      inMemoryCourses = merged
      return { data: merged, error: null }
    }

    // Table exists but has 0 rows — seed all 6 official courses automatically
    const seedRows = DEFAULT_INITIAL_COURSES.map(c => ({
      id: c.id,
      title: c.title,
      tagline: c.tagline,
      short: c.short,
      summary: c.summary,
      fee_amount: c.fee_amount,
      discount_percent: c.discount_percent,
      display_order: c.display_order,
      ...(missingSchemaColumn ? {} : { is_visible: c.is_visible ?? true, is_upcoming: c.is_upcoming ?? false }),
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
 * Fetch ONLY courses where is_visible = true for public Home / frontend views.
 */
export async function getVisibleCourses(): Promise<ApiResponse<Course[]>> {
  const fallbackVisible = inMemoryCourses.filter(c => c.is_visible !== false)
  return executeQuery(async () => {
    let { data, error } = await supabase
      .from('courses')
      .select(COURSE_COLUMNS)
      .eq('is_visible', true)
      .order('display_order', { ascending: true })

    if (error && isMissingCourseColumnError(error)) {
      const legacy = await supabase
        .from('courses')
        .select(LEGACY_COURSE_COLUMNS)
        .order('display_order', { ascending: true })
      data = legacy.data as any
      error = legacy.error
    }

    if (error) {
      return { data: fallbackVisible, error: null }
    }

    return { data: mergeVisibleCourseRows(data || []), error: null }
  }, fallbackVisible)
}

/**
 * Update course details (title, summary, tagline, short, fees, discount, visibility, upcoming)
 */
export async function updateCourse(
  id: CourseId,
  updates: UpdateCourseInput
): Promise<ApiResponse<Course>> {
  const defaultDef = DEFAULT_INITIAL_COURSES.find(c => c.id === id)
  if (!defaultDef) {
    return {
      data: null,
      error: `Invalid course ID "${id}".`,
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
  const safeVisible = updates.is_visible !== undefined
    ? Boolean(updates.is_visible)
    : existing.is_visible !== false
  const safeUpcoming = updates.is_upcoming !== undefined
    ? Boolean(updates.is_upcoming)
    : Boolean(existing.is_upcoming)

  const nextCover =
    updates.cover !== undefined ? updates.cover.trim() : existing.cover
  const nextCoverBytes =
    !nextCover
      ? 0
      : updates.cover_size_bytes !== undefined && updates.cover_size_bytes !== null
        ? Math.max(0, Number(updates.cover_size_bytes) || 0)
        : (existing.cover_size_bytes ?? defaultDef.cover_size_bytes ?? 0)

  const updatedRecord: Course = {
    ...existing,
    title: updates.title !== undefined && updates.title.trim() ? updates.title.trim() : existing.title,
    summary: updates.summary !== undefined ? updates.summary.trim() : existing.summary,
    tagline: updates.tagline !== undefined ? updates.tagline.trim() : existing.tagline,
    short: updates.short !== undefined ? updates.short.trim() : existing.short,
    cover: nextCover,
    cover_size_bytes: nextCoverBytes,
    fee_amount: safeFee,
    discount_percent: safeDiscount,
    is_visible: safeVisible,
    is_upcoming: safeUpcoming,
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
        cover: updatedRecord.cover || null,
        cover_size_bytes: updatedRecord.cover_size_bytes ?? 0,
        fee_amount: updatedRecord.fee_amount,
        discount_percent: updatedRecord.discount_percent,
        display_order: defaultDef.display_order,
        is_visible: updatedRecord.is_visible,
        is_upcoming: updatedRecord.is_upcoming,
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
