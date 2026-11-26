export const config = {
  runtime: 'nodejs',
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://akutnisipdhjrrwnupeb.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nIVc7DMCydkRh3jDWP0OPA_tMfbK1Zj'

const COURSE_COLUMNS =
  'id,title,tagline,short,summary,fee_amount,discount_percent,display_order,created_at,updated_at'
const TESTIMONIAL_COLUMNS =
  'id,name,role,image,video,text,badge,is_active,is_spotlight,display_order,created_at'

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
    throw new Error(`Supabase REST ${response.status}: ${text}`)
  }

  return response.json()
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const fresh = req.query?.fresh === '1'
    const [courses, testimonials] = await Promise.all([
      fetchSupabaseTable(`courses?select=${COURSE_COLUMNS}&order=display_order.asc`),
      fetchSupabaseTable(
        `testimonials?select=${TESTIMONIAL_COLUMNS}&is_active=eq.true&order=display_order.asc,created_at.desc`
      ),
    ])

    res.setHeader(
      'Cache-Control',
      fresh ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300'
    )
    return res.status(200).json({ courses, testimonials })
  } catch (error: any) {
    console.error('Error in /api/home-data:', error)
    return res.status(500).json({ error: error?.message || 'Failed to load home data' })
  }
}
