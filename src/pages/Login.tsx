import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import AuthCard from '@/components/AuthCard'
import '@/ui.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false);

useEffect(() => {
  let mounted = true;
  supabase.auth.getSession().then(({ data }) => {
    if (!mounted) return;
    if (data.session) {
      navigate('/finance', { replace: true }); // уже залогинен — сразу на Финансы
    } else {
      setAuthChecked(true); // не залогинен — можно показывать Login
    }
  });
  return () => { mounted = false; };
}, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/finance', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа. Проверьте email и пароль.')
    } finally {
      setLoading(false)
    }
  }
if (!authChecked) {
  // Ничего не рисуем, чтобы не мелькал фон Login
  return <div className="min-h-screen bg-white" />;
}

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50">
    

      <div className="w-full px-4">
        <div className="mx-auto max-w-md">
          {/* Brand */}
          <div className="mb-6 text-center select-none">
            <div className="inline-flex items-center gap-3">
              {/* Simple custom logo for FROU */}
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-md">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 6h10v3H10v3h6v3h-6v3H7V6z" fill="white"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-3xl font-semibold tracking-tight text-gray-900">FROU</div>
                <div className="text-sm text-gray-500 -mt-0.5">Your daily helpdesk</div>
              </div>
            </div>
          </div>

          <AuthCard
            title="Вход в аккаунт"
            subTitle="Введите email и пароль"
            footer={
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 cursor-not-allowed select-none" aria-disabled>
                  Войти по ссылке (скоро)
                </span>
                <span className="text-gray-300 cursor-not-allowed select-none" aria-disabled>
                  Забыли пароль (скоро)
                </span>
              </div>
            }
          >
            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            <form onSubmit={onSubmit} className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Пароль</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <button className="btn w-full mt-2 disabled:opacity-60" disabled={loading}>
                {loading ? 'Загрузка…' : 'Войти'}
              </button>
            </form>
          </AuthCard>

          <div className="text-center text-xs text-gray-500 mt-6">
            FROU • Защищено Supabase • Netlify
          </div>
        </div>
      </div>
    </div>
  )
}
