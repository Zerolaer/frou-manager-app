import React, { useState, useEffect, Fragment, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import './styles.css'
import i18n from './lib/i18n'
import App from './App'
import { supabase } from './lib/supabaseClient'
import { isSessionFresh } from './lib/authFlow'
import { HABITS_FEATURE_ENABLED } from './lib/featureFlags'
import AppLoader from './components/AppLoader'
import { registerServiceWorker } from './components/OfflineSupport'
import { routeImports, prefetchDuringAuthBootstrap } from './lib/routePrefetch'
import { isMobileUI } from './platform/nativeApp'
import { initCapacitorNative } from './platform/capacitorInit'
import { setupNativeApp } from './lib/nativeAppLifecycle'
import NativeSplashGate from './components/NativeSplashGate'

// Default landing route — eager to avoid a second full-screen loader after auth.
import Home from './pages/Home'

const Login = lazy(routeImports.login)
const Signup = lazy(routeImports.signup)
const ForgotPassword = lazy(routeImports.forgotPassword)
const ResetPassword = lazy(routeImports.resetPassword)
const Finance = lazy(routeImports.finance)
const Tasks = lazy(routeImports.tasks)
const Notes = lazy(routeImports.notes)
const Canvas = lazy(routeImports.canvas)
// PARKED (intentional): Habits stays lazy-loaded so the chunk is not treated as dead.
// Hidden from nav; `/habits` redirects home while HABITS_FEATURE_ENABLED is false.
const Habits = lazy(routeImports.habits)
const Settings = lazy(routeImports.settings)
const Storybook = lazy(routeImports.storybook)

const withAuthSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<AppLoader />}>{node}</Suspense>
)

const Protected = ({children}: {children: React.ReactNode}) => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Checking session…')
    }

    prefetchDuringAuthBootstrap(isMobileUI())

    let cancelled = false
    let finishedInitial = false
    const slowWarnMs = import.meta.env.DEV ? 8_000 : 12_000
    const settleAuth = (isAuthed: boolean) => {
      if (cancelled) return
      finishedInitial = true
      window.clearTimeout(expireFallback)
      setAuthed(isAuthed)
      setLoading(false)
    }

    // Expired local session: wait for refresh, then SIGNED_OUT or TOKEN_REFRESHED.
    const expireFallback = window.setTimeout(() => {
      if (cancelled || finishedInitial) return
      settleAuth(false)
    }, slowWarnMs)

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (cancelled) return
      if (import.meta.env.DEV) {
        console.log('Auth state:', event, { hasSession: !!sess })
      }

      if (event === 'SIGNED_OUT') {
        settleAuth(false)
        return
      }

      if (event === 'SIGNED_IN') {
        settleAuth(!!sess)
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!sess) return
        settleAuth(true)
        return
      }

      if (event === 'INITIAL_SESSION') {
        if (isSessionFresh(sess)) {
          settleAuth(true)
          return
        }
        if (!sess) {
          settleAuth(false)
        }
      }
    })
    return () => {
      cancelled = true
      window.clearTimeout(expireFallback)
      sub.subscription.unsubscribe()
    }
  }, []);
  if (loading) return <AppLoader />;
  return authed ? <Fragment>{children}</Fragment> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: withAuthSuspense(<Login />),
  },
  {
    path: '/signup',
    element: withAuthSuspense(<Signup />),
  },
  {
    path: '/forgot-password',
    element: withAuthSuspense(<ForgotPassword />),
  },
  {
    path: '/reset-password',
    element: withAuthSuspense(<ResetPassword />),
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
        element: <Home />,
      },
      {
        path: 'finance',
        element: <Finance />,
      },
      {
        path: 'tasks',
        element: <Tasks />,
      },
      {
        path: 'notes',
        element: <Notes />,
      },
      {
        path: 'canvas',
        element: <Canvas />,
      },
      {
        path: 'canvas/:projectId',
        element: <Canvas />,
      },
      {
        path: 'invoice',
        element: <Navigate to="/" replace />,
      },
      {
        // PARKED (intentional): do not delete this route or the Habits page/module.
        // Restore by setting HABITS_FEATURE_ENABLED = true in src/lib/featureFlags.ts.
        path: 'habits',
        element: HABITS_FEATURE_ENABLED ? <Habits /> : <Navigate to="/" replace />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: 'storybook',
              element: <Storybook />,
            },
          ]
        : []),
    ],
  },
])

void initCapacitorNative()
void setupNativeApp()
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <NativeSplashGate />
    <RouterProvider router={router} />
  </I18nextProvider>
)
