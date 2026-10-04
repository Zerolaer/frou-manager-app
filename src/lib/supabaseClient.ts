import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * URL and anon key come only from Vite env. Missing values fail in every mode
 * so a clone without `.env` cannot talk to a hardcoded production project.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project keys.'
  )
}

/**
 * Loose table typing until `supabase gen types` is wired.
 */
const supabase: SupabaseClient<any, 'public', any> = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export { supabase }
