import { ContestConfig, Course, Testimonial, TrainerProfile } from '../types/database'
import { mergeVisibleCourseRows, getVisibleCourses } from './courses'
import { getActiveTestimonials } from './testimonials'
import {
  DEFAULT_TRAINER_PROFILE,
  getTrainerProfile,
  mapTrainerRow,
} from './trainer'
import {
  DEFAULT_CONTEST_CONFIG,
  getContestConfig,
  mapContestRow,
} from './contest'
import {
  readCachedContestConfig,
  writeCachedContestConfig,
  writeCachedCourses,
  writeCachedTestimonials,
  writeCachedTrainerProfile,
} from '../lib/homeCache'

export interface PublicHomeData {
  courses: Course[]
  testimonials: Testimonial[]
  trainerProfile: TrainerProfile
  contestConfig: ContestConfig
}

let inflightHomeRequest: Promise<PublicHomeData> | null = null

/**
 * Fetches visible Home courses, active testimonials, trainer profile, and contest config
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
        const rawContest = json?.contestConfig ?? undefined

        if (rawCourses !== null) {
          const visibleCourses = mergeVisibleCourseRows(rawCourses)
          const trainerProfile = rawTrainer
            ? mapTrainerRow(rawTrainer)
            : { ...DEFAULT_TRAINER_PROFILE }
          const contestConfig = rawContest
            ? mapContestRow(rawContest)
            : (readCachedContestConfig() || { ...DEFAULT_CONTEST_CONFIG })

          writeCachedCourses(visibleCourses)
          if (rawTestimonials.length > 0) {
            writeCachedTestimonials(rawTestimonials)
          }
          writeCachedTrainerProfile(trainerProfile)
          if (rawContest) {
            writeCachedContestConfig(contestConfig)
          }

          return {
            courses: visibleCourses,
            testimonials: rawTestimonials,
            trainerProfile,
            contestConfig,
          }
        }
      }
    } catch {
      // Fallback to direct Supabase queries below
    }

    const [coursesRes, testiRes, trainerRes, contestRes] = await Promise.all([
      getVisibleCourses(),
      getActiveTestimonials(),
      getTrainerProfile(),
      getContestConfig(),
    ])

    const courses = coursesRes.data || []
    const testimonials = testiRes.data || []
    const trainerProfile = trainerRes.data || { ...DEFAULT_TRAINER_PROFILE }
    const contestConfig = contestRes.data || { ...DEFAULT_CONTEST_CONFIG }

    writeCachedCourses(courses)
    if (testimonials.length > 0) writeCachedTestimonials(testimonials)
    writeCachedTrainerProfile(trainerProfile)
    writeCachedContestConfig(contestConfig)

    return { courses, testimonials, trainerProfile, contestConfig }
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
