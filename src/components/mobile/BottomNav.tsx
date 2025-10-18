import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, DollarSign, CheckSquare, FileText } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

export default function BottomNav() {
  const location = useLocation()
  const { t } = useSafeTranslation()

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/finance', icon: DollarSign, label: t('nav.finance') },
    { path: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { path: '/notes', icon: FileText, label: t('nav.notes') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-14 max-w-screen-sm mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-[60px] relative transition-all duration-200"
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-10 h-0.5 bg-black rounded-full" />
              )}
              
              <Icon className={`w-5 h-5 transition-all duration-200 ${
                isActive ? 'text-black stroke-[2.5]' : 'text-gray-400 stroke-2'
              }`} />
              <span className={`text-[10px] leading-tight transition-all duration-200 ${
                isActive ? 'text-black font-semibold' : 'text-gray-500 font-medium'
              }`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

