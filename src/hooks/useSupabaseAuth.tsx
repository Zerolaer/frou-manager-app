import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { setCachedUserId } from '@/lib/auth'

type AuthContextValue = {
  user: User | null
  loading: boolean
  userId: string | null
  email: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      setCachedUserId(nextUser?.id ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setCachedUserId(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        setUser(session.user)
        setCachedUserId(session.user.id)
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        setUser(null)
        setCachedUserId(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      signOut: async () => {
        setUser(null)
        setCachedUserId(null)
        setLoading(false)
        try {
          await supabase.auth.signOut({ scope: 'global' })
        } catch (error) {
          console.error('Error signing out from Supabase:', error)
        }
      },
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within AuthProvider')
  }
  return context
}
