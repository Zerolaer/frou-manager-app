import SubHeader from '@/components/SubHeader'
import PageContainer from '@/components/PageContainer'
import HomeDashboard from '@/components/dashboard/HomeDashboard';

export default function HomePage() { 
  return (
    <>
      <SubHeader title="Главная" />
      <PageContainer>
        <HomeDashboard />
      </PageContainer>
    </>
  )
}
