import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { AccessibleButton } from './AccessibleComponents'
import { ARIA_LABELS } from '@/lib/accessibility'
import { Home, Wallet, ListTodo, StickyNote, Goal, LogOut, User } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

function clearFinanceCache(){
  try{
    const keys = Object.keys(localStorage)
    for(const k of keys){ if(k.startsWith ? k.startsWith("finance:") : k.indexOf("finance:")===0) localStorage.removeItem(k) }
  }catch{}
}

const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/finance", label: "Финансы", icon: Wallet },
  { to: "/tasks", label: "Задачи", icon: ListTodo },
  { to: "/notes", label: "Заметки", icon: StickyNote },
  { to: "/goals", label: "Цели", icon: Goal },
]

export default function Header(){
  const location = useLocation()
  const [email, setEmail] = useState<string | null>(null)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function signOut(){
    await supabase.auth.signOut()
    clearFinanceCache()
    window.location.href = '/login'
  }

  return (
    <header 
      className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between"
      role="banner"
      aria-label="Заголовок страницы"
      style={{ minHeight: '48px' }}
    >
      {/* Logo and Navigation */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors">
          <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center text-sm font-bold">
            F
          </div>
          <span className="font-semibold text-lg">{APP_NAME}</span>
        </Link>
        
        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Основное меню">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium rounded transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Menu */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline" aria-label={`Пользователь: ${email ?? 'неизвестно'}`}>
            {email?.split('@')[0] ?? '—'}
          </span>
        </div>
        
        <AccessibleButton
          variant="ghost"
          size="sm"
          onClick={signOut}
          ariaLabel="Выйти из системы"
          announceOnClick="Выход из системы"
          className="flex items-center gap-2 text-gray-600 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Выйти</span>
        </AccessibleButton>
      </div>
    </header>
  )
}
