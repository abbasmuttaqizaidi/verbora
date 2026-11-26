export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface DemoBooking {
  id: string
  created_at: string
  name: string
  email?: string | null
  phone?: string | null
  course: string
  time_slot?: string | null
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'
  source?: string
  notes?: string | null
}

export type CreateDemoBookingInput = {
  name: string
  email?: string | null
  phone?: string | null
  course: string
  time_slot?: string | null
  source?: string
  notes?: string | null
  status?: DemoBooking['status']
}

export interface ContactMessage {
  id: string
  created_at: string
  name: string
  email: string
  phone?: string | null
  course?: string | null
  goal?: string | null
  message?: string | null
  status: 'unread' | 'read' | 'replied' | 'archived'
}

export type CreateContactMessageInput = {
  name: string
  email: string
  phone?: string | null
  course?: string | null
  goal?: string | null
  message?: string | null
  status?: ContactMessage['status']
}

export interface NewsletterSubscriber {
  id: string
  created_at: string
  email: string
  status: 'active' | 'unsubscribed'
}

export interface Testimonial {
  id: string
  created_at: string
  name: string
  role: string
  image: string
  video?: string | null
  text: string
  badge?: string | null
  is_active: boolean
  is_spotlight?: boolean
  display_order?: number
  video_size_bytes?: number | null
  image_size_bytes?: number | null
}

export type CreateTestimonialInput = {
  name: string
  role: string
  image: string
  video?: string | null
  text: string
  badge?: string | null
  is_active?: boolean
  is_spotlight?: boolean
  display_order?: number
  video_size_bytes?: number | null
  image_size_bytes?: number | null
}

export type UpdateTestimonialInput = Partial<CreateTestimonialInput>

