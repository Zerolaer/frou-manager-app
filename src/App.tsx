import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { AppErrorBoundary } from './components/ErrorBoundaries'
import { SkipLinks } from './components/AccessibleComponents'
import PageRouteFallback from './components/PageRouteFallback'
import { useMobileDetection } from './hooks/useMobileDetection'
import { prefetchCommonRoutes } from './lib/routePrefetch'
import MobileRouteRedirect from './components/mobile/MobileRouteRedirect'
import BottomNav from './components/mobile/BottomNav'
import { isAuthPath } from './constants/authPaths'
import { ModalConfirmProvider } from './utils/modalConfirm'

// Supabase configuration is now hardcoded in supabaseClient.ts

// Lazy load heavy components
import Header from './components/Header'
import AppContentFrame from './components/AppContentFrame'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import OfflineSupport from './components/OfflineSupport'
import PWAInstallPrompt from './components/PWAInstallPrompt'

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

  // Первый визит: помечаем localStorage. Автовосстановление last_page через navigate ОТКЛЮЧЕНО —
  // оно давало циклы / ↔ /login при любых рассинхронах сессии и маршрута.
  useEffect(() => {
    const hasRedirected = sessionStorage.getItem('frovo_redirected')
    if (!hasRedirected && window.location.pathname === '/') {
      const isFirstVisit = !localStorage.getItem('frovo_has_visited')
      if (isFirstVisit) {
        localStorage.setItem('frovo_has_visited', 'true')
        localStorage.setItem('frovo_last_page', '/')
      }
      sessionStorage.setItem('frovo_redirected', 'true')
    }
  }, [])

  // Save current page when navigating (SPA), not only on первый mount
  useEffect(() => {
    const pathname = location.pathname
    if (!isAuthPath(pathname)) {
      localStorage.setItem('frovo_last_page', pathname)
    }
  }, [location.pathname])

  // Warm likely next route chunks after shell is interactive
  useEffect(() => {
    prefetchCommonRoutes({ mobile: isMobile })
  }, [isMobile])

  // Supabase is now hardcoded, no need to check

  // Listen for year changes from Finance page
  useEffect(() => {
    const handleFinanceYearChanged = (event: CustomEvent) => {
      setCurrentYear(event.detail)
    }
    
    window.addEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
    return () => {
      window.removeEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
    }
  }, [])

  // Listen for tasks projects data from Tasks page
  useEffect(() => {
    const handleTasksProjectsData = (event: CustomEvent) => {
      setTasksProjectsData(event.detail)
    }
    
    window.addEventListener('tasks-projects-data', handleTasksProjectsData as EventListener)
    return () => {
      window.removeEventListener('tasks-projects-data', handleTasksProjectsData as EventListener)
    }
  }, [])

  // Apply mode classes to body immediately and on route changes
  const applyModeClass = useCallback(() => {
    const pathname = window.location.pathname.toLowerCase()
    const isTasks = pathname.includes('tasks')
    const isFinance = pathname.includes('finance')
    const isNotes = pathname.includes('notes')
    const isCanvas = pathname.includes('canvas')
    const isInvoice = pathname.includes('invoice')
    const isSettings = pathname.includes('settings')
    const isHome = pathname === '/'

    if (import.meta.env.DEV) {
      console.log('[mode]', { pathname, isFinance, isTasks, isNotes, isInvoice, isSettings, isHome })
    }

    // Remove all mode classes
    document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'canvas-mode', 'invoice-mode', 'settings-mode', 'home-mode')
    
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
    } else if (isCanvas) {
      document.body.classList.add('canvas-mode')
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.style.height = ''
        mainContent.style.overflowY = ''
        mainContent.style.overflowX = ''
        mainContent.style.maxHeight = ''
      }
    } else if (isInvoice) {
      document.body.classList.add('invoice-mode')
      // Reset finance styles
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.style.height = ''
        mainContent.style.overflowY = ''
        mainContent.style.overflowX = ''
        mainContent.style.maxHeight = ''
      }
    } else if (isSettings) {
      document.body.classList.add('settings-mode')
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
  useEffect(() => {
    applyModeClass()
  }, [applyModeClass])

  // Listen for route changes
  useEffect(() => {
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
  useEffect(() => {
    applyModeClass()
  }, [applyModeClass, location.pathname])

  const showMobileBottomNav =
    isMobile &&
    (location.pathname === '/finance' ||
      location.pathname === '/tasks' ||
      location.pathname === '/')

  // Handle preloader completion
  return (
    <AppErrorBoundary>
      <ModalConfirmProvider>
        <MobileRouteRedirect />
        <SkipLinks />
      <div className="app-shell app-content flex flex-col h-screen overflow-hidden bg-white">
        {!isMobile && <Header />}
        <AppContentFrame
          isMobile={isMobile}
          currentYear={currentYear}
          selectedWeek={selectedWeek}
          tasksProjectsData={tasksProjectsData}
          onAction={(action) => {
            window.dispatchEvent(new CustomEvent('subheader-action', { detail: action }))
          }}
          onYearChange={(year) => {
            setCurrentYear(year)
            window.dispatchEvent(new CustomEvent('subheader-year-change', { detail: year }))
          }}
          onWeekChange={(week) => {
            setSelectedWeek(week)
            window.dispatchEvent(new CustomEvent('subheader-week-change', { detail: week }))
          }}
          onProjectsFilterChange={(projectIds) => {
            window.dispatchEvent(new CustomEvent('tasks-projects-filter-change', { detail: projectIds }))
          }}
        >
          <Suspense fallback={<PageRouteFallback />}>
            <Outlet />
          </Suspense>
        </AppContentFrame>
        {showMobileBottomNav && <BottomNav />}
      </div>
        <KeyboardShortcuts />
        <OfflineSupport />
        <PWAInstallPrompt />
      </ModalConfirmProvider>
    </AppErrorBoundary>
  )
}
