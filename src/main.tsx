import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
import './preloader.css'
import App from './App'
import { LazyPages } from './utils/codeSplitting'
import { supabase } from './lib/supabaseClient'

import { preloadCriticalResources, analyzeBundleSize, registerServiceWorker } from './utils/performance'
import { isDevelopment } from './lib/env'
import { clearQueryCache } from './hooks/useSupabaseQuery'
import { indexedDBCache } from './lib/indexedDbCache'
import { cacheMonitor } from './lib/cacheMonitor'

// Register service worker for caching
registerServiceWorker()

// Preload critical resources
preloadCriticalResources()

// Analyze bundle size in development
if (isDevelopment()) {
  setTimeout(analyzeBundleSize, 2000)
}

// Expose cache utilities globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__cache = {
    // Clear all caches
    clearAll: async () => {
      clearQueryCache()
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('✅ All caches cleared')
    },
    // Clear query cache only
    clearQueries: () => {
      clearQueryCache()
      console.log('✅ Query cache cleared')
    },
    // Clear IndexedDB only
    clearDB: async () => {
      await indexedDBCache.clear()
      console.log('✅ IndexedDB cleared')
    },
    // Show cache stats
    stats: () => {
      cacheMonitor.logReport()
    },
    // Show all cache keys
    keys: async () => {
      const cacheNames = await caches.keys()
      console.log('Cache Names:', cacheNames)
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        console.log(`${name}:`, keys.map(k => k.url))
      }
    }
  }
  
  console.log('💡 Cache utilities available: __cache.clearAll(), __cache.stats(), __cache.keys()')
}

// Loading component for lazy routes
const RouteLoading = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    <span className="ml-3 text-gray-600">Загрузка...</span>
  </div>
)

const Protected = ({children}: {children: React.ReactNode}) => {
  const [loading, setLoading] = React.useState(true);
  const [authed, setAuthed] = React.useState(false);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess);
    });
    return () => { sub.subscription.unsubscribe() }
  }, []);
  if (loading) return <div className="p-8 text-gray-300">Загрузка...</div>;
  return authed ? <React.Fragment>{children}</React.Fragment> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { 
    path: '/login', 
    element: (
      <Suspense fallback={<RouteLoading />}>
        <LazyPages.Login />
      </Suspense>
    )
  },
  {
    path: '/',
    element: (
      <Protected>
        <App />
      </Protected>
    ),
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<RouteLoading />}>
            <LazyPages.Home />
          </Suspense>
        )
      },
      { 
        path: 'finance', 
        element: (
          <Suspense fallback={<RouteLoading />}>
            <LazyPages.Finance />
          </Suspense>
        )
      },
      { 
        path: 'tasks', 
        element: (
          <Suspense fallback={<RouteLoading />}>
            <LazyPages.Tasks />
          </Suspense>
        )
      },
      { 
        path: 'goals', 
        element: (
          <Suspense fallback={<RouteLoading />}>
            <LazyPages.Goals />
          </Suspense>
        )
      },
      { 
        path: 'notes', 
        element: (
          <Suspense fallback={<RouteLoading />}>
            <LazyPages.Notes />
          </Suspense>
        )
      },
    ]
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
