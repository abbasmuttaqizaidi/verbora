import { Course, Testimonial } from '../types/database'

const COURSES_CACHE_KEY = 'verbora_cache_courses_v1'
const TESTIMONIALS_CACHE_KEY = 'verbora_cache_testimonials_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours max client snapshot age

interface CachedEnvelope<T> {
  ts: number
  data: T
}

function readCache<T>(key: string): T | undefined {
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
    return parsed.data.length > 0 ? parsed.data : undefined
  } catch {
    return undefined
  }
}

function writeCache<T>(key: string, data: T[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(data) || data.length === 0) {
      return
    }
    const payload: CachedEnvelope<T[]> = { ts: Date.now(), data }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function readCachedCourses(): Course[] | undefined {
  return readCache<Course[]>(COURSES_CACHE_KEY)
}

export function writeCachedCourses(courses: Course[]): void {
  writeCache(COURSES_CACHE_KEY, courses)
}

export function readCachedTestimonials(): Testimonial[] | undefined {
  return readCache<Testimonial[]>(TESTIMONIALS_CACHE_KEY)
}

export function writeCachedTestimonials(testimonials: Testimonial[]): void {
  writeCache(TESTIMONIALS_CACHE_KEY, testimonials)
}

export function clearHomeCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(COURSES_CACHE_KEY)
    window.localStorage.removeItem(TESTIMONIALS_CACHE_KEY)
  } catch {
    // Ignore storage restrictions
  }
}
