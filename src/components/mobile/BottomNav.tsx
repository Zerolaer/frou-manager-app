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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
                isActive ? 'text-black' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

