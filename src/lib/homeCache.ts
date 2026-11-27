import { Course, Testimonial, TrainerProfile } from '../types/database'

const COURSES_CACHE_KEY = 'verbora_cache_courses_v4'
const TESTIMONIALS_CACHE_KEY = 'verbora_cache_testimonials_v1'
const TRAINER_CACHE_KEY = 'verbora_cache_trainer_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours max client snapshot age

interface CachedEnvelope<T> {
  ts: number
  data: T
}

function readCache<T>(key: string, allowEmpty = false): T | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined
    const raw = window.localStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedEnvelope<T>
    if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.data)) {
      return undefined
    }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.localStorage.removeItem(key)
      return undefined
    }
    return allowEmpty || parsed.data.length > 0 ? parsed.data : undefined
  } catch {
    return undefined
  }
}

function writeCache<T>(key: string, data: T[], allowEmpty = false): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(data)) {
      return
    }
    if (!allowEmpty && data.length === 0) {
      return
    }
    const payload: CachedEnvelope<T[]> = { ts: Date.now(), data }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function readCachedCourses(): Course[] | undefined {
  return readCache<Course[]>(COURSES_CACHE_KEY, true)
}

export function writeCachedCourses(courses: Course[]): void {
  writeCache(COURSES_CACHE_KEY, courses, true)
}

export function readCachedTestimonials(): Testimonial[] | undefined {
  return readCache<Testimonial[]>(TESTIMONIALS_CACHE_KEY)
}

export function writeCachedTestimonials(testimonials: Testimonial[]): void {
  writeCache(TESTIMONIALS_CACHE_KEY, testimonials)
}

export function readCachedTrainerProfile(): TrainerProfile | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined
    const raw = window.localStorage.getItem(TRAINER_CACHE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedEnvelope<TrainerProfile>
    if (!parsed || typeof parsed.ts !== 'number' || !parsed.data || typeof parsed.data !== 'object') {
      return undefined
    }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.localStorage.removeItem(TRAINER_CACHE_KEY)
      return undefined
    }
    return parsed.data
  } catch {
    return undefined
  }
}

export function writeCachedTrainerProfile(profile: TrainerProfile): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !profile) {
      return
    }
    const payload: CachedEnvelope<TrainerProfile> = { ts: Date.now(), data: profile }
    window.localStorage.setItem(TRAINER_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function clearHomeCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(COURSES_CACHE_KEY)
    window.localStorage.removeItem(TESTIMONIALS_CACHE_KEY)
    window.localStorage.removeItem(TRAINER_CACHE_KEY)
  } catch {
    // Ignore storage restrictions
  }
}
