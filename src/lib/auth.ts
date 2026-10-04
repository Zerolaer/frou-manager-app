import { logger } from '@/lib/monitoring'
import { supabase } from './supabaseClient'

let cachedUserId: string | null = null

export function setCachedUserId(id: string | null) {
  cachedUserId = id
}

export function clearCachedUserId() {
  cachedUserId = null
}

export async function getUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    logger.error('[auth] getUser error:', error.message)
    return null
  }
  cachedUserId = data.user?.id ?? null
  return cachedUserId
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedUserId = null
    return
  }
  cachedUserId = session?.user?.id ?? null
})
