import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, ContactMessage, CreateContactMessageInput } from '../types/database'

export async function submitContactMessage(input: CreateContactMessageInput): Promise<ApiResponse<ContactMessage>> {
  const fallbackRecord: ContactMessage = {
    id: `contact-${Date.now()}`,
    created_at: new Date().toISOString(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    course: input.course || null,
    goal: input.goal || null,
    message: input.message?.trim() || null,
    status: input.status || 'unread',
  }

  return executeQuery(
    async () => {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: fallbackRecord.name,
          email: fallbackRecord.email,
          phone: fallbackRecord.phone,
          course: fallbackRecord.course,
          goal: fallbackRecord.goal,
          message: fallbackRecord.message,
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

export async function getContactMessages(): Promise<ApiResponse<ContactMessage[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  }, [])
}

export async function updateContactStatus(
  id: string,
  status: ContactMessage['status']
): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)

    return { data: !error, error }
  }, true)
}

export async function deleteContactMessage(id: string): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id)

    return { data: !error, error }
  }, true)
}
