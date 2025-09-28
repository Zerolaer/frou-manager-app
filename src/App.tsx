import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense } from 'react'
import AppErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './lib/toast'
import { SkipLinks } from './components/AccessibleComponents'

// Import components directly (no lazy loading for now)
import Header from './components/Header'
import Toaster from './components/Toaster'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import OfflineSupport from './components/OfflineSupport'
import PerformanceMonitor from './components/PerformanceMonitor'

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <Header />
        
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
        <Toaster />
        <KeyboardShortcuts />
        <OfflineSupport />
        <PerformanceMonitor />
      </AppErrorBoundary>
    </ToastProvider>
  )
}
