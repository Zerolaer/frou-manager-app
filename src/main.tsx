import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
import App from './App'
import { supabase } from './lib/supabaseClient'
import AppLoader from './components/AppLoader'

// Lazy load pages
const LazyPages = {
  Login: React.lazy(() => import('./pages/Login')),
  Home: React.lazy(() => import('./pages/Home')),
  Finance: React.lazy(() => import('./pages/Finance')),
  Tasks: React.lazy(() => import('./pages/Tasks')),
  Notes: React.lazy(() => import('./pages/Notes')),
  Storybook: React.lazy(() => import('./pages/Storybook')),
}

// Simple startup - removed complex utilities for now


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
