import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return

      // Явный выход — доверяем без дополнительного getSession.
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        setUser(session.user)
        setLoading(false)
        return
      }

      // INITIAL_SESSION / TOKEN_REFRESHED и др. иногда приходят с session=null до финальной синхронизации.
      // Раньше это обнуляло user во всём приложении → белые экраны, navigate на Canvas и цикл «как перезагрузка».
      void supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      // Сначала очищаем локальное состояние
      setUser(null)
      setLoading(false)
      
      // Затем пытаемся выйти из Supabase (не критично если не получится)
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out from Supabase:', error)
      // Локальное состояние уже очищено, продолжаем
    }
  }

  return { 
    user, 
    loading, 
    userId: user?.id ?? null,
    email: user?.email ?? null,
    signOut
  }
}
