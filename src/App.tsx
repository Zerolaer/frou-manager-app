import { Outlet } from 'react-router-dom'
import React, { Suspense, lazy, useState, useEffect } from 'react'
import { AppErrorBoundary } from './components/ErrorBoundaries'
import { ToastProvider } from './lib/toast'
import { SkipLinks } from './components/AccessibleComponents'
import AppLoader from './components/AppLoader'

// Supabase configuration is now hardcoded in supabaseClient.ts

// Lazy load heavy components
const Header = lazy(() => import('./components/Header'))
const Toaster = lazy(() => import('./components/Toaster'))
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcuts'))
const OfflineSupport = lazy(() => import('./components/OfflineSupport'))

// Loading component (unused, replaced by AppLoader)
// const AppLoading = () => (
//   <div className="flex items-center justify-center min-h-screen">
//     <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
//     <span className="ml-3 text-gray-600">Загрузка приложения...</span>
//   </div>
// )

// Configuration is now hardcoded

export default function App(){
  const [currentYear, setCurrentYear] = useState<number | undefined>(undefined)

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

  // Apply mode classes to body
  React.useEffect(() => {
    const pathname = window.location.pathname.toLowerCase()
    const isTasks = pathname.includes('tasks')
    const isFinance = pathname.includes('finance')
    const isNotes = pathname.includes('notes')
    const isHome = pathname === '/'

    // Remove all mode classes
    document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'home-mode')
    
    // Add appropriate mode class
    if (isTasks) {
      document.body.classList.add('tasks-mode')
    } else if (isFinance) {
      document.body.classList.add('finance-mode')
    } else if (isNotes) {
      document.body.classList.add('notes-mode')
    } else if (isHome) {
      document.body.classList.add('home-mode')
    }
    
    return () => {
      document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'home-mode')
    }
  }, [])

  // Handle preloader completion
  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className="app-shell app-content flex flex-col h-screen overflow-x-hidden">
          <Suspense fallback={<AppLoader />}>
            <Header 
              currentYear={currentYear}
              onAction={(action) => {
                // Dispatch action to current page
                window.dispatchEvent(new CustomEvent('subheader-action', { detail: action }))
              }}
              onYearChange={(year) => {
                setCurrentYear(year)
                // Dispatch year change to current page
                window.dispatchEvent(new CustomEvent('subheader-year-change', { detail: year }))
              }}
            />
          </Suspense>
          <main 
            id="main-content"
            className="flex-1 p-4 overflow-x-hidden flex flex-col"
            style={{ backgroundColor: '#F2F7FA' }}
            role="main"
            aria-label="Основное содержимое"
          >
            <Suspense fallback={<AppLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <Suspense fallback={null}>
          <KeyboardShortcuts />
        </Suspense>
        <Suspense fallback={null}>
          <OfflineSupport />
        </Suspense>
      </AppErrorBoundary>
    </ToastProvider>
  )
}
