export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export type LeadType = 'demo-booking' | 'contact-enquiry'
export type LeadStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'

export interface LeadSummary {
  id: string
  created_at: string
  lead_type: LeadType
  name: string
  email?: string | null
  phone?: string | null
  course: string
  status: LeadStatus
}

export interface Lead extends LeadSummary {
  time_slot?: string | null
  goal?: string | null
  message?: string | null
  source?: string | null
  notes?: string | null
}

export interface LeadsPageResult {
  items: LeadSummary[]
  totalCount: number
  page: number
  pageSize: number
}

export interface LeadStats {
  totalLeads: number
  totalBookings: number
  totalContacts: number
  newLeadsCount: number
  newBookingsCount: number
  newContactsCount: number
  contactedLeadsCount: number
  leadActionRate: number
}

export type CreateLeadInput = {
  lead_type: LeadType
  name: string
  email?: string | null
  phone?: string | null
  course: string
  time_slot?: string | null
  goal?: string | null
  message?: string | null
  source?: string | null
  notes?: string | null
  status?: LeadStatus
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
  | 'executive-communication'

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
  cover_size_bytes?: number | null
  fee_amount: number // e.g. 4999 (original base price in INR)
  discount_percent: number // e.g. 20 (20% OFF)
  display_order?: number
  is_visible?: boolean
  is_upcoming?: boolean
}

export type UpdateCourseInput = {
  title?: string
  summary?: string
  tagline?: string
  short?: string
  cover?: string
  cover_size_bytes?: number | null
  fee_amount?: number
  discount_percent?: number
  is_visible?: boolean
  is_upcoming?: boolean
}
