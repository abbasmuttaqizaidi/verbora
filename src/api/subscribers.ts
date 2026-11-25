import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import { ApiResponse, NewsletterSubscriber } from '../types/database'

export async function subscribeNewsletter(email: string): Promise<ApiResponse<NewsletterSubscriber>> {
  const fallbackRecord: NewsletterSubscriber = {
    id: `sub-${Date.now()}`,
    created_at: new Date().toISOString(),
    email: email.trim().toLowerCase(),
    status: 'active',
  }

  return executeQuery(
    async () => {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: fallbackRecord.email,
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

export async function getSubscribers(): Promise<ApiResponse<NewsletterSubscriber[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  }, [])
}

export async function deleteSubscriber(id: string): Promise<ApiResponse<boolean>> {
  return executeQuery(async () => {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)

    return { data: !error, error }
  }, true)
}
