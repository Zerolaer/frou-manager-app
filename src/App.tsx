import { Outlet, useLocation } from 'react-router-dom'
import React, { Suspense } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import AppErrorBoundary from './components/AppErrorBoundary'
import { ToastProvider } from './lib/toast'
import Toaster from './components/Toaster'

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <div className={`app-shell flex ${isFinance ? 'finance-mode' : ''}`}>
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Header />
            <div className={`content-scroll p-6 bg-gray-100 ${isFinance ? 'finance-page' : ''}`}>
              <Suspense fallback={<div className="p-6">Загрузка…</div>}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </div>
        <Toaster />
      </AppErrorBoundary>
    </ToastProvider>
  )
}
