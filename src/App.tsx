import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import AppErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './lib/toast'
import Toaster from './components/Toaster'
import { SkipLinks } from './components/AccessibleComponents'
import { useKeyboardShortcuts } from './components/KeyboardShortcuts'
import { OfflineIndicator, OfflineQueueIndicator, registerServiceWorker } from './components/OfflineSupport'
import { NotificationProvider } from './components/EnhancedNotifications'
import { ThemeProvider } from './lib/theme'

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')
  const { KeyboardShortcutsComponent } = useKeyboardShortcuts()

  // Register service worker for offline support
  React.useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SkipLinks />
        <div className={`app-shell flex ${isFinance ? 'finance-mode' : ''}`}>
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Header />
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
        <Toaster />
        <KeyboardShortcutsComponent />
        <OfflineIndicator />
        <OfflineQueueIndicator />
      </AppErrorBoundary>
    </ToastProvider>
  )
}
