import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isMobileUI } from '@/platform/nativeApp'
import { useMobileDetection } from '@/hooks/useMobileDetection'

/** На mobile доступны только /tasks и /finance */
const MOBILE_ALLOWED = new Set(['/tasks', '/finance'])

export default function MobileRouteRedirect() {
  const { isMobile } = useMobileDetection()
  const location = useLocation()
  const navigate = useNavigate()
  const useMobileRoutes = isMobile || isMobileUI()

  useEffect(() => {
    if (!useMobileRoutes) return
    const path = location.pathname.replace(/\/$/, '') || '/'
    if (path === '/' || path === '/login' || path.startsWith('/signup') || path.startsWith('/forgot-password') || path.startsWith('/reset-password')) {
      if (path === '/') navigate('/tasks', { replace: true })
      return
    }
    if (!MOBILE_ALLOWED.has(path)) {
      navigate('/tasks', { replace: true })
    }
  }, [useMobileRoutes, location.pathname, navigate])

  return null
}
