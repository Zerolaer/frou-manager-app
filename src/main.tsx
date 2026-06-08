import React, { useState, useEffect, useRef, Fragment, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import './styles.css'
import i18n from './lib/i18n'
import App from './App'
import { supabase } from './lib/supabaseClient'
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
const Habits = lazy(routeImports.habits)
const Settings = lazy(routeImports.settings)
const Storybook = lazy(routeImports.storybook)

const withAuthSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<AppLoader />}>{node}</Suspense>
)

const Protected = ({children}: {children: React.ReactNode}) => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  /** Пока false — не применяем onAuthStateChange (иначе часто приходит session=null раньше getSession → цикл /login ↔ /). */
  const initialSessionSyncedRef = useRef(false)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Checking session…')
    }

    prefetchDuringAuthBootstrap(isMobileUI())

    initialSessionSyncedRef.current = false

    let cancelled = false
    const slowWarnMs = import.meta.env.DEV ? 8_000 : 12_000
    const slowTimer = window.setTimeout(() => {
      if (cancelled || !import.meta.env.DEV) return
      console.warn(
        '⚠️ Supabase getSession всё ещё ждёт ответа — проверьте сеть или доступность проекта.'
      )
    }, slowWarnMs)

    const finishInitialSync = () => {
      initialSessionSyncedRef.current = true
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        window.clearTimeout(slowTimer)
        if (cancelled) return
        finishInitialSync()
        if (error) {
          console.error('❌ Error getting session:', error)
          setAuthed(false)
          setLoading(false)
          return
        }

        if (import.meta.env.DEV) {
          console.log('Session check:', {
            hasSession: !!data.session,
            userId: data.session?.user?.id,
          })
        }
        setAuthed(!!data.session)
        setLoading(false)
      })
      .catch((error) => {
        window.clearTimeout(slowTimer)
        if (cancelled) return
        finishInitialSync()
        console.error('❌ Exception getting session:', error)
        setAuthed(false)
        setLoading(false)
      })

    // Только явный вход/выход. Остальные события (INITIAL_SESSION, TOKEN_REFRESHED и т.д.)
    // часто шлют промежуточные session=null → Navigate на /login → цикл с Login.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (cancelled) return
      if (!initialSessionSyncedRef.current) return
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return
      if (import.meta.env.DEV) {
        console.log('Auth state:', event, { hasSession: !!sess })
      }
      if (event === 'SIGNED_OUT') {
        void supabase.auth.getSession().then(({ data }) => {
          if (cancelled) return
          if (data.session) {
            setAuthed(true)
            setLoading(false)
            return
          }
          setAuthed(false)
          setLoading(false)
        })
        return
      }
      setAuthed(!!sess)
      setLoading(false)
    })
    return () => {
      cancelled = true
      window.clearTimeout(slowTimer)
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
        path: 'habits',
        element: <Habits />,
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
