import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

interface UseUserReturn {
  user: User | null
  userId: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to get current authenticated user
 * 
 * Usage:
 * ```tsx
 * const { user, userId, loading } = useUser()
 * 
 * if (loading) return <div>Loading...</div>
 * if (!userId) return <div>Please login</div>
 * ```
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      
      setUser(currentUser)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    userId: user?.id ?? null,
    loading,
    error,
    refetch: fetchUser
  }
}

