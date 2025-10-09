import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
import App from './App'
import { LazyPages } from './utils/codeSplitting'
import { supabase } from './lib/supabaseClient'
import AppLoader from './components/AppLoader'

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
  if (loading) return <AppLoader />;
  return authed ? <React.Fragment>{children}</React.Fragment> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { 
    path: '/login', 
    element: (
      <Suspense fallback={null}>
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
          <Suspense fallback={null}>
            <LazyPages.Home />
          </Suspense>
        )
      },
      { 
        path: 'finance', 
        element: (
          <Suspense fallback={null}>
            <LazyPages.Finance />
          </Suspense>
        )
      },
      { 
        path: 'tasks', 
        element: (
          <Suspense fallback={null}>
            <LazyPages.Tasks />
          </Suspense>
        )
      },
      { 
        path: 'notes', 
        element: (
          <Suspense fallback={null}>
            <LazyPages.Notes />
          </Suspense>
        )
      },
      { 
        path: 'storybook', 
        element: (
          <Suspense fallback={null}>
            <LazyPages.Storybook />
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
