import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

/** Redirect authenticated users away from login/signup/forgot-password. */
export function useGuestOnly(redirectTo = '/') {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const redirectedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted || redirectedRef.current) return
        if (data.session) {
          redirectedRef.current = true
          navigate(redirectTo, { replace: true })
        } else {
          setReady(true)
        }
      })
      .catch(() => {
        if (mounted) setReady(true)
      })

    return () => {
      mounted = false
    }
  }, [navigate, redirectTo])

  return ready
}
