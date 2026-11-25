import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, CreateDemoBookingInput, DemoBooking } from '../types/database'

export async function createDemoBooking(input: CreateDemoBookingInput): Promise<ApiResponse<DemoBooking>> {
  const fallbackRecord: DemoBooking = {
    id: `booking-${Date.now()}`,
    created_at: new Date().toISOString(),
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    course: input.course,
    time_slot: input.time_slot || null,
    status: input.status || 'new',
    source: input.source || 'website-demo-form',
    notes: input.notes || null,
  }

  return executeQuery(
    async () => {
      const { error } = await supabase
        .from('demo_bookings')
        .insert({
          name: fallbackRecord.name,
          email: fallbackRecord.email,
          phone: fallbackRecord.phone,
          course: fallbackRecord.course,
          time_slot: fallbackRecord.time_slot,
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

export async function getDemoBookings(): Promise<ApiResponse<DemoBooking[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  }, [])
}

export async function updateBookingStatus(
  id: string,
  status: DemoBooking['status']
): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('demo_bookings')
      .update({ status })
      .eq('id', id)

    return { data: !error, error }
  }, true)
}

export async function deleteBooking(id: string): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('demo_bookings')
      .delete()
      .eq('id', id)

    return { data: !error, error }
  }, true)
}
