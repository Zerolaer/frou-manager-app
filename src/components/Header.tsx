import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { LogOut, Home, DollarSign, CheckSquare, FileText, Target, User, Plus, Filter, Search, Download, Upload, Settings, Calendar } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import YearSelector from './YearSelector'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/finance', icon: DollarSign, label: 'Финансы' },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/notes', icon: FileText, label: 'Заметки' },
]

interface HeaderProps {
  onAction?: (action: string) => void
  currentYear?: number
  onYearChange?: (year: number) => void
}

export default function Header({ onAction, currentYear, onYearChange }: HeaderProps) {
  const location = useLocation()
  const { email, signOut } = useSupabaseAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  const getSubHeaderContent = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Обзор',
          actions: [
            { id: 'refresh', label: 'Обновить', icon: Download, variant: 'secondary' },
            { id: 'settings', label: 'Настройки', icon: Settings, variant: 'secondary' }
          ]
        }

      case '/finance':
        return {
          title: 'Финансы',
          actions: [
            { id: 'add-category', label: 'Добавить категорию', icon: Plus, variant: 'primary' },
            { id: 'annual-stats', label: 'Годовая статистика', icon: Target, variant: 'secondary' },
            { id: 'export', label: 'Экспорт', icon: Download, variant: 'secondary' },
            { id: 'import', label: 'Импорт', icon: Upload, variant: 'secondary' }
          ]
        }

      case '/tasks':
        return {
          title: 'Задачи',
          actions: [
            { id: 'add-task', label: 'Новая задача', icon: Plus, variant: 'primary' },
            { id: 'filter', label: 'Фильтр', icon: Filter, variant: 'secondary' },
            { id: 'calendar', label: 'Календарь', icon: Calendar, variant: 'secondary' },
            { id: 'search', label: 'Поиск', icon: Search, variant: 'secondary' }
          ]
        }

      case '/notes':
        return {
          title: 'Заметки',
          actions: [
            { id: 'add-note', label: 'Новая заметка', icon: Plus, variant: 'primary' },
            { id: 'search', label: 'Поиск', icon: Search, variant: 'secondary' },
            { id: 'filter', label: 'Фильтр', icon: Filter, variant: 'secondary' },
            { id: 'export', label: 'Экспорт', icon: Download, variant: 'secondary' }
          ]
        }

      default:
        return null
    }
  }

  const subHeaderContent = getSubHeaderContent()

  // Update menu position when opening
  useEffect(() => {
    if (userMenuOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right)
      })
    }
  }, [userMenuOpen])

  // Close menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (profileButtonRef.current && !profileButtonRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      setUserMenuOpen(false)
    } catch (error) {
      console.error('Ошибка при выходе:', error)
    }
  }

  const handleAction = (actionId: string) => {
    if (onAction) {
      onAction(actionId)
    }
  }

  return (
    <>
      {/* Combined Header */}
      <header 
        className="sticky top-0 left-0 right-0 z-50 bg-white"
        role="banner"
      >
        {/* Navigation Bar */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-gray-200">
          {/* Logo - Left */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">FROU</span>
          </div>

          {/* Navigation Menu - Center */}
          <nav className="flex items-center gap-2" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full transition-colors ${
                    isActive 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile - Right */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                userMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Меню пользователя"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Профиль</span>
            </button>
          </div>
        </div>

        {/* Sub-Header */}
        {subHeaderContent && (
          <div className="px-4 py-4 bg-white">
            <div className="flex items-center justify-between">
              <h1 className="text-h2 text-gray-900 leading-none !mb-0">{subHeaderContent.title}</h1>
              
              <div className="flex items-center gap-2 h-8">
                {/* Year selector for Finance page */}
                {location.pathname === '/finance' && currentYear && onYearChange && (
                  <YearSelector currentYear={currentYear} onYearChange={onYearChange} />
                )}
                
                {subHeaderContent.actions.map((action) => {
                  const Icon = action.icon
                  const isPrimary = action.variant === 'primary'
                  
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-button transition-all duration-200 ${
                        isPrimary
                          ? 'bg-gradient-to-br from-gray-800 to-gray-600 text-white hover:from-gray-900 hover:to-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                      }`}
                      aria-label={action.label}
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* User Menu Portal */}
      {userMenuOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setUserMenuOpen(false)}
          />
          
          <div 
            className="fixed z-[9999] w-72 bg-white rounded-2xl shadow-xl border border-gray-200 py-3"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
          >
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
        </>,
        document.body
      )}
    </>
  )
}
