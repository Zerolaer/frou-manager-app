import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { LogOut, Home, DollarSign, CheckSquare, FileText, Target, User } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
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
  const { email, signOut } = useSupabaseAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
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

  // Анимация фона к активному элементу
  useEffect(() => {
    if (backgroundRef.current && navRef.current) {
      const navItems = navRef.current.querySelectorAll('[data-nav-item]')
      const activeItem = navItems[activeIndex] as HTMLElement
      
      if (activeItem) {
        const navRect = navRef.current.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        
        const left = itemRect.left - navRect.left
        const width = itemRect.width
        
        backgroundRef.current.style.transform = `translateX(${left}px)`
        backgroundRef.current.style.width = `${width}px`
      }
    }
  }, [activeIndex])

  // Update menu position when opening
  useEffect(() => {
    if (userMenuOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect()
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 8, // 8px gap
        right: window.innerWidth - rect.right
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
      {/* Floating Navigation Bar */}
      <nav 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        role="navigation"
        aria-label="Основная навигация"
      >
        <div className="floating-nav-container bg-white/90 floating-nav-backdrop border border-gray-200/50 rounded-full shadow-lg px-3 py-3 flex items-center justify-center gap-4 relative">
          {/* Animated Background */}
          <div
            ref={backgroundRef}
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '12px',
              background: 'linear-gradient(to bottom right, #1f2937 0%, #4b5563 100%)',
              borderRadius: '9999px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 1,
              transition: 'transform 0.6s ease-out, width 0.6s ease-out',
              willChange: 'transform, width'
            }}
          />
          
          {/* Navigation Items */}
          <div ref={navRef} className="flex items-center gap-1 relative z-10">
            {NAV_ITEMS.map((item, index) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-nav-item
                  className={`floating-nav-item flex items-center gap-2 px-4 py-3 rounded-full group relative ${isActive ? 'active text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium leading-none whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-gray-200"></div>

          {/* User Profile */}
          <button
            ref={profileButtonRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`floating-nav-item flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 group ${
              userMenuOpen 
                ? 'active text-blue-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Меню пользователя"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium leading-none whitespace-nowrap">
              Профиль
            </span>
          </button>
        </div>
      </nav>

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
              bottom: `${menuPosition.bottom}px`,
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
