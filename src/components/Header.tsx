import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { AccessibleButton } from './AccessibleComponents'
import { Home, Wallet, ListTodo, StickyNote, Goal, ChevronDown, LogOut } from 'lucide-react'
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu')) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  async function signOut(){
    await supabase.auth.signOut()
    clearFinanceCache()
    window.location.href = '/login'
  }

  return (
    <header 
      className="bg-white sticky top-0 z-50"
      role="banner"
      aria-label="Навигация и заголовок"
    >
      {/* Desktop Header - Tab Style */}
      <div className="hidden lg:flex items-center justify-between px-6 py-0 bg-gray-100 h-12">
        {/* Left side - Tabs */}
        <div className="flex items-center">
          <nav className="flex items-center" role="navigation" aria-label="Основное меню">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative ${
                    isActive 
                      ? 'text-gray-800 bg-white border-t border-l border-r border-gray-300 tab-skewed-active' 
                      : 'text-gray-600 hover:text-gray-900 bg-gray-100 tab-skewed'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right side - Profile */}
        <div className="relative user-menu">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center justify-center gap-3 px-4 py-3 rounded-t-lg hover:bg-gray-50 transition-colors"
            aria-label="Меню пользователя"
          >
            <div className="text-center">
              <p className="text-xs text-gray-500 truncate max-w-[120px]">{email ?? '—'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">Пользователь</p>
                <p className="text-sm text-gray-600 truncate">{email ?? '—'}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
      

      {/* Mobile Header - Tab Style */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-100 h-10">
        {/* Mobile Tabs */}
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          <nav className="flex items-center gap-1" role="navigation" aria-label="Основное меню">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive 
                      ? 'text-gray-800 bg-white border-t border-l border-r border-gray-300 tab-skewed-active' 
                      : 'text-gray-600 hover:text-gray-900 bg-gray-100 tab-skewed'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* Mobile Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Выйти из системы"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      

    </header>
  )
}
