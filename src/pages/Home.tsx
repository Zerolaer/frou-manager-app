import { Navigate } from 'react-router-dom'
import HomeDashboard from '@/components/dashboard/HomeDashboard'
import { useMobileDetection } from '@/hooks/useMobileDetection'

export default function HomePage() {
  const { isMobile } = useMobileDetection()

  if (isMobile) {
    return <Navigate to="/tasks" replace />
  }

  return <HomeDashboard />
}
