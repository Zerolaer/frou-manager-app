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

// Route-level code splitting. Login and Home keep eager paths via lazy import,
// remaining pages download on demand to lower the initial bundle size for first paint.
const Login = lazy(() => import('./pages/Login'))
const Home = lazy(() => import('./pages/Home'))
const Finance = lazy(() => import('./pages/Finance'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Notes = lazy(() => import('./pages/Notes'))
const Canvas = lazy(() => import('./pages/Canvas'))
const Habits = lazy(() => import('./pages/Habits'))
const Settings = lazy(() => import('./pages/Settings'))
// Storybook доступен только в DEV — лениво грузим, чтобы не попадал в production-бандл
const Storybook = lazy(() => import('./pages/Storybook'))

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<AppLoader />}>{node}</Suspense>
)

const Pages = {
  Login: () => withSuspense(<Login />),
  Home: () => withSuspense(<Home />),
  Finance: () => withSuspense(<Finance />),
  Tasks: () => withSuspense(<Tasks />),
  Notes: () => withSuspense(<Notes />),
  Canvas: () => withSuspense(<Canvas />),
  Habits: () => withSuspense(<Habits />),
  Settings: () => withSuspense(<Settings />),
  Storybook: () => withSuspense(<Storybook />),
}


const Protected = ({children}: {children: React.ReactNode}) => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  /** Пока false — не применяем onAuthStateChange (иначе часто приходит session=null раньше getSession → цикл /login ↔ /). */
  const initialSessionSyncedRef = useRef(false)
  useEffect(() => {
    // Клиент в supabaseClient всегда имеет URL/key (в т.ч. fallback). Нельзя ставить authed=true
    // только из-за отсутствия VITE_* в import.meta.env — это расходится с клиентом и ломает сессию.
    if (import.meta.env.DEV) {
      console.log('Checking session…')
    }

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
  <I18nextProvider i18n={i18n}>
    <RouterProvider router={router} />
  </I18nextProvider>
)

// Регистрируем SW только в продакшен-сборке (см. реализацию в OfflineSupport)
registerServiceWorker()
