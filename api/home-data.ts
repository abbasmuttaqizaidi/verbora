export const config = {
  runtime: 'nodejs',
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://akutnisipdhjrrwnupeb.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nIVc7DMCydkRh3jDWP0OPA_tMfbK1Zj'

const COURSE_COLUMNS =
  'id,title,tagline,short,summary,cover,fee_amount,discount_percent,display_order,is_visible,is_upcoming,created_at,updated_at'
const LEGACY_COURSE_COLUMNS =
  'id,title,tagline,short,summary,fee_amount,discount_percent,display_order,created_at,updated_at'
const TESTIMONIAL_COLUMNS =
  'id,name,role,image,video,text,badge,is_active,is_spotlight,display_order,created_at'
const TRAINER_FULL_COLUMNS =
  'id,hero_kicker,name,role_title,quote,bio,photo_url,photo_size_bytes,credential_label,experience_label,learners_label,rating_label,story_heading,story_body,stats,updated_at'
const TRAINER_CORE_COLUMNS =
  'id,name,role_title,quote,bio,photo_url,photo_size_bytes,credential_label,experience_label,learners_label,rating_label,story_heading,story_body,updated_at'

async function fetchSupabaseTable(pathAndQuery: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const error: any = new Error(`Supabase REST ${response.status}: ${text}`)
    error.status = response.status
    error.body = text
    throw error
  }

  return response.json()
}

async function fetchVisibleCourses() {
  try {
    return await fetchSupabaseTable(
      `courses?select=${COURSE_COLUMNS}&is_visible=eq.true&order=display_order.asc`
    )
  } catch (err: any) {
    // Graceful fallback if is_visible/is_upcoming/cover columns have not been added on remote DB yet
    const body = String(err?.body || '')
    if (
      err?.status === 400 &&
      (body.includes('is_visible') || body.includes('is_upcoming') || body.includes('cover'))
    ) {
      return await fetchSupabaseTable(`courses?select=${LEGACY_COURSE_COLUMNS}&order=display_order.asc`)
    }
    throw err
  }
}

async function fetchTrainerProfile() {
  try {
    const rows = await fetchSupabaseTable(
      `trainer_profile?select=${TRAINER_FULL_COLUMNS}&id=eq.master-trainer&limit=1`
    )
    return Array.isArray(rows) ? rows[0] || null : null
  } catch (err: any) {
    const body = String(err?.body || '')
    if (err?.status === 400 && (body.includes('hero_kicker') || body.includes('stats'))) {
      try {
        const fallbackRows = await fetchSupabaseTable(
          `trainer_profile?select=${TRAINER_CORE_COLUMNS}&id=eq.master-trainer&limit=1`
        )
        return Array.isArray(fallbackRows) ? fallbackRows[0] || null : null
      } catch {
        return null
      }
    }
    // Table may not exist yet — client maps null safely to DEFAULT_TRAINER_PROFILE
    return null
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const fresh = req.query?.fresh === '1'
    const [courses, testimonials, trainerProfile] = await Promise.all([
      fetchVisibleCourses(),
      fetchSupabaseTable(
        `testimonials?select=${TESTIMONIAL_COLUMNS}&is_active=eq.true&order=display_order.asc,created_at.desc`
      ),
      fetchTrainerProfile(),
    ])

    res.setHeader(
      'Cache-Control',
      fresh ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300'
    )
    return res.status(200).json({ courses, testimonials, trainerProfile })
  } catch (error: any) {
    console.error('Error in /api/home-data:', error)
    return res.status(500).json({ error: error?.message || 'Failed to load home data' })
  }
}
