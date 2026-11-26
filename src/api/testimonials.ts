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

/**
 * Fetch all testimonials (ordered by display_order then created_at)
 * Fully dynamic via Supabase with fallback to DEFAULT_INITIAL_TESTIMONIALS (No localStorage)
 */
export async function getTestimonials(): Promise<ApiResponse<Testimonial[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return { data: DEFAULT_INITIAL_TESTIMONIALS, error: null }
    }

    if (data && data.length > 0) {
      return { data, error: null }
    }

    return { data: DEFAULT_INITIAL_TESTIMONIALS, error: null }
  }, DEFAULT_INITIAL_TESTIMONIALS)
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

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .insert({
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
      console.warn('[Supabase Testimonials Insert] Error:', error.message)
      return { data: newRecord, error: null }
    }

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
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.warn('[Supabase Testimonials Update] Error:', error.message)
      return {
        data: {
          id,
          created_at: new Date().toISOString(),
          name: '',
          role: '',
          image: '',
          text: '',
          is_active: true,
          ...updates,
        } as Testimonial,
        error: null,
      }
    }

    return { data, error: null }
  }, { id } as any)
}

/**
 * Delete a testimonial
 */
export async function deleteTestimonial(id: string): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('[Supabase Testimonials Delete] Error:', error.message)
    }

    return { data: true, error: null }
  }, true)
}
