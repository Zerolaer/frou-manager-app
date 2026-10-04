import React, { useEffect, useRef, useState } from 'react'
import {
  CheckSquare,
  FileText,
  FolderKanban,
  Languages,
  LayoutDashboard,
  LogOut,
  Settings,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { HABITS_FEATURE_ENABLED } from '@/lib/featureFlags'
import { cn } from '@/lib/utils'

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  to?: string
  onClick?: () => void
  trailing?: React.ReactNode
}

export default function UserMenu() {
  const { t, i18n } = useSafeTranslation()
  const { signOut, user, email } = useSupabaseAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    email?.split('@')[0] ||
    'User'
  const userEmail = email || ''

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    try {
      await signOut().catch(() => undefined)
      const drop = (storage: Storage) => {
        const keys: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && (key.startsWith('frovo_') || key.startsWith('sb-'))) keys.push(key)
        }
        keys.forEach((key) => storage.removeItem(key))
      }
      drop(localStorage)
      drop(sessionStorage)
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }

  const toggleLanguage = () => {
    if (!i18n?.language) return
    const newLang = i18n.language.startsWith('ru') ? 'en' : 'ru'
    localStorage.setItem('frovo_language', newLang)
    void i18n.changeLanguage(newLang)
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const primaryNav: NavItem[] = [
    { id: 'home', label: t('nav.home'), icon: LayoutDashboard, to: '/' },
    { id: 'tasks', label: t('nav.tasks'), icon: CheckSquare, to: '/tasks' },
    { id: 'finance', label: t('nav.finance'), icon: Wallet, to: '/finance' },
    { id: 'notes', label: t('nav.notes'), icon: FileText, to: '/notes' },
    { id: 'canvas', label: t('nav.canvas'), icon: FolderKanban, to: '/canvas' },
  ]

  const secondaryNav: NavItem[] = [
    {
      id: 'settings',
      label: t('user.settings') || t('nav.settings'),
      icon: Settings,
      to: '/settings',
    },
    {
      id: 'language',
      label: t('user.changeLanguage') || 'Language',
      icon: Languages,
      onClick: toggleLanguage,
      trailing: (
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase text-gray-600">
          {(i18n?.language || 'en').slice(0, 2)}
        </span>
      ),
    },
  ]

  if (HABITS_FEATURE_ENABLED) {
    primaryNav.push({
      id: 'habits',
      label: t('nav.habits') || 'Habits',
      icon: CheckSquare,
      to: '/habits',
    })
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label={t('user.menu')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="hidden text-right sm:flex sm:flex-col">
          <span className="text-sm font-medium leading-tight text-gray-900">{displayName}</span>
          <span className="max-w-[160px] truncate text-xs leading-tight text-gray-500">
            {userEmail}
          </span>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {getInitials(displayName)}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">{displayName}</div>
                  <div className="truncate text-sm text-gray-500">{userEmail}</div>
                </div>
              </div>
            </div>

            <div className="py-1.5">
              {primaryNav.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => (item.to ? go(item.to) : item.onClick?.())}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="border-t border-gray-100 py-1.5">
              {secondaryNav.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => (item.to ? go(item.to) : item.onClick?.())}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-800">{item.label}</span>
                    {item.trailing}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-gray-100 p-3">
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
                  'text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50',
                )}
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
