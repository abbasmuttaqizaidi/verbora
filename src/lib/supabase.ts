import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://akutnisipdhjrrwnupeb.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nIVc7DMCydkRh3jDWP0OPA_tMfbK1Zj'

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
)

// Safe initialization that avoids runtime crashes even if environment variables are not yet provided
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Supabase] Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured yet. Running in offline/preview fallback mode.'
  )
}
