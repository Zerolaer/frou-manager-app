import HomeDashboard from '@/components/dashboard/HomeDashboard'
import HomeMobile from './mobile/HomeMobile'
import { useMobileDetection } from '@/hooks/useMobileDetection'

export default function HomePage() {
  const { isMobile } = useMobileDetection()
  
  if (isMobile) {
    return <HomeMobile />
  }
  
  return <HomeDashboard />
}
