import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { AccessibleButton } from './AccessibleComponents'
import { Home, Wallet, ListTodo, StickyNote, Goal, Menu, X, ChevronDown, LogOut } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      className="bg-white border-b border-gray-200 sticky top-0 z-50"
      role="banner"
      aria-label="Навигация и заголовок"
    >
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-4 py-3">
        {/* Logo - уменьшенный */}
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center font-bold text-sm">
            F
          </div>
          {APP_NAME}
        </Link>

        {/* Navigation - фиксированная ширина для предотвращения скачков */}
        <nav className="flex items-center gap-1" role="navigation" aria-label="Основное меню">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[120px] justify-center ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User Menu - dropdown с иконкой */}
        <div className="relative user-menu">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Меню пользователя"
          >
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {email?.charAt(0).toUpperCase() || 'U'}
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

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-blue-600">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center font-bold text-sm">
            F
          </div>
          {APP_NAME}
        </Link>
        
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Выйти из системы"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-2" role="navigation" aria-label="Мобильное меню">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-button transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
