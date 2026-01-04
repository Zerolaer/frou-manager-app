import React, { useState, useEffect, Fragment } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import './styles.css'
import i18n from './lib/i18n'
import App from './App'
import { supabase } from './lib/supabaseClient'
import AppLoader from './components/AppLoader'

// Import all pages directly to avoid React null issues in lazy loading
import Login from './pages/Login'
import Home from './pages/Home'
import Finance from './pages/Finance'
import Tasks from './pages/Tasks'
import Notes from './pages/Notes'
import Invoice from './pages/Invoice'
import Habits from './pages/Habits'
import Settings from './pages/Settings'
import Storybook from './pages/Storybook'

const LazyPages = {
  Login,
  Home,
  Finance,
  Tasks,
  Notes,
  Invoice,
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
    
    console.log('🔐 Checking session...');
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Error getting session:', error);
        setAuthed(false);
        setLoading(false);
        return;
      }
      
      console.log('✅ Session check:', { hasSession: !!data.session, userId: data.session?.user?.id });
      setAuthed(!!data.session);
      setLoading(false);
    }).catch((error) => {
      console.error('❌ Exception getting session:', error);
      setLoading(false);
      // Don't allow access on error - redirect to login
      setAuthed(false);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('🔄 Auth state changed:', event, { hasSession: !!sess });
      setAuthed(!!sess);
    });
    return () => { sub?.subscription?.unsubscribe() }
  }, []);
  if (loading) return <AppLoader />;
  return authed ? <Fragment>{children}</Fragment> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { 
    path: '/login', 
    element: <LazyPages.Login />
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
        element: <LazyPages.Home />
      },
      { 
        path: 'finance', 
        element: <LazyPages.Finance />
      },
      { 
        path: 'tasks', 
        element: <LazyPages.Tasks />
      },
      { 
        path: 'notes', 
        element: <LazyPages.Notes />
      },
      { 
        path: 'invoice', 
        element: <LazyPages.Invoice />
      },
      { 
        path: 'habits', 
        element: <LazyPages.Habits />
      },
      { 
        path: 'settings', 
        element: <LazyPages.Settings />
      },
      // Storybook route only available in development
      ...(import.meta.env.DEV ? [{
        path: 'storybook', 
        element: <LazyPages.Storybook />
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
