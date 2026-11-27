import { Course, Testimonial, TrainerProfile } from '../types/database'
import { mergeVisibleCourseRows, getVisibleCourses } from './courses'
import { getActiveTestimonials } from './testimonials'
import {
  DEFAULT_TRAINER_PROFILE,
  getTrainerProfile,
  mapTrainerRow,
} from './trainer'
import {
  writeCachedCourses,
  writeCachedTestimonials,
  writeCachedTrainerProfile,
} from '../lib/homeCache'

export interface PublicHomeData {
  courses: Course[]
  testimonials: Testimonial[]
  trainerProfile: TrainerProfile
}

let inflightHomeRequest: Promise<PublicHomeData> | null = null

/**
 * Fetches visible Home courses (is_visible=true), active testimonials, and trainer profile
 * in a single edge-cached /api/home-data request, falling back seamlessly to direct Supabase queries.
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
        const rawTrainer = json?.trainerProfile ?? undefined

        if (rawCourses !== null) {
          const visibleCourses = mergeVisibleCourseRows(rawCourses)
          const trainerProfile = rawTrainer
            ? mapTrainerRow(rawTrainer)
            : { ...DEFAULT_TRAINER_PROFILE }

          writeCachedCourses(visibleCourses)
          if (rawTestimonials.length > 0) {
            writeCachedTestimonials(rawTestimonials)
          }
          writeCachedTrainerProfile(trainerProfile)

          return {
            courses: visibleCourses,
            testimonials: rawTestimonials,
            trainerProfile,
          }
        }
      }
    } catch {
      // Fallback to direct Supabase queries below
    }

    const [coursesRes, testiRes, trainerRes] = await Promise.all([
      getVisibleCourses(),
      getActiveTestimonials(),
      getTrainerProfile(),
    ])

    const courses = coursesRes.data || []
    const testimonials = testiRes.data || []
    const trainerProfile = trainerRes.data || { ...DEFAULT_TRAINER_PROFILE }

    writeCachedCourses(courses)
    if (testimonials.length > 0) writeCachedTestimonials(testimonials)
    writeCachedTrainerProfile(trainerProfile)

    return { courses, testimonials, trainerProfile }
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
