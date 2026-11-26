import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, Testimonial, CreateTestimonialInput, UpdateTestimonialInput } from '../types/database'

export const TESTIMONIALS_STORAGE_KEY = 'verbora_dynamic_testimonials'

export const DEFAULT_INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'testi-rohit-verma',
    created_at: '2026-01-15T10:00:00.000Z',
    name: 'Rohit Verma',
    role: 'Software Engineer · Spoken English',
    image: '/assets/testimonials/rohit.jpg',
    video: 'https://res.cloudinary.com/mtjv4nu9/video/upload/v1795687985/VIDEO-2026-11-25-15-59-08_2.mp4',
    text: 'VERBORA helped me improve my communication and speak with genuine confidence in client calls and global team presentations.',
    badge: 'Fluency & Workplace English',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'testi-sneha-gupta',
    created_at: '2026-02-10T11:00:00.000Z',
    name: 'Sneha Gupta',
    role: 'Marketing Lead · Business English',
    image: '/assets/testimonials/sneha.jpg',
    video: 'https://res.cloudinary.com/mtjv4nu9/video/upload/v1795687985/VIDEO-2026-11-25-15-59-08_2.mp4',
    text: 'A practical learning experience with engaging sessions, constructive feedback, and continuous supportive guidance.',
    badge: 'Leadership & Impact',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'testi-aman-singh',
    created_at: '2026-03-05T09:30:00.000Z',
    name: 'Aman Singh',
    role: 'College Graduate · Interview Prep',
    image: '/assets/testimonials/aman.jpg',
    video: 'https://res.cloudinary.com/mtjv4nu9/video/upload/v1795687985/VIDEO-2026-11-25-15-59-08_2.mp4',
    text: 'The structured mock interviews and body language practice gave me the clarity and confidence to crack my dream job.',
    badge: 'Interview Success',
    is_active: true,
    display_order: 3,
  },
  {
    id: 'testi-priya-sharma',
    created_at: '2026-04-12T14:15:00.000Z',
    name: 'Priya Sharma',
    role: 'Team Lead · Public Speaking',
    image: '/assets/testimonials/priya.jpg',
    video: 'https://res.cloudinary.com/mtjv4nu9/video/upload/v1795687985/VIDEO-2026-11-25-15-59-08_2.mp4',
    text: 'Overcoming stage fright in front of a large audience was my biggest milestone. The trainers made public speaking enjoyable.',
    badge: 'Stage & Presentation',
    is_active: true,
    display_order: 4,
  },
]

export function getLocalTestimonials(): Testimonial[] {
  try {
    const raw = localStorage.getItem(TESTIMONIALS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return DEFAULT_INITIAL_TESTIMONIALS
}

export function saveLocalTestimonials(list: Testimonial[]): void {
  try {
    localStorage.setItem(TESTIMONIALS_STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

/**
 * Fetch all testimonials (ordered by display_order then created_at)
 */
export async function getTestimonials(): Promise<ApiResponse<Testimonial[]>> {
  const localList = getLocalTestimonials()

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet, return local cached/default records smoothly
      return { data: localList, error: null }
    }

    if (data && data.length > 0) {
      saveLocalTestimonials(data)
      return { data, error: null }
    }

    // If Supabase is connected but table is empty, seed local default
    return { data: localList, error: null }
  }, localList)
}

/**
 * Create a new testimonial
 */
export async function createTestimonial(input: CreateTestimonialInput): Promise<ApiResponse<Testimonial>> {
  const newRecord: Testimonial = {
    id: `testi-${Date.now()}`,
    created_at: new Date().toISOString(),
    name: input.name.trim(),
    role: input.role.trim(),
    image: input.image.trim(),
    video: input.video?.trim() || null,
    text: input.text.trim(),
    badge: input.badge?.trim() || null,
    is_active: input.is_active ?? true,
    display_order: input.display_order ?? 0,
  }

  // Update local storage first
  const currentList = getLocalTestimonials()
  const updatedList = [newRecord, ...currentList]
  saveLocalTestimonials(updatedList)

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        name: newRecord.name,
        role: newRecord.role,
        image: newRecord.image,
        video: newRecord.video,
        text: newRecord.text,
        badge: newRecord.badge,
        is_active: newRecord.is_active,
        display_order: newRecord.display_order,
      })
      .select()
      .single()

    if (error) {
      // If table missing, fallback to the local created record
      console.warn('[Supabase Testimonials] Fallback to local record:', error.message)
      return { data: newRecord, error: null }
    }

    // Keep local cache synced with DB record
    const syncedList = [data, ...currentList.filter(item => item.id !== newRecord.id)]
    saveLocalTestimonials(syncedList)

    return { data, error: null }
  }, newRecord)
}

/**
 * Update an existing testimonial
 */
export async function updateTestimonial(
  id: string,
  updates: UpdateTestimonialInput
): Promise<ApiResponse<Testimonial>> {
  const currentList = getLocalTestimonials()
  const existing = currentList.find(t => t.id === id)

  const updatedRecord: Testimonial = {
    ...(existing || {
      id,
      created_at: new Date().toISOString(),
      name: '',
      role: '',
      image: '',
      text: '',
      is_active: true,
    }),
    ...updates,
  }

  const updatedList = currentList.map(t => (t.id === id ? updatedRecord : t))
  saveLocalTestimonials(updatedList)

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.warn('[Supabase Testimonials Update] Local fallback:', error.message)
      return { data: updatedRecord, error: null }
    }

    const syncedList = currentList.map(t => (t.id === id ? data : t))
    saveLocalTestimonials(syncedList)

    return { data, error: null }
  }, updatedRecord)
}

/**
 * Delete a testimonial
 */
export async function deleteTestimonial(id: string): Promise<ApiResponse<boolean>> {
  const currentList = getLocalTestimonials()
  const filtered = currentList.filter(t => t.id !== id)
  saveLocalTestimonials(filtered)

  return executeQuery(async () => {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('[Supabase Testimonials Delete] Local delete only:', error.message)
    }

    return { data: true, error: null }
  }, true)
}
