import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { isSessionFresh } from '@/lib/authFlow'

/** Redirect authenticated users away from login/signup/forgot-password. */
export function useGuestOnly(redirectTo = '/') {
  const navigate = useNavigate()
  // Show the form immediately so a stale session cannot flash white ↔ login in a loop.
  const [ready, setReady] = useState(true)
  const redirectedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const goApp = () => {
      if (!mounted || redirectedRef.current) return
      redirectedRef.current = true
      navigate(redirectTo, { replace: true })
    }

    const stayOnPage = () => {
      if (!mounted) return
      redirectedRef.current = false
      setReady(true)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        stayOnPage()
        return
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && isSessionFresh(session)) {
        goApp()
        return
      }

      if (event === 'INITIAL_SESSION') {
        stayOnPage()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate, redirectTo])

  return ready
}
