import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
import './finance-grid.css'
import './tasks.css'
import App from './App'
import { LazyPages } from './utils/codeSplitting'
import { supabase } from './lib/supabaseClient'

import { preloadCriticalResources, analyzeBundleSize } from './utils/performance'

// Preload critical resources
preloadCriticalResources()

// Analyze bundle size in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(analyzeBundleSize, 2000)
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
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
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
