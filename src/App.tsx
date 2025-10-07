import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense, lazy, useState } from 'react'
import { AppErrorBoundary } from './components/ErrorBoundaries'
import { ToastProvider } from './lib/toast'
import { SkipLinks } from './components/AccessibleComponents'

// Supabase configuration is now hardcoded in supabaseClient.ts

// Lazy load heavy components
const Header = lazy(() => import('./components/Header'))
const Toaster = lazy(() => import('./components/Toaster'))
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcuts'))
const OfflineSupport = lazy(() => import('./components/OfflineSupport'))

// Loading component
const AppLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    <span className="ml-3 text-gray-600">Загрузка приложения...</span>
  </div>
)

// Configuration is now hardcoded

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')
  const isTasks = location.pathname.toLowerCase().includes('tasks')
  const isNotes = location.pathname.toLowerCase().includes('notes')
  const [currentYear, setCurrentYear] = useState<number | undefined>(undefined)

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

  // Apply tasks-mode class to body
  React.useEffect(() => {
    if (isTasks) {
      document.body.classList.add('tasks-mode')
    } else {
      document.body.classList.remove('tasks-mode')
    }
    
    return () => {
      document.body.classList.remove('tasks-mode')
    }
  }, [isTasks])

  // Apply finance-mode class to body
  React.useEffect(() => {
    if (isFinance) {
      document.body.classList.add('finance-mode')
    } else {
      document.body.classList.remove('finance-mode')
    }
    
    return () => {
      document.body.classList.remove('finance-mode')
    }
  }, [isFinance])

  // Apply notes-mode class to body
  React.useEffect(() => {
    if (isNotes) {
      document.body.classList.add('notes-mode')
    } else {
      document.body.classList.remove('notes-mode')
    }
    
    return () => {
      document.body.classList.remove('notes-mode')
    }
  }, [isNotes])

  // Apply home-mode class to body
  React.useEffect(() => {
    const isHome = location.pathname === '/'
    if (isHome) {
      document.body.classList.add('home-mode')
    } else {
      document.body.classList.remove('home-mode')
    }
    
    return () => {
      document.body.classList.remove('home-mode')
    }
  }, [location.pathname])

  // Handle preloader completion
  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className={`app-shell app-content flex flex-col h-screen overflow-x-hidden ${isFinance ? 'finance-mode' : ''} ${isTasks ? 'tasks-mode' : ''}`}>
          <Suspense fallback={null}>
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
            style={{ backgroundColor: '#F2F2F2' }}
            role="main"
            aria-label="Основное содержимое"
          >
            <Suspense fallback={null}>
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
