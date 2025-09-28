import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import AppErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './lib/toast'
import { SkipLinks } from './components/AccessibleComponents'

// Lazy load heavy components
const Header = lazy(() => import('./components/Header'))
const Sidebar = lazy(() => import('./components/Sidebar'))
const Toaster = lazy(() => import('./components/Toaster'))
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcutsWrapper'))
const OfflineSupport = lazy(() => import('./components/OfflineSupportWrapper'))
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'))

// Loading component
const AppLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    <span className="ml-3 text-gray-600">Загрузка приложения...</span>
  </div>
)

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className={`app-shell flex ${isFinance ? 'finance-mode' : ''}`}>
          <Suspense fallback={<div className="w-64 bg-gray-50 animate-pulse" />}>
            <Sidebar />
          </Suspense>
          <div className="flex-1 min-w-0 flex flex-col">
            <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200 animate-pulse" />}>
              <Header />
            </Suspense>
            <main 
              id="main-content"
              className={`content-scroll p-6 bg-gray-100 ${isFinance ? 'finance-page' : ''}`}
              role="main"
              aria-label="Основное содержимое"
            >
              <Suspense fallback={<div className="p-6" role="status" aria-label="Загрузка содержимого">Загрузка…</div>}>
                <Outlet />
              </Suspense>
            </main>
          </div>
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
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      </AppErrorBoundary>
    </ToastProvider>
  )
}
