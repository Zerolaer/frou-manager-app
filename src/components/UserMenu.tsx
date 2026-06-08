import React, { useState, useRef, useEffect } from 'react'
import { User, Settings, Languages, LogOut, Home, FileText, Video, Users, Moon, HelpCircle, MessageSquare, Zap, Check } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useNavigate } from 'react-router-dom'

// Add keyframe animation for dropdown appearance
const dropdownAnimation = `
  @keyframes dropdownAppear {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('dropdown-animation')) {
  const style = document.createElement('style');
  style.id = 'dropdown-animation';
  style.textContent = dropdownAnimation;
  document.head.appendChild(style);
}

export default function UserMenu() {
  const { t, i18n } = useSafeTranslation()
  const { signOut, user, email } = useSupabaseAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Get user display name
  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || email?.split('@')[0] || 'User'
  const userEmail = email || ''

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    try {
      // Сначала корректно завершаем сессию в Supabase, чтобы токен в другой вкладке тоже инвалидировался.
      await signOut().catch((error) => {
        if (import.meta.env.DEV) {
          console.error('[auth] signOut failed:', error)
        }
      })

      // Затем чистим локальные ключи нашего приложения и кэши Supabase.
      const drop = (storage: Storage) => {
        const keys: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && (key.startsWith('frovo_') || key.startsWith('sb-'))) {
            keys.push(key)
          }
        }
        keys.forEach((key) => storage.removeItem(key))
      }
      drop(localStorage)
      drop(sessionStorage)

      navigate('/login', { replace: true })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[auth] logout error:', error)
      }
      navigate('/login', { replace: true })
    }
  }

  const toggleLanguage = () => {
    if (!i18n || !i18n.language) return
    const newLang = i18n.language === 'en' ? 'ru' : 'en'
    localStorage.setItem('frovo_language', newLang)
    i18n.changeLanguage(newLang)
    // Don't close menu on language change
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 ease-out hover:scale-[1.03] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        aria-label={t('user.menu')}
        aria-expanded={open}
      >
        {/* User Info - Left */}
        <div className="flex flex-col items-end text-right">
          <div className="font-medium text-sm text-gray-900 leading-tight">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 leading-tight">
            {userEmail}
          </div>
        </div>
        
        {/* Avatar - Right */}
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700 flex-shrink-0">
          {getInitials(displayName)}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            style={{
              animation: 'dropdownAppear 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Profile Card */}
            <div className="bg-white p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                    {getInitials(displayName)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                
                {/* Name and Email */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{displayName}</div>
                  <div className="text-sm text-gray-500 truncate">{userEmail}</div>
                </div>
                
                {/* PRO Badge */}
                <button className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                  <Zap className="w-3 h-3" />
                  PRO
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="bg-white py-2">
              {/* First Group */}
              <button 
                onClick={() => { navigate('/'); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
              >
                <Home className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('nav.home')}</span>
              </button>
              
              <button 
                onClick={() => { navigate('/notes'); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
              >
                <FileText className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('nav.notes') || 'Pages'}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-gray-50 hover:bg-gray-100 transition-colors group">
                <Video className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{t('user.activeStream') || 'Active stream'}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group">
                <Users className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('user.people') || 'People'}</span>
              </button>

              {/* Separator */}
              <div className="h-px bg-gray-100 my-2" />

              {/* Settings Group */}
              <button onClick={() => { setOpen(false); navigate('/settings') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group">
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('user.settings') || 'Settings'}</span>
              </button>
              
              <button 
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{t('user.changeLanguage') || 'Language'}</span>
                </div>
                <span className="text-xs text-gray-500 uppercase">{i18n?.language || 'EN'}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group">
                <User className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('user.profilePreferences') || 'My profile & preferences'}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group">
                <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('user.helpCenter') || 'Help center'}</span>
              </button>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                {t('user.feedback') || 'Feedback'}
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
