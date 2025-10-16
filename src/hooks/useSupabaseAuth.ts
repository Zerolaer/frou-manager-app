import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
