import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Home, DollarSign, CheckSquare, FileText, Target, Plus, Filter, Search, Download, Upload, Settings, Calendar, BookOpen } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useTranslation } from 'react-i18next'
import YearSelector from './YearSelector'
import LanguageSwitcher from './LanguageSwitcher'

interface HeaderProps {
  onAction?: (action: string) => void
  currentYear?: number
  onYearChange?: (year: number) => void
}

export default function Header({ onAction, currentYear, onYearChange }: HeaderProps) {
  const location = useLocation()
  const { signOut } = useSupabaseAuth()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/finance', icon: DollarSign, label: t('nav.finance') },
    { to: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { to: '/notes', icon: FileText, label: t('nav.notes') },
    { to: '/storybook', icon: BookOpen, label: t('nav.storybook') },
  ]

  const getSubHeaderContent = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: t('pages.overview'),
          actions: [
            { id: 'refresh', label: t('actions.refresh'), icon: Download, variant: 'secondary' },
            { id: 'settings', label: t('actions.settings'), icon: Settings, variant: 'secondary' }
          ]
        }

      case '/finance':
        return {
          title: t('pages.finance'),
          actions: [
            { id: 'add-category', label: t('actions.addCategory'), icon: Plus, variant: 'primary' },
            { id: 'annual-stats', label: t('actions.annualStats'), icon: Target, variant: 'secondary' },
            { id: 'export', label: t('actions.export'), icon: Download, variant: 'secondary' },
            { id: 'import', label: t('actions.import'), icon: Upload, variant: 'secondary' }
          ]
        }

      case '/tasks':
        return {
          title: t('pages.tasks'),
          actions: [
            { id: 'add-task', label: t('actions.newTask'), icon: Plus, variant: 'primary' },
            { id: 'filter', label: t('actions.filter'), icon: Filter, variant: 'secondary' },
            { id: 'calendar', label: t('actions.calendar'), icon: Calendar, variant: 'secondary' },
            { id: 'search', label: t('actions.search'), icon: Search, variant: 'secondary' }
          ]
        }

      case '/notes':
        return {
          title: t('pages.notes'),
          actions: [
            { id: 'add-note', label: t('actions.newNote'), icon: Plus, variant: 'primary' },
            { id: 'search', label: t('actions.search'), icon: Search, variant: 'secondary' },
            { id: 'filter', label: t('actions.filter'), icon: Filter, variant: 'secondary' },
            { id: 'export', label: t('actions.export'), icon: Download, variant: 'secondary' }
          ]
        }

      default:
        return null
    }
  }

  const subHeaderContent = getSubHeaderContent()


  const handleSignOut = async () => {
    // Clear first visit flag so next login starts at home
    localStorage.removeItem('frovo_has_visited')
    localStorage.removeItem('frovo_last_page')
    await signOut()
    window.location.href = '/login'
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
        <div className="flex items-center">
            <svg width="134" height="28" viewBox="0 0 216 45" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.5318 0.156372C28.1799 0.156372 29.8654 0.306199 31.5884 0.605853C33.3489 0.868048 34.9783 1.22389 36.4765 1.67337C37.9748 2.12285 39.1547 2.60978 40.0162 3.13417L34.9595 19.2593C34.9595 17.8359 34.3977 16.7871 33.274 16.1129C32.1503 15.4012 30.9329 15.0454 29.6219 15.0454C29.0226 15.0454 28.4608 15.1016 27.9364 15.2139C27.412 15.3263 26.9438 15.4949 26.5318 15.7196C26.1197 15.9069 25.7639 16.1691 25.4643 16.5062C25.2021 16.8433 24.9961 17.2366 24.8462 17.6861C24.6964 18.1356 24.6215 18.6412 24.6215 19.2031C24.6215 19.2031 24.6215 19.2218 24.6215 19.2593C24.6589 19.2593 24.6777 19.2593 24.6777 19.2593H34.9595L30.9142 32.2942H24.6777C24.6402 32.2942 24.6215 32.2942 24.6215 32.2942C24.6215 32.2942 24.6215 32.3129 24.6215 32.3504C24.6215 33.8486 24.6215 35.1971 24.6215 36.3957C24.6215 37.5568 24.6215 38.7367 24.6215 39.9353C24.6215 41.134 24.6215 42.4824 24.6215 43.9807H5.01292C5.01292 42.4824 5.01292 41.134 5.01292 39.9353C5.01292 38.7367 5.01292 37.5568 5.01292 36.3957C5.01292 35.1971 5.01292 33.8486 5.01292 32.3504C5.01292 32.3129 5.01292 32.2942 5.01292 32.2942C5.01292 32.2942 4.99419 32.2942 4.95674 32.2942H0.686676C1.17361 30.8334 1.66055 29.3913 2.14749 27.9679C2.63442 26.5071 3.10263 25.0463 3.55211 23.5855C4.03905 22.1247 4.52598 20.6826 5.01292 19.2593V18.6974C5.01292 14.9892 5.89315 11.7492 7.65362 8.97741C9.41408 6.16817 11.9049 3.99568 15.1262 2.45996C18.3475 0.924234 22.1493 0.156372 26.5318 0.156372Z" fill="black"/>
              <path d="M58.8881 10.317C58.8881 12.5001 58.8881 14.7015 58.8881 16.9211C58.8881 19.1043 58.8881 21.3057 58.8881 23.5252C58.8881 25.7084 58.8881 27.9098 58.8881 30.1294C58.8881 32.4581 58.8881 34.7869 58.8881 37.1156C58.8881 39.4443 58.8881 41.7912 58.8881 44.1564H40.0035C40.0035 40.5541 40.0035 36.9518 40.0035 33.3496C40.0035 29.7473 40.0035 26.1451 40.0035 22.5428C40.0035 20.5052 40.0035 18.4675 40.0035 16.4299C40.0035 14.3922 40.0035 12.3546 40.0035 10.317H58.8881ZM58.8335 31.1664L61.7808 16.4845C62.1083 14.9198 62.745 13.6281 63.6911 12.6093C64.6735 11.5541 65.8197 10.7536 67.1296 10.2078C68.4395 9.662 69.7858 9.33452 71.1685 9.22536C72.5512 9.07981 73.8247 9.13439 74.9891 9.3891C76.1535 9.60742 77.0813 9.98947 77.7727 10.5353L73.6246 30.8389C72.5694 29.9656 71.2777 29.3653 69.7494 29.0378C68.2576 28.7103 66.7476 28.6012 65.2193 28.7103C63.6911 28.7831 62.3448 29.0378 61.1804 29.4744C60.0161 29.9111 59.2337 30.4751 58.8335 31.1664Z" fill="black"/>
              <path d="M100.696 43.9807C98.5801 43.9807 96.5324 43.827 94.5531 43.5196C92.5737 43.2122 90.7308 42.7512 89.0245 42.1365C87.3181 41.4876 85.7653 40.685 84.3661 39.7288C82.9669 38.7725 81.7724 37.6626 80.7827 36.399C79.7931 35.1012 79.0252 33.6498 78.4792 32.0447C77.9331 30.4054 77.6601 28.5953 77.6601 26.6145C77.6601 24.2922 78.0355 22.209 78.7863 20.3648C79.5712 18.4864 80.6633 16.8472 82.0625 15.447C83.4959 14.0467 85.1681 12.8856 87.0792 11.9635C88.9903 11.0072 91.0892 10.3071 93.3757 9.86315C95.6963 9.38503 98.1364 9.14597 100.696 9.14597C103.904 9.14597 106.89 9.52164 109.654 10.273C112.453 10.9902 114.893 12.083 116.975 13.5515C119.091 14.9859 120.746 16.7959 121.94 18.9816C123.135 21.1674 123.732 23.7116 123.732 26.6145C123.732 29.5174 123.135 32.0617 121.94 34.2474C120.746 36.399 119.091 38.209 116.975 39.6776C114.893 41.1119 112.453 42.1877 109.654 42.9049C106.89 43.6221 103.904 43.9807 100.696 43.9807ZM100.747 30.4054C102.863 30.4054 104.365 29.9956 105.252 29.1759C106.139 28.3563 106.583 27.4683 106.583 26.5121C106.583 26.0681 106.481 25.6241 106.276 25.1802C106.071 24.7362 105.747 24.3264 105.303 23.9507C104.859 23.575 104.262 23.2848 103.511 23.0798C102.761 22.8408 101.839 22.7213 100.747 22.7213C99.6551 22.7213 98.7166 22.8408 97.9317 23.0798C97.1809 23.2848 96.5666 23.575 96.0888 23.9507C95.6451 24.3264 95.3209 24.7362 95.1162 25.1802C94.9114 25.6241 94.809 26.0852 94.809 26.5633C94.809 27.0414 94.9114 27.5196 95.1162 27.9977C95.3209 28.4417 95.6622 28.8515 96.14 29.2271C96.6178 29.5687 97.232 29.8589 97.9828 30.098C98.7336 30.3029 99.6551 30.4054 100.747 30.4054Z" fill="black"/>
              <path d="M170.365 9.14597C169.465 12.0676 168.565 14.9892 167.665 17.9108C166.765 20.795 165.865 23.6792 164.965 26.5633C164.103 29.4475 163.222 32.3504 162.322 35.272C161.422 38.1561 160.522 41.059 159.622 43.9807H132.79C132.078 41.6583 131.365 39.336 130.653 37.0137C129.94 34.6914 129.228 32.3691 128.515 30.0468C127.803 27.7245 127.071 25.4022 126.321 23.0798C125.609 20.7575 124.896 18.4352 124.184 16.1129C123.471 13.7906 122.759 11.4683 122.046 9.14597H142.69C142.915 10.457 143.121 11.7679 143.309 13.0789C143.534 14.3524 143.759 15.6447 143.984 16.9557C144.209 18.2667 144.415 19.5776 144.603 20.8886C144.828 22.1996 145.053 23.5106 145.278 24.8216C145.503 26.1326 145.709 27.4435 145.896 28.7545C146.121 30.0281 146.346 31.3203 146.571 32.6313C146.609 32.8186 146.628 32.9684 146.628 33.0808C146.665 33.1557 146.703 33.1931 146.74 33.1931C146.778 33.1931 146.796 33.1557 146.796 33.0808C146.834 32.9684 146.871 32.8186 146.909 32.6313C147.134 31.3203 147.34 30.0281 147.528 28.7545C147.753 27.4435 147.978 26.1326 148.203 24.8216C148.428 23.5106 148.634 22.1996 148.821 20.8886C149.046 19.5776 149.271 18.2667 149.496 16.9557C149.721 15.6447 149.928 14.3524 150.115 13.0789C150.34 11.7679 150.565 10.457 150.79 9.14597H170.365Z" fill="black"/>
              <path d="M192.277 43.9807C190.162 43.9807 188.114 43.827 186.135 43.5196C184.155 43.2122 182.312 42.7512 180.606 42.1365C178.9 41.4876 177.347 40.685 175.948 39.7288C174.548 38.7725 173.354 37.6626 172.364 36.399C171.375 35.1012 170.607 33.6498 170.061 32.0447C169.515 30.4054 169.242 28.5953 169.242 26.6145C169.242 24.2922 169.617 22.209 170.368 20.3648C171.153 18.4864 172.245 16.8472 173.644 15.447C175.077 14.0467 176.75 12.8856 178.661 11.9635C180.572 11.0072 182.671 10.3071 184.957 9.86315C187.278 9.38503 189.718 9.14597 192.277 9.14597C195.485 9.14597 198.472 9.52164 201.236 10.273C204.034 10.9902 206.474 12.083 208.556 13.5515C210.672 14.9859 212.327 16.7959 213.522 18.9816C214.716 21.1674 215.313 23.7116 215.313 26.6145C215.313 29.5174 214.716 32.0617 213.522 34.2474C212.327 36.399 210.672 38.209 208.556 39.6776C206.474 41.1119 204.034 42.1877 201.236 42.9049C198.472 43.6221 195.485 43.9807 192.277 43.9807ZM192.329 30.4054C194.445 30.4054 195.946 29.9956 196.833 29.1759C197.721 28.3563 198.164 27.4683 198.164 26.5121C198.164 26.0681 198.062 25.6241 197.857 25.1802C197.653 24.7362 197.328 24.3264 196.885 23.9507C196.441 23.575 195.844 23.2848 195.093 23.0798C194.342 22.8408 193.421 22.7213 192.329 22.7213C191.237 22.7213 190.298 22.8408 189.513 23.0798C188.762 23.2848 188.148 23.575 187.67 23.9507C187.227 24.3264 186.902 24.7362 186.698 25.1802C186.493 25.6241 186.391 26.0852 186.391 26.5633C186.391 27.0414 186.493 27.5196 186.698 27.9977C186.902 28.4417 187.244 28.8515 187.722 29.2271C188.199 29.5687 188.814 29.8589 189.564 30.098C190.315 30.3029 191.237 30.4054 192.329 30.4054Z" fill="black"/>
            </svg>
      </div>
      
          {/* Navigation Menu - Center */}
          <nav className="flex items-center gap-2" aria-label={t('aria.mainNavigation')}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ease-out hover:scale-[1.03] ${
                    isActive 
                      ? 'bg-black text-white' 
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
          <div className="relative flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ease-out hover:scale-[1.03] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label={t('aria.logoutAccount')}
              title={t('aria.logoutAccount')}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
        
        {/* Sub-Header */}
        {subHeaderContent && (
          <div className="px-4 py-4 bg-white">
            <div className="flex items-center justify-between">
              <h1 className="text-h2 text-gray-900 leading-none !mb-0">{subHeaderContent.title}</h1>
              
        <div className="flex items-center gap-2">
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
                          ? 'bg-black text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-md'
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
      
    </>
  )
}
