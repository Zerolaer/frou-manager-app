import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Home, DollarSign, CheckSquare, FileText, Target, User } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/finance', icon: DollarSign, label: 'Финансы' },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/notes', icon: FileText, label: 'Заметки' },
  { to: '/goals', icon: Target, label: 'Цели' },
]

export default function FloatingNavBar() {
  const location = useLocation()
  const { email, signOut } = useSupabaseAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setUserMenuOpen(false)
    } catch (error) {
      console.error('Ошибка при выходе:', error)
    }
  }

  return (
    <>
      {/* Floating Navigation Bar */}
      <nav 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        role="navigation"
        aria-label="Основная навигация"
      >
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg px-3 py-3 flex items-center gap-4">
          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 group ${
                    isActive 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-600 text-white shadow-md' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ease-out ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span className="text-sm font-medium leading-none whitespace-nowrap">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-gray-200"></div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 transition-all duration-300 group"
              aria-label="Меню пользователя"
            >
              <User className={`w-4 h-4 transition-all duration-200 ease-out ${userMenuOpen ? 'text-blue-500' : 'text-gray-600 group-hover:text-gray-900'}`} />
              <span className="text-sm font-medium leading-none whitespace-nowrap text-gray-600 group-hover:text-gray-900">
                Профиль
              </span>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                
                {/* Menu */}
                <div className="absolute bottom-full right-0 mb-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Профиль пользователя</p>
                    <p className="text-xs text-gray-500 truncate bg-gray-50 px-3 py-2 rounded-lg">{email ?? '—'}</p>
                  </div>
                  
                  <div className="py-2">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-5 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl mx-2 group"
                    >
                      <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                      <span className="font-medium">Выйти из системы</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
