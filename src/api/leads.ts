import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import {
  ApiResponse,
  CreateLeadInput,
  Lead,
  LeadStats,
  LeadStatus,
  LeadSummary,
  LeadsPageResult,
} from '../types/database'

const LEAD_SUMMARY_COLUMNS = 'id,created_at,lead_type,name,email,phone,course,status'
const LEAD_DETAIL_COLUMNS =
  'id,created_at,lead_type,name,email,phone,course,time_slot,goal,message,source,notes,status'

export const LEADS_PAGE_SIZE = 20

export async function createLead(input: CreateLeadInput): Promise<ApiResponse<Lead>> {
  const fallbackRecord: Lead = {
    id: `lead-${Date.now()}`,
    created_at: new Date().toISOString(),
    lead_type: input.lead_type,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    course: input.course || 'General Coaching',
    time_slot: input.time_slot || null,
    goal: input.goal || null,
    message: input.message?.trim() || null,
    source: input.source || 'website',
    notes: input.notes || null,
    status: input.status || 'new',
  }

  return executeQuery(
    async () => {
      const { error } = await supabase
        .from('leads')
        .insert({
          lead_type: fallbackRecord.lead_type,
          name: fallbackRecord.name,
          email: fallbackRecord.email,
          phone: fallbackRecord.phone,
          course: fallbackRecord.course,
          time_slot: fallbackRecord.time_slot,
          goal: fallbackRecord.goal,
          message: fallbackRecord.message,
          source: fallbackRecord.source,
          notes: fallbackRecord.notes,
          status: fallbackRecord.status,
        })

      if (error) {
        return { data: null, error }
      }

      return { data: fallbackRecord, error: null }
    },
    fallbackRecord
  )
}

/**
 * Optimized paginated leads query: fetches ONLY columns rendered in the admin table
 * (excluding heavy description/message/notes fields until requested).
 */
export async function getLeadsPage({
  page = 1,
  pageSize = LEADS_PAGE_SIZE,
  search = '',
  status = 'all',
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
} = {}): Promise<ApiResponse<LeadsPageResult>> {
  const safePage = Math.max(1, page)
  const from = (safePage - 1) * pageSize
  const to = from + pageSize - 1

  return executeQuery(async () => {
    let query = supabase
      .from('leads')
      .select(LEAD_SUMMARY_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const trimmed = search.trim()
    if (trimmed) {
      const safePattern = trimmed.replace(/[%_,()]/g, '')
      if (safePattern) {
        query = query.or(
          `name.ilike.%${safePattern}%,phone.ilike.%${safePattern}%,email.ilike.%${safePattern}%,course.ilike.%${safePattern}%`
        )
      }
    }

    const { data, count, error } = await query

    if (error) {
      return { data: null, error }
    }

    return {
      data: {
        items: (data || []) as LeadSummary[],
        totalCount: count ?? 0,
        page: safePage,
        pageSize,
      },
      error: null,
    }
  }, { items: [], totalCount: 0, page: safePage, pageSize })
}

/**
 * Fetches full description/details for a single lead on demand (when clicking View Description).
 */
export async function getLeadDetails(id: string): Promise<ApiResponse<Lead>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select(LEAD_DETAIL_COLUMNS)
      .eq('id', id)
      .single()

    return { data: (data as Lead) || null, error }
  })
}

/**
 * Lightweight zero-row-payload count queries for Admin KPI cards.
 */
export async function getLeadStats(): Promise<ApiResponse<LeadStats>> {
  const emptyStats: LeadStats = {
    totalLeads: 0,
    totalBookings: 0,
    totalContacts: 0,
    newLeadsCount: 0,
    newBookingsCount: 0,
    newContactsCount: 0,
    contactedLeadsCount: 0,
    leadActionRate: 0,
  }

  return executeQuery(async () => {
    const [totalRes, bookingsRes, newRes, newBookingsRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('lead_type', 'demo-booking'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('lead_type', 'demo-booking')
        .eq('status', 'new'),
    ])

    const firstError = totalRes.error || bookingsRes.error || newRes.error || newBookingsRes.error
    if (firstError) {
      return { data: null, error: firstError }
    }

    const totalLeads = totalRes.count ?? 0
    const totalBookings = bookingsRes.count ?? 0
    const totalContacts = Math.max(0, totalLeads - totalBookings)
    const newLeadsCount = newRes.count ?? 0
    const newBookingsCount = newBookingsRes.count ?? 0
    const newContactsCount = Math.max(0, newLeadsCount - newBookingsCount)
    const contactedLeadsCount = Math.max(0, totalLeads - newLeadsCount)
    const leadActionRate = totalLeads > 0 ? Math.round((contactedLeadsCount / totalLeads) * 100) : 0

    return {
      data: {
        totalLeads,
        totalBookings,
        totalContacts,
        newLeadsCount,
        newBookingsCount,
        newContactsCount,
        contactedLeadsCount,
        leadActionRate,
      },
      error: null,
    }
  }, emptyStats)
}

/**
 * Full export query triggered only when admin explicitly exports CSV.
 */
export async function getAllLeadsForExport({
  search = '',
  status = 'all',
}: {
  search?: string
  status?: string
} = {}): Promise<ApiResponse<Lead[]>> {
  return executeQuery(async () => {
    let query = supabase
      .from('leads')
      .select(LEAD_DETAIL_COLUMNS)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const trimmed = search.trim()
    if (trimmed) {
      const safePattern = trimmed.replace(/[%_,()]/g, '')
      if (safePattern) {
        query = query.or(
          `name.ilike.%${safePattern}%,phone.ilike.%${safePattern}%,email.ilike.%${safePattern}%,course.ilike.%${safePattern}%`
        )
      }
    }

    const { data, error } = await query
    return { data: (data as Lead[]) || [], error }
  }, [])
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)

    return { data: !error, error }
  }, true)
}

export async function deleteLead(id: string): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    return { data: !error, error }
  }, true)
}
