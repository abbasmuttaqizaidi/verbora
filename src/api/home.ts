import { Course, Testimonial } from '../types/database'
import { mergeVisibleCourseRows, getVisibleCourses } from './courses'
import { getActiveTestimonials } from './testimonials'
import { writeCachedCourses, writeCachedTestimonials } from '../lib/homeCache'

export interface PublicHomeData {
  courses: Course[]
  testimonials: Testimonial[]
}

let inflightHomeRequest: Promise<PublicHomeData> | null = null

/**
 * Fetches visible Home courses (is_visible=true) and active testimonials in a single
 * edge-cached /api/home-data request, falling back seamlessly to direct Supabase queries.
 */
export async function getPublicHomeData(bypassCache = false): Promise<PublicHomeData> {
  if (!bypassCache && inflightHomeRequest) {
    return inflightHomeRequest
  }

  const run = async (): Promise<PublicHomeData> => {
    try {
      const endpoint = bypassCache ? '/api/home-data?fresh=1' : '/api/home-data'
      const res = await fetch(endpoint, { headers: { Accept: 'application/json' } })
      const contentType = res.headers.get('content-type') || ''

      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json()
        const rawCourses = Array.isArray(json?.courses) ? json.courses : null
        const rawTestimonials = Array.isArray(json?.testimonials) ? json.testimonials : []

        if (rawCourses !== null) {
          const visibleCourses = mergeVisibleCourseRows(rawCourses)
          writeCachedCourses(visibleCourses)
          if (rawTestimonials.length > 0) {
            writeCachedTestimonials(rawTestimonials)
          }
          return {
            courses: visibleCourses,
            testimonials: rawTestimonials,
          }
        }
      }
    } catch {
      // Fallback to direct Supabase queries below
    }

    const [coursesRes, testiRes] = await Promise.all([
      getVisibleCourses(),
      getActiveTestimonials(),
    ])

    const courses = coursesRes.data || []
    const testimonials = testiRes.data || []

    writeCachedCourses(courses)
    if (testimonials.length > 0) writeCachedTestimonials(testimonials)

    return { courses, testimonials }
  }

  const promise = run().finally(() => {
    if (inflightHomeRequest === promise) {
      inflightHomeRequest = null
    }
  })

  if (!bypassCache) {
    inflightHomeRequest = promise
  }

  return promise
}
