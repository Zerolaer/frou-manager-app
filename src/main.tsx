import React, { useState, useEffect, Fragment } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import './styles.css'
import i18n from './lib/i18n'
import App from './App'
import { supabase } from './lib/supabaseClient'
import AppLoader from './components/AppLoader'

// Eager page imports keep React/router initialization predictable in this setup
import Login from './pages/Login'
import Home from './pages/Home'
import Finance from './pages/Finance'
import Tasks from './pages/Tasks'
import Notes from './pages/Notes'
import Canvas from './pages/Canvas'
import Habits from './pages/Habits'
import Settings from './pages/Settings'
import Storybook from './pages/Storybook'

const Pages = {
  Login,
  Home,
  Finance,
  Tasks,
  Notes,
  Canvas,
  Habits,
  Settings,
  Storybook,
}


const Protected = ({children}: {children: React.ReactNode}) => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    // Check if supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (import.meta.env.DEV) {
      console.log('🔍 Protected Route - Supabase Config:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing'
      });
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Missing Supabase config - allowing access for development');
      // If no Supabase config, allow access (for development)
      setAuthed(true);
      setLoading(false);
      return;
    }
    
    if (import.meta.env.DEV) console.log('Checking session…')
    // Keep auth bootstrap responsive: long timeouts make the app feel frozen.
    const SESSION_CHECK_MS = import.meta.env.DEV ? 3_000 : 8_000
    let sessionDone = false
    const timer = window.setTimeout(() => {
      if (sessionDone) return
      sessionDone = true
      console.warn('⚠️ Session check timed out — opening app as signed out (check network / Supabase).')
      setAuthed(false)
      setLoading(false)
    }, SESSION_CHECK_MS)

    supabase.auth.getSession().then(({ data, error }) => {
      if (sessionDone) return
      sessionDone = true
      window.clearTimeout(timer)
      if (error) {
        console.error('❌ Error getting session:', error);
        setAuthed(false);
        setLoading(false);
        return;
      }
      
      if (import.meta.env.DEV) {
        console.log('Session check:', { hasSession: !!data.session, userId: data.session?.user?.id })
      }
      setAuthed(!!data.session);
      setLoading(false);
    }).catch((error) => {
      if (sessionDone) return
      sessionDone = true
      window.clearTimeout(timer)
      console.error('❌ Exception getting session:', error);
      setLoading(false);
      // Don't allow access on error - redirect to login
      setAuthed(false);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (import.meta.env.DEV) {
        console.log('Auth state:', event, { hasSession: !!sess })
      }
      setAuthed(!!sess);
    });
    return () => {
      sessionDone = true
      window.clearTimeout(timer)
      sub?.subscription?.unsubscribe()
    }
  }, []);
  if (loading) return <AppLoader />;
  return authed ? <Fragment>{children}</Fragment> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { 
    path: '/login', 
    element: <Pages.Login />
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
        element: <Pages.Home />
      },
      { 
        path: 'finance', 
        element: <Pages.Finance />
      },
      { 
        path: 'tasks', 
        element: <Pages.Tasks />
      },
      { 
        path: 'notes', 
        element: <Pages.Notes />
      },
      { 
        path: 'canvas', 
        element: <Pages.Canvas />
      },
      { 
        path: 'canvas/:projectId', 
        element: <Pages.Canvas />
      },
      { 
        path: 'invoice', 
        element: <Navigate to="/" replace />
      },
      { 
        path: 'habits', 
        element: <Pages.Habits />
      },
      { 
        path: 'settings', 
        element: <Pages.Settings />
      },
      // Storybook route only available in development
      ...(import.meta.env.DEV ? [{
        path: 'storybook', 
        element: <Pages.Storybook />
      }] : []),
    ]
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </React.StrictMode>
)
