import React, { useState, useEffect } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabaseClient'
import { User, Mail, Lock, Globe, Palette, Calendar, Clock, DollarSign, Bell, CreditCard, Download, Trash2, ChevronLeft } from 'lucide-react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput } from '@/components/ui/CoreInput'
import Dropdown from '@/components/ui/Dropdown'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useModalConfirm } from '@/utils/modalConfirm'
import '@/settings.css'

type SettingsSection = 'profile' | 'security' | 'system' | 'notifications' | 'billing' | 'data' | 'delete'

export default function Settings() {
  const { t, i18n } = useSafeTranslation()
  const { user, email } = useSupabaseAuth()
  const { theme, setTheme, getAvailableThemes } = useTheme()
  const { createSimpleFooter } = useModalActions()
  const { alert } = useModalConfirm()
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('frovo_settings_collapsed')
    return saved === 'true'
  })
  
  // Account settings
  const [fullName, setFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // System settings
  const [language, setLanguage] = useLocalStorage('frovo_language', 'en')
  const [autoLoadLastPage, setAutoLoadLastPage] = useLocalStorage('frovo_auto_load_last_page', true)
  const [dateFormat, setDateFormat] = useLocalStorage('frovo_date_format', 'dd.MM.yyyy')
  const [timeFormat, setTimeFormat] = useLocalStorage('frovo_time_format', '24h')
  const [timezone, setTimezone] = useLocalStorage('frovo_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [defaultCurrency, setDefaultCurrency] = useLocalStorage('frovo_default_currency', 'EUR')
  const [autoSaveDrafts, setAutoSaveDrafts] = useLocalStorage('frovo_auto_save_drafts', true)
  
  // Notification settings
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useLocalStorage('frovo_enable_desktop_notifications', true)
  const [enableUnreadBadge, setEnableUnreadBadge] = useLocalStorage('frovo_enable_unread_badge', true)
  const [pushNotificationTimeout, setPushNotificationTimeout] = useLocalStorage('frovo_push_timeout', '10')
  const [communicationEmails, setCommunicationEmails] = useLocalStorage('frovo_communication_emails', true)
  const [announcementEmails, setAnnouncementEmails] = useLocalStorage('frovo_announcement_emails', false)
  const [disableNotificationSounds, setDisableNotificationSounds] = useLocalStorage('frovo_disable_notification_sounds', false)
  
  // Modal states
  const [showNameEdit, setShowNameEdit] = useState(false)
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const availableThemes = getAvailableThemes()
  
  const dateFormatOptions = [
    { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY (31.12.2024)' },
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (12/31/2024)' },
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2024-12-31)' },
    { value: 'dd MMM yyyy', label: 'DD MMM YYYY (31 Dec 2024)' },
  ]
  
  const timeFormatOptions = [
    { value: '24h', label: '24 часа (14:30)' },
    { value: '12h', label: '12 часов (2:30 PM)' },
  ]
  
  const currencyOptions = [
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'GEL', label: 'GEL (₾)' },
    { value: 'RUB', label: 'RUB (₽)' },
  ]
  
  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK)' },
    { value: 'Europe/Kiev', label: 'Europe/Kiev (EET)' },
    { value: 'Asia/Tbilisi', label: 'Asia/Tbilisi (GET)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  ]
  
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ]
  
  const pushTimeoutOptions = [
    { value: '5', label: '5 Minutes' },
    { value: '10', label: '10 Minutes' },
    { value: '15', label: '15 Minutes' },
    { value: '30', label: '30 Minutes' },
  ]
  
  // Initialize user data when user is loaded
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.name || user.user_metadata?.full_name || ''
      setFullName(name)
    }
    if (email) {
      setUserEmail(email)
    }
  }, [user, email])
  
  // Update language when changed
  const handleLanguageChange = (newLang: string | number) => {
    const lang = String(newLang)
    setLanguage(lang)
    if (i18n) {
      localStorage.setItem('frovo_language', lang)
      i18n.changeLanguage(lang)
    }
  }
  
  // Save name
  const handleSaveName = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: fullName, full_name: fullName }
      })
      if (error) throw error
      setShowNameEdit(false)
    } catch (error) {
      console.error('Error updating name:', error)
    } finally {
      setSaving(false)
    }
  }
  
  // Save email
  const handleSaveEmail = async () => {
    if (!user || !userEmail) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: userEmail })
      if (error) throw error
      setShowEmailEdit(false)
    } catch (error) {
      console.error('Error updating email:', error)
    } finally {
      setSaving(false)
    }
  }
  
  // Save password
  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      await alert('Пароли не совпадают', t('common.error') || 'Error')
      return
    }
    if (newPassword.length < 6) {
      await alert('Пароль должен быть минимум 6 символов', t('common.error') || 'Error')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordEdit(false)
    } catch (error) {
      console.error('Error updating password:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || email?.split('@')[0] || 'User'
  
  const sections = [
    { id: 'profile' as SettingsSection, label: t('settings.sections.profile') || 'My Profile', icon: User },
    { id: 'security' as SettingsSection, label: t('settings.sections.security') || 'Security', icon: Lock },
    { id: 'system' as SettingsSection, label: t('settings.sections.system') || 'System Settings', icon: Globe },
    { id: 'notifications' as SettingsSection, label: t('settings.sections.notifications') || 'Notifications', icon: Bell },
    { id: 'billing' as SettingsSection, label: t('settings.sections.billing') || 'Billing', icon: CreditCard },
    { id: 'data' as SettingsSection, label: t('settings.sections.data') || 'Data Export', icon: Download },
    { id: 'delete' as SettingsSection, label: t('settings.sections.delete') || 'Delete Account', icon: Trash2, danger: true },
  ]
  
  const handleToggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('frovo_settings_collapsed', String(newState))
  }
  
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.profile') || 'My Profile'}</h2>
            
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
              {/* Name */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {t('settings.account.name') || 'Full Name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {displayName || t('settings.account.notSet') || 'Not set'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFullName(displayName)
                    setShowNameEdit(true)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('actions.edit') || 'Edit'}
                </button>
              </div>
              
              {/* Email */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('settings.account.email') || 'Email'}
                  </div>
                  <div className="text-sm text-gray-500">{email || '-'}</div>
                </div>
                <button
                  onClick={() => {
                    setUserEmail(email || '')
                    setShowEmailEdit(true)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('actions.edit') || 'Edit'}
                </button>
              </div>
            </div>
          </div>
        )
        
      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.security') || 'Security'}</h2>
            
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {t('settings.account.password') || 'Password'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.account.passwordDescription') || 'Change your password to protect your account'}
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordEdit(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('actions.change') || 'Change'}
                </button>
              </div>
            </div>
          </div>
        )
        
      case 'system':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.system') || 'System Settings'}</h2>
            
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
              {/* Language */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      {t('settings.system.language') || 'Interface Language'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.languageDescription') || 'Choose the interface language'}
                    </div>
                  </div>
                </div>
                <Dropdown
                  options={languageOptions}
                  value={language}
                  onChange={handleLanguageChange}
                  className="max-w-xs"
                />
              </div>
              
              {/* Theme */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {t('settings.system.theme') || 'Theme'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.themeDescription') || 'Choose the appearance theme'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
                  {availableThemes.map((themeOption) => (
                    <button
                      key={themeOption.name}
                      onClick={() => setTheme(themeOption.name)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme.name === themeOption.name
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{themeOption.displayName}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Date Format */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {t('settings.system.dateFormat') || 'Date Format'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.dateFormatDescription') || 'Choose how dates are displayed'}
                    </div>
                  </div>
                </div>
                <Dropdown
                  options={dateFormatOptions}
                  value={dateFormat}
                  onChange={(value) => setDateFormat(String(value))}
                  className="max-w-xs"
                />
              </div>
              
              {/* Time Format */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t('settings.system.timeFormat') || 'Time Format'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.timeFormatDescription') || 'Choose how time is displayed'}
                    </div>
                  </div>
                </div>
                <Dropdown
                  options={timeFormatOptions}
                  value={timeFormat}
                  onChange={(value) => setTimeFormat(String(value))}
                  className="max-w-xs"
                />
              </div>
              
              {/* Timezone */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      {t('settings.system.timezone') || 'Timezone'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.timezoneDescription') || 'Choose your timezone'}
                    </div>
                  </div>
                </div>
                <Dropdown
                  options={timezoneOptions}
                  value={timezone}
                  onChange={(value) => setTimezone(String(value))}
                  className="max-w-xs"
                />
              </div>
              
              {/* Default Currency */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {t('settings.system.defaultCurrency') || 'Default Currency'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.system.defaultCurrencyDescription') || 'Default currency for finances'}
                    </div>
                  </div>
                </div>
                <Dropdown
                  options={currencyOptions}
                  value={defaultCurrency}
                  onChange={(value) => setDefaultCurrency(String(value))}
                  className="max-w-xs"
                />
              </div>
              
              {/* Auto-load last page */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {t('settings.system.autoLoadLastPage') || 'Auto-load Last Page'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.system.autoLoadLastPageDescription') || 'Automatically open the last visited page on login'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLoadLastPage}
                    onChange={(e) => setAutoLoadLastPage(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
              
              {/* Auto-save drafts */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {t('settings.system.autoSaveDrafts') || 'Auto-save Drafts'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.system.autoSaveDraftsDescription') || 'Automatically save task drafts'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveDrafts}
                    onChange={(e) => setAutoSaveDrafts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            </div>
          </div>
        )
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.notifications') || 'Notifications'}</h2>
            
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
              {/* Push Notification Settings */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.notifications.pushTitle') || 'Push Notification Settings'}</h3>
                
                <div className="space-y-6">
                  {/* Enable Desktop Notification */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {t('settings.notifications.enableDesktop') || 'Enable Desktop Notification'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('settings.notifications.enableDesktopDesc') || 'Receive notification all of the messages, contracts, documents.'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableDesktopNotifications}
                        onChange={(e) => setEnableDesktopNotifications(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                  
                  {/* Enable Unread Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {t('settings.notifications.enableBadge') || 'Enable Unread Notification Badge'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('settings.notifications.enableBadgeDesc') || 'Shows a red badge on the app icon when you have unread message'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableUnreadBadge}
                        onChange={(e) => setEnableUnreadBadge(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                  
                  {/* Push Notification Time-out */}
                  <div>
                    <div className="font-medium text-gray-900 mb-2">
                      {t('settings.notifications.pushTimeout') || 'Push Notification Time-out'}
                    </div>
                    <Dropdown
                      options={pushTimeoutOptions}
                      value={pushNotificationTimeout}
                      onChange={(value) => setPushNotificationTimeout(String(value))}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              </div>
              
              {/* Email Notifications */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.notifications.emailTitle') || 'Email Notifications'}</h3>
                
                <div className="space-y-6">
                  {/* Communication Emails */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {t('settings.notifications.communicationEmails') || 'Communication Emails'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('settings.notifications.communicationEmailsDesc') || 'Receive email for messages, contracts, documents.'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={communicationEmails}
                        onChange={(e) => setCommunicationEmails(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                  
                  {/* Announcements & Updates */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {t('settings.notifications.announcements') || 'Announcements & Updates'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('settings.notifications.announcementsDesc') || 'Receive email about product updates, improvements, etc.'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcementEmails}
                        onChange={(e) => setAnnouncementEmails(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Sounds */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.notifications.soundsTitle') || 'Sounds'}</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      {t('settings.notifications.disableSounds') || 'Disable All Notification Sounds'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.notifications.disableSoundsDesc') || 'Mute all notification of the messages, contracts, documents.'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disableNotificationSounds}
                      onChange={(e) => setDisableNotificationSounds(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 'billing':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.billing') || 'Billing'}</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-gray-500">{t('settings.billing.comingSoon') || 'Billing settings coming soon...'}</p>
            </div>
          </div>
        )
        
      case 'data':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.data') || 'Data Export'}</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-gray-500">{t('settings.data.comingSoon') || 'Data export functionality coming soon...'}</p>
            </div>
          </div>
        )
        
      case 'delete':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('settings.sections.delete') || 'Delete Account'}</h2>
            <div className="bg-white rounded-2xl border border-red-200 p-6">
              <p className="text-gray-700 mb-4">{t('settings.delete.warning') || 'Deleting your account will permanently remove all your data. This action cannot be undone.'}</p>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                {t('settings.delete.confirm') || 'Delete Account'}
              </button>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  return (
    <div className={`settings-page ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Left Sidebar */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-head">
          <button 
            className="sidebar-btn btn-outline" 
            onClick={handleToggleCollapse} 
            aria-label={collapsed ? t('aria.expand') : t('aria.collapse')}
            style={{ 
              position: 'absolute',
              left: '0',
              flexShrink: 0
            }}
          >
            <ChevronLeft 
              size={16} 
              style={{ 
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </button>
          
          <div 
            className="text-sm font-semibold text-gray-700" 
            style={{ 
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              transition: 'opacity 0.2s ease', 
              opacity: collapsed ? 0 : 1,
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {t('settings.title') || 'Settings'}
          </div>
        </div>
        
        <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px' }}>
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`border h-[42px] flex items-center text-left ${isActive ? 'border-black bg-black text-white' : section.danger ? 'border-red-200 hover:bg-red-50 text-red-600' : 'border-gray-200 hover:bg-gray-50'}`}
                style={{ 
                  borderRadius: '12px', 
                  width: collapsed ? '42px' : '100%',
                  position: 'relative',
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden'
                }}
              >
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  flexShrink: 0,
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <Icon size={16} />
                </span>
                <span 
                  className="truncate" 
                  style={{ 
                    transition: 'opacity 0.2s ease', 
                    opacity: collapsed ? 0 : 1,
                    whiteSpace: 'nowrap',
                    marginLeft: '28px',
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400
                  }}
                >
                  {section.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Right Content */}
      <div className="settings-content">
        {renderContent()}
      </div>
      
      {/* Name Edit Modal */}
      <UnifiedModal
        open={showNameEdit}
        onClose={() => setShowNameEdit(false)}
        title={t('settings.account.editName') || 'Edit Name'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: handleSaveName,
            disabled: saving || !fullName.trim()
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowNameEdit(false)
          }
        )}
      >
        <CoreInput
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('settings.account.namePlaceholder') || 'Enter your full name'}
          autoFocus
        />
      </UnifiedModal>
      
      {/* Email Edit Modal */}
      <UnifiedModal
        open={showEmailEdit}
        onClose={() => setShowEmailEdit(false)}
        title={t('settings.account.editEmail') || 'Edit Email'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: handleSaveEmail,
            disabled: saving || !userEmail.trim()
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowEmailEdit(false)
          }
        )}
      >
        <CoreInput
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder={t('settings.account.emailPlaceholder') || 'Enter your email'}
          autoFocus
        />
      </UnifiedModal>
      
      {/* Password Edit Modal */}
      <UnifiedModal
        open={showPasswordEdit}
        onClose={() => setShowPasswordEdit(false)}
        title={t('settings.account.changePassword') || 'Change Password'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: handleSavePassword,
            disabled: saving || !newPassword || newPassword !== confirmPassword || newPassword.length < 6
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowPasswordEdit(false)
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.account.newPassword') || 'New Password'}
            </label>
            <CoreInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('settings.account.newPasswordPlaceholder') || 'Enter new password (minimum 6 characters)'}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.account.confirmPassword') || 'Confirm Password'}
            </label>
            <CoreInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.account.confirmPasswordPlaceholder') || 'Repeat new password'}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                {t('settings.account.passwordsDontMatch') || 'Passwords do not match'}
              </p>
            )}
          </div>
        </div>
      </UnifiedModal>
    </div>
  )
}
