import { Course, Testimonial, TrainerProfile, ContestConfig } from '../types/database'

const COURSES_CACHE_KEY = 'verbora_cache_courses_v5'
const TESTIMONIALS_CACHE_KEY = 'verbora_cache_testimonials_v1'
const TRAINER_CACHE_KEY = 'verbora_cache_trainer_v1'
const CONTEST_CACHE_KEY = 'verbora_cache_contest_v1'
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

function readObjectCache<T>(key: string): T | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined
    const raw = window.localStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedEnvelope<T>
    if (!parsed || typeof parsed.ts !== 'number' || !parsed.data || typeof parsed.data !== 'object') {
      return undefined
    }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.localStorage.removeItem(key)
      return undefined
    }
    return parsed.data
  } catch {
    return undefined
  }
}

function writeObjectCache<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !data) {
      return
    }
    const payload: CachedEnvelope<T> = { ts: Date.now(), data }
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
  return readObjectCache<TrainerProfile>(TRAINER_CACHE_KEY)
}

export function writeCachedTrainerProfile(profile: TrainerProfile): void {
  writeObjectCache(TRAINER_CACHE_KEY, profile)
}

export function readCachedContestConfig(): ContestConfig | undefined {
  return readObjectCache<ContestConfig>(CONTEST_CACHE_KEY)
}

export function writeCachedContestConfig(config: ContestConfig): void {
  writeObjectCache(CONTEST_CACHE_KEY, config)
}

export function clearHomeCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(COURSES_CACHE_KEY)
    window.localStorage.removeItem(TESTIMONIALS_CACHE_KEY)
    window.localStorage.removeItem(TRAINER_CACHE_KEY)
    window.localStorage.removeItem(CONTEST_CACHE_KEY)
  } catch {
    // Ignore storage restrictions
  }
}
