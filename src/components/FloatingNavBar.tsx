import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { LogOut, Home, DollarSign, CheckSquare, FileText, Target, User, Clock } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import './FloatingNavBar.css'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/finance', icon: DollarSign, label: 'Финансы' },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/notes', icon: FileText, label: 'Заметки' },
  { to: '/goals', icon: Target, label: 'Цели' },
]

export default function FloatingNavBar() {
  const location = useLocation()
  const { email, signOut, user } = useSupabaseAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayTasksCount, setTodayTasksCount] = useState(0)
  const navRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, right: 0 })

  // Определяем активный индекс на основе текущего пути
  useEffect(() => {
    const currentIndex = NAV_ITEMS.findIndex(item => item.to === location.pathname)
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [location.pathname])

  // Обновляем время каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Загружаем количество задач на сегодня
  useEffect(() => {
    if (!user) return

    const fetchTodayTasks = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { count } = await supabase
        .from('tasks_items')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
      
      setTodayTasksCount(count || 0)
    }

    fetchTodayTasks()
  }, [user])


  // Update menu position when opening
  useEffect(() => {
    if (userMenuOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect()
      const menuWidth = 288 // w-72 = 288px
      const rightPosition = Math.min(
        window.innerWidth - rect.right,
        window.innerWidth - 16 // 16px margin from edge
      )
      
      setMenuPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: Math.max(16, rightPosition) // 16px minimum margin
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

  return (
    <>
      {/* Main Header */}
      <header 
        className="sticky top-0 left-0 right-0 z-50 bg-white block"
        role="navigation"
        aria-label="Основная навигация"
      >
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Logo - Left */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">FROU</span>
          </div>

          {/* Navigation Menu - Center */}
          <div ref={navRef} className="flex items-center gap-2 relative z-10">
            {NAV_ITEMS.map((item, index) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-nav-item
                  className={`flex items-center gap-2 px-5 py-3 rounded-full group relative transition-colors ${isActive ? 'bg-gradient-to-br from-gray-800 to-gray-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* User Profile - Right */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 group transition-colors ${
                userMenuOpen 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Меню пользователя"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">
                Профиль
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* User Menu Portal - render outside footer */}
      {userMenuOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setUserMenuOpen(false)}
          />
          
          {/* Menu */}
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
