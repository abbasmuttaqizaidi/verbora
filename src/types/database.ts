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

// -------------------------------------------------------------------------
// Courses
// -------------------------------------------------------------------------

export type CourseId =
  | 'spoken-english'
  | 'business-english'
  | 'public-speaking'
  | 'interview-preparation'
  | 'personality-development'

export interface Course {
  id: CourseId
  created_at?: string
  updated_at?: string
  title: string
  tagline: string
  short: string
  summary: string
  topics?: string[]
  iconClass: string
  cover: string
  fee_amount: number // e.g. 4999 (original base price in INR)
  discount_percent: number // e.g. 20 (20% OFF)
  display_order?: number
}

export type UpdateCourseInput = {
  title?: string
  summary?: string
  tagline?: string
  short?: string
  fee_amount?: number
  discount_percent?: number
}

