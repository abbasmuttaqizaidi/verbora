import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, Testimonial, CreateTestimonialInput, UpdateTestimonialInput } from '../types/database'

export const DEFAULT_INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'testi-rohit-verma',
    created_at: '2026-01-15T10:00:00.000Z',
    name: 'Rohit Verma',
    role: 'Software Engineer · Spoken English',
    image: '/assets/testimonials/rohit.jpg',
    video: null,
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
    video: null,
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
    video: null,
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
    video: null,
    text: 'Overcoming stage fright in front of a large audience was my biggest milestone. The trainers made public speaking enjoyable.',
    badge: 'Stage & Presentation',
    is_active: true,
    display_order: 4,
  },
]

// In-memory runtime store (zero localStorage pollution, synced with TanStack Query)
let inMemoryTestimonials: Testimonial[] = [...DEFAULT_INITIAL_TESTIMONIALS]

/**
 * Fetch all testimonials (ordered by display_order then created_at)
 * Fully dynamic via Supabase with fallback to inMemoryTestimonials
 */
export async function getTestimonials(): Promise<ApiResponse<Testimonial[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return { data: inMemoryTestimonials, error: null }
    }

    if (data && data.length > 0) {
      inMemoryTestimonials = data
      return { data, error: null }
    }

    return { data: inMemoryTestimonials, error: null }
  }, inMemoryTestimonials)
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
    video_size_bytes: input.video_size_bytes || 0,
    image_size_bytes: input.image_size_bytes || 0,
    text: input.text.trim(),
    badge: input.badge?.trim() || null,
    is_active: input.is_active ?? true,
    display_order: input.display_order ?? 0,
  }

  // Prepend to in-memory store immediately so changes are active at once
  inMemoryTestimonials = [newRecord, ...inMemoryTestimonials]

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        id: newRecord.id,
        name: newRecord.name,
        role: newRecord.role,
        image: newRecord.image,
        video: newRecord.video,
        video_size_bytes: newRecord.video_size_bytes,
        image_size_bytes: newRecord.image_size_bytes,
        text: newRecord.text,
        badge: newRecord.badge,
        is_active: newRecord.is_active,
        display_order: newRecord.display_order,
      })
      .select()
      .single()

    if (error) {
      console.warn('[Supabase Testimonials Insert] Warning:', error.message)
      return { data: newRecord, error: null }
    }

    if (data) {
      inMemoryTestimonials = inMemoryTestimonials.map(t => (t.id === newRecord.id ? data : t))
      return { data, error: null }
    }

    return { data: newRecord, error: null }
  }, newRecord)
}

/**
 * Update an existing testimonial
 */
export async function updateTestimonial(
  id: string,
  updates: UpdateTestimonialInput
): Promise<ApiResponse<Testimonial>> {
  // Update in-memory store immediately
  const existing = inMemoryTestimonials.find(t => t.id === id)
  const updatedRecord: Testimonial = {
    id,
    created_at: existing?.created_at || new Date().toISOString(),
    name: updates.name !== undefined ? updates.name : (existing?.name || ''),
    role: updates.role !== undefined ? updates.role : (existing?.role || ''),
    image: updates.image !== undefined ? updates.image : (existing?.image || ''),
    video: updates.video !== undefined ? updates.video : (existing?.video || null),
    video_size_bytes: updates.video_size_bytes !== undefined ? updates.video_size_bytes : (existing?.video_size_bytes || 0),
    image_size_bytes: updates.image_size_bytes !== undefined ? updates.image_size_bytes : (existing?.image_size_bytes || 0),
    text: updates.text !== undefined ? updates.text : (existing?.text || ''),
    badge: updates.badge !== undefined ? updates.badge : (existing?.badge || null),
    is_active: updates.is_active !== undefined ? updates.is_active : (existing?.is_active ?? true),
    display_order: updates.display_order !== undefined ? updates.display_order : (existing?.display_order || 0),
  }

  inMemoryTestimonials = inMemoryTestimonials.map(t => (t.id === id ? updatedRecord : t))

  return executeQuery(async () => {
    // Use upsert so that even mock/initial records get saved into Supabase seamlessly
    const { data, error } = await supabase
      .from('testimonials')
      .upsert({
        id,
        name: updatedRecord.name,
        role: updatedRecord.role,
        image: updatedRecord.image,
        video: updatedRecord.video,
        video_size_bytes: updatedRecord.video_size_bytes,
        image_size_bytes: updatedRecord.image_size_bytes,
        text: updatedRecord.text,
        badge: updatedRecord.badge,
        is_active: updatedRecord.is_active,
        display_order: updatedRecord.display_order,
      })
      .select()
      .single()

    if (error) {
      console.warn('[Supabase Testimonials Update/Upsert] Warning:', error.message)
      return { data: updatedRecord, error: null }
    }

    if (data) {
      inMemoryTestimonials = inMemoryTestimonials.map(t => (t.id === id ? data : t))
      return { data, error: null }
    }

    return { data: updatedRecord, error: null }
  }, updatedRecord)
}

/**
 * Delete a testimonial
 */
export async function deleteTestimonial(id: string): Promise<ApiResponse<boolean>> {
  inMemoryTestimonials = inMemoryTestimonials.filter(t => t.id !== id)

  return executeQuery(async () => {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('[Supabase Testimonials Delete] Warning:', error.message)
    }

    return { data: true, error: null }
  }, true)
}
