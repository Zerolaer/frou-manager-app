import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense, lazy, useState, useEffect } from 'react'
import { AppErrorBoundary } from './components/ErrorBoundaries'
import { SkipLinks } from './components/AccessibleComponents'
import AppLoader from './components/AppLoader'
import { useMobileDetection } from './hooks/useMobileDetection'

// Supabase configuration is now hardcoded in supabaseClient.ts

// Lazy load heavy components
const Header = lazy(() => import('./components/Header'))
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcuts'))
const OfflineSupport = lazy(() => import('./components/OfflineSupport'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))

export default function App(){
  const { isMobile } = useMobileDetection()
  const location = useLocation()
  const [currentYear, setCurrentYear] = useState<number | undefined>(undefined)
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())
  const [tasksProjectsData, setTasksProjectsData] = useState<{
    projects: any[]
    selectedProjectIds: string[]
    activeProject: string | null
  } | null>(null)

  // Redirect to last visited page on app load (only once)
  useEffect(() => {
    const hasRedirected = sessionStorage.getItem('frovo_redirected')
    
    if (!hasRedirected && window.location.pathname === '/') {
      const isFirstVisit = !localStorage.getItem('frovo_has_visited')
      const lastPage = localStorage.getItem('frovo_last_page')
      
      if (isFirstVisit) {
        // First visit - stay on home and mark as visited
        localStorage.setItem('frovo_has_visited', 'true')
        localStorage.setItem('frovo_last_page', '/')
      } else if (lastPage && lastPage !== '/') {
        // Returning user - redirect to last page (only once per session)
        window.location.href = lastPage
      }
      
      // Mark that we've done the initial redirect check
      sessionStorage.setItem('frovo_redirected', 'true')
    }
  }, []) // Run only once on mount

  // Save current page to localStorage when navigating
  useEffect(() => {
    const pathname = window.location.pathname
    if (pathname !== '/login') {
      localStorage.setItem('frovo_last_page', pathname)
    }
  }, [])

  // Supabase is now hardcoded, no need to check

  // Listen for year changes from Finance page
  React.useEffect(() => {
    const handleFinanceYearChanged = (event: CustomEvent) => {
      setCurrentYear(event.detail)
    }
    
    window.addEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
    return () => {
      window.removeEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
    }
  }, [])

  // Listen for tasks projects data from Tasks page
  React.useEffect(() => {
    const handleTasksProjectsData = (event: CustomEvent) => {
      setTasksProjectsData(event.detail)
    }
    
    window.addEventListener('tasks-projects-data', handleTasksProjectsData as EventListener)
    return () => {
      window.removeEventListener('tasks-projects-data', handleTasksProjectsData as EventListener)
    }
  }, [])

  // Apply mode classes to body immediately and on route changes
  const applyModeClass = React.useCallback(() => {
    const pathname = window.location.pathname.toLowerCase()
    const isTasks = pathname.includes('tasks')
    const isFinance = pathname.includes('finance')
    const isNotes = pathname.includes('notes')
    const isHome = pathname === '/'

    console.log('🎨 Applying mode class:', { pathname, isFinance, isTasks, isNotes, isHome })

    // Remove all mode classes
    document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'home-mode')
    
    // Add appropriate mode class
    if (isTasks) {
      document.body.classList.add('tasks-mode')
      // Reset finance styles
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.style.height = ''
        mainContent.style.overflowY = ''
        mainContent.style.overflowX = ''
        mainContent.style.maxHeight = ''
      }
    } else if (isFinance) {
      document.body.classList.add('finance-mode')
      console.log('✅ Added finance-mode class')
      
      // Force apply finance scroll styles after a small delay
      setTimeout(() => {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          mainContent.style.height = 'calc(100vh - 172px)'
          mainContent.style.overflowY = 'auto'
          mainContent.style.overflowX = 'auto'
          mainContent.style.maxHeight = 'calc(100vh - 172px)'
          console.log('🔧 Applied finance scroll styles to #main-content')
        }
      }, 100)
    } else if (isNotes) {
      document.body.classList.add('notes-mode')
      // Reset finance styles
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.style.height = ''
        mainContent.style.overflowY = ''
        mainContent.style.overflowX = ''
        mainContent.style.maxHeight = ''
      }
    } else if (isHome) {
      document.body.classList.add('home-mode')
      // Reset finance styles
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.style.height = ''
        mainContent.style.overflowY = ''
        mainContent.style.overflowX = ''
        mainContent.style.maxHeight = ''
      }
    }
  }, [])

  // Apply immediately on mount
  React.useEffect(() => {
    applyModeClass()
  }, [applyModeClass])

  // Listen for route changes
  React.useEffect(() => {
    const handleRouteChange = () => {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        applyModeClass()
      }, 0)
    }
    
    // Listen to both popstate and custom route change events
    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('route-change', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('route-change', handleRouteChange)
    }
  }, [applyModeClass])

  // Also apply mode class when location changes (for React Router)
  React.useEffect(() => {
    applyModeClass()
  }, [applyModeClass, location.pathname])

  // Handle preloader completion
  return (
    <AppErrorBoundary>
      <SkipLinks />
      <div className="app-shell app-content flex flex-col h-screen overflow-x-hidden">
        {!isMobile && (
          <Suspense fallback={<AppLoader />}>
            <Header 
              currentYear={currentYear}
              selectedWeek={selectedWeek}
              tasksProjectsData={tasksProjectsData}
              onAction={(action) => {
                // Dispatch action to current page
                window.dispatchEvent(new CustomEvent('subheader-action', { detail: action }))
              }}
              onYearChange={(year) => {
                setCurrentYear(year)
                // Dispatch year change to current page
                window.dispatchEvent(new CustomEvent('subheader-year-change', { detail: year }))
              }}
              onWeekChange={(week) => {
                setSelectedWeek(week)
                // Dispatch week change to current page
                window.dispatchEvent(new CustomEvent('subheader-week-change', { detail: week }))
              }}
              onProjectsFilterChange={(projectIds) => {
                // Dispatch project filter change to Tasks page
                window.dispatchEvent(new CustomEvent('tasks-projects-filter-change', { detail: projectIds }))
              }}
            />
          </Suspense>
        )}
        <main 
          id="main-content"
          className={`flex-1 overflow-x-hidden flex flex-col ${isMobile ? 'p-0' : 'p-4'}`}
          style={{ backgroundColor: isMobile ? '#ffffff' : '#F2F7FA' }}
          role="main"
          aria-label="Основное содержимое"
        >
          <Suspense fallback={<AppLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Suspense fallback={null}>
        <KeyboardShortcuts />
      </Suspense>
      <Suspense fallback={null}>
        <OfflineSupport />
      </Suspense>
      <Suspense fallback={null}>
        <PWAInstallPrompt />
      </Suspense>
    </AppErrorBoundary>
  )
}
