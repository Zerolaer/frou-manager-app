import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
import App from './App'
import Login from './pages/Login'
import Home from './pages/Home'
import Finance from './pages/Finance'
import Tasks from './pages/Tasks'
import Goals from './pages/Goals'
import Notes from './pages/Notes'
import { supabase } from './lib/supabaseClient'
import "@/styles/bento.css";

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
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <Protected>
        <App />
      </Protected>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'finance', element: <Finance /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'goals', element: <Goals /> },
      { path: 'notes', element: <Notes /> },
    ]
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
