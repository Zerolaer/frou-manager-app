import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import AppErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './lib/toast'
import { SkipLinks } from './components/AccessibleComponents'

// Lazy load heavy components
const Header = lazy(() => import('./components/Header'))
const Toaster = lazy(() => import('./components/Toaster'))
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcuts'))
const OfflineSupport = lazy(() => import('./components/OfflineSupport'))
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'))

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <Suspense fallback={<div className="h-12 bg-white border-b border-gray-300 animate-pulse" />}>
          <Header />
        </Suspense>
        
        {/* Main Content */}
        <main 
          id="main-content"
          className={`flex-1 ${isFinance ? 'finance-page' : ''}`}
          role="main"
          aria-label="Основное содержимое"
        >
          <Suspense fallback={<div className="p-4" role="status" aria-label="Загрузка содержимого">Загрузка…</div>}>
            <Outlet />
          </Suspense>
        </main>
        </div>
        
        {/* Global Components */}
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <Suspense fallback={null}>
          <KeyboardShortcuts />
        </Suspense>
        <Suspense fallback={null}>
          <OfflineSupport />
        </Suspense>
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      </AppErrorBoundary>
    </ToastProvider>
  )
}
