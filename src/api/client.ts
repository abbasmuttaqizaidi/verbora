import { ApiResponse } from '../types/database'
import { isSupabaseConfigured } from '../lib/supabase'

export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  mockFallback?: T
): Promise<ApiResponse<T>> {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      console.warn('[Supabase API] Operation skipped because Supabase is not configured yet.')
    }
    return {
      data: mockFallback ?? null,
      error: null,
      success: true,
    }
  }

  try {
    const { data, error } = await queryFn()

    if (error) {
      console.error('[Supabase API Error]', error)
      return {
        data: null,
        error: error.message || 'An unexpected error occurred while communicating with database.',
        success: false,
      }
    }

    return {
      data,
      error: null,
      success: true,
    }
  } catch (err: any) {
    console.error('[Supabase Network/Unexpected Error]', err)
    return {
      data: null,
      error: err?.message || 'Network connection failed.',
      success: false,
    }
  }
}
