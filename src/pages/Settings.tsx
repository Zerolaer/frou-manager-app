import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  Download,
  FileText,
  Globe,
  Lock,
  Trash2,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabaseClient'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput } from '@/components/ui/CoreInput'
import Dropdown from '@/components/ui/Dropdown'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useModalConfirm } from '@/utils/modalConfirm'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy'
import { cn } from '@/lib/utils'
import '@/settings.css'

type SettingsSection = 'profile' | 'security' | 'system' | 'notifications' | 'data' | 'delete'

function SettingsToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="mt-0.5 text-sm text-gray-500">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-neutral-900' : 'bg-gray-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  )
}

function SettingsRow({
  label,
  description,
  value,
  actionLabel,
  onAction,
}: {
  label: string
  description?: string
  value?: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="mt-0.5 text-sm text-gray-500">{description}</div>}
        {value && <div className="mt-1 truncate text-sm text-gray-700">{value}</div>}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default function Settings() {
  const { t, i18n } = useSafeTranslation()
  const { user, email, signOut } = useSupabaseAuth()
  const { theme, setTheme, getAvailableThemes } = useTheme()
  const { createSimpleFooter } = useModalActions()
  const { alert, confirm } = useModalConfirm()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialSection = (searchParams.get('section') as SettingsSection) || 'profile'
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    ['profile', 'security', 'system', 'notifications', 'data', 'delete'].includes(initialSection)
      ? initialSection
      : 'profile',
  )
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('frovo_settings_collapsed') === 'true')

  const [fullName, setFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [language, setLanguage] = useLocalStorage('frovo_language', 'en')
  const [autoLoadLastPage, setAutoLoadLastPage] = useLocalStorage('frovo_auto_load_last_page', true)
  const [dateFormat, setDateFormat] = useLocalStorage('frovo_date_format', 'dd.MM.yyyy')
  const [timeFormat, setTimeFormat] = useLocalStorage('frovo_time_format', '24h')
  const [timezone, setTimezone] = useLocalStorage(
    'frovo_timezone',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [defaultCurrency, setDefaultCurrency] = useLocalStorage('frovo_default_currency', 'EUR')
  const [autoSaveDrafts, setAutoSaveDrafts] = useLocalStorage('frovo_auto_save_drafts', true)

  const [enableDesktopNotifications, setEnableDesktopNotifications] = useLocalStorage(
    'frovo_enable_desktop_notifications',
    true,
  )
  const [enableUnreadBadge, setEnableUnreadBadge] = useLocalStorage('frovo_enable_unread_badge', true)
  const [communicationEmails, setCommunicationEmails] = useLocalStorage('frovo_communication_emails', true)
  const [announcementEmails, setAnnouncementEmails] = useLocalStorage('frovo_announcement_emails', false)
  const [disableNotificationSounds, setDisableNotificationSounds] = useLocalStorage(
    'frovo_disable_notification_sounds',
    false,
  )

  const [showNameEdit, setShowNameEdit] = useState(false)
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  const availableThemes = getAvailableThemes()

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.name || user.user_metadata?.full_name || '')
    }
    if (email) setUserEmail(email)
  }, [user, email])

  const handleLanguageChange = (newLang: string | number) => {
    const lang = String(newLang)
    setLanguage(lang)
    localStorage.setItem('frovo_language', lang)
    void i18n?.changeLanguage(lang)
  }

  const handleSaveName = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: fullName, full_name: fullName },
      })
      if (error) throw error
      setShowNameEdit(false)
    } catch (error) {
      console.error('Error updating name:', error)
      await alert(t('errors.unknownError'), t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    if (!user || !userEmail) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: userEmail })
      if (error) throw error
      setShowEmailEdit(false)
      await alert(t('settings.account.emailChangeSent') || 'Check your inbox to confirm the new email.', t('common.success'))
    } catch (error) {
      console.error('Error updating email:', error)
      await alert(t('errors.unknownError'), t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      await alert(t('settings.account.passwordsDontMatch'), t('common.error'))
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      await alert(t('auth.passwordTooShort'), t('common.error'))
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      await supabase.auth.signOut({ scope: 'global' })
      window.location.assign('/login')
    } catch (error) {
      console.error('Error updating password:', error)
      await alert(t('errors.unknownError'), t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDesktopNotifications = async (enabled: boolean) => {
    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setEnableDesktopNotifications(enabled)
  }

  const handleClearLocalData = async () => {
    const ok = await confirm(
      t('settings.data.clearLocalConfirm') ||
        'Clear cached data on this device? Your cloud data stays intact.',
      t('settings.data.clearLocal') || 'Clear local cache',
    )
    if (!ok) return
    const keep = new Set(['frovo_language', 'frovo_has_visited'])
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('frovo_') && !keep.has(key)) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    await alert(t('settings.data.clearLocalDone') || 'Local cache cleared.', t('common.success'))
  }

  const handleDeleteAccount = async () => {
    const ok = await confirm(
      t('settings.delete.warning') ||
        'Deleting your account will permanently remove all your data. This action cannot be undone.',
      t('settings.delete.confirm') || 'Delete Account',
    )
    if (!ok) return
    try {
      // Client cannot hard-delete auth.users with anon key; clear local state and sign out.
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('frovo_') || key.startsWith('sb-'))) keys.push(key)
      }
      keys.forEach((k) => localStorage.removeItem(k))
      await signOut()
      await alert(
        t('settings.delete.signedOut') ||
          'Signed out and cleared local data. Contact support to permanently delete the account on the server.',
        t('common.success'),
      )
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Delete account flow failed:', error)
    }
  }

  const displayName =
    user?.user_metadata?.name || user?.user_metadata?.full_name || email?.split('@')[0] || 'User'

  const sections: Array<{
    id: SettingsSection
    label: string
    icon: LucideIcon
    danger?: boolean
  }> = [
    { id: 'profile', label: t('settings.sections.profile') || 'Profile', icon: User },
    { id: 'security', label: t('settings.sections.security') || 'Security', icon: Lock },
    { id: 'system', label: t('settings.sections.system') || 'Preferences', icon: Globe },
    { id: 'notifications', label: t('settings.sections.notifications') || 'Notifications', icon: Bell },
    { id: 'data', label: t('settings.sections.data') || 'Data', icon: Download },
    { id: 'delete', label: t('settings.sections.delete') || 'Delete', icon: Trash2, danger: true },
  ]

  const themeOptions = availableThemes.map((th) => ({
    value: th.name,
    label: t(`settings.system.themes.${th.name}`) || th.displayName,
  }))

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.profile') || 'Profile'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.profile.subtitle') || 'Manage how you appear across Frovo.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-semibold text-white">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{displayName}</div>
                  <div className="text-sm text-gray-500">{email}</div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                <SettingsRow
                  label={t('settings.account.name') || 'Full name'}
                  value={fullName || (t('settings.account.notSet') || 'Not set')}
                  actionLabel={t('actions.edit') || 'Edit'}
                  onAction={() => setShowNameEdit(true)}
                />
                <SettingsRow
                  label={t('settings.account.email') || 'Email'}
                  value={userEmail}
                  actionLabel={t('actions.edit') || 'Edit'}
                  onAction={() => setShowEmailEdit(true)}
                />
              </div>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.security') || 'Security'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.security.subtitle') || 'Protect your account with a strong password.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <SettingsRow
                label={t('settings.account.password') || 'Password'}
                description={t('settings.account.passwordDescription') || 'Minimum 8 characters'}
                actionLabel={t('settings.account.changePassword') || 'Change'}
                onAction={() => setShowPasswordEdit(true)}
              />
            </div>
          </div>
        )

      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.system') || 'Preferences'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.system.subtitle') || 'Language, theme, dates and currency.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.language')}
                  </label>
                  <Dropdown
                    value={language}
                    onChange={handleLanguageChange}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'ru', label: 'Русский' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.theme')}
                  </label>
                  <Dropdown
                    value={theme.name}
                    onChange={(v) => setTheme(String(v))}
                    options={themeOptions}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.dateFormat')}
                  </label>
                  <Dropdown
                    value={dateFormat}
                    onChange={(v) => setDateFormat(String(v))}
                    options={[
                      { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' },
                      { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
                      { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
                      { value: 'dd MMM yyyy', label: 'DD MMM YYYY' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.timeFormat')}
                  </label>
                  <Dropdown
                    value={timeFormat}
                    onChange={(v) => setTimeFormat(String(v))}
                    options={[
                      { value: '24h', label: '24h' },
                      { value: '12h', label: '12h' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.timezone')}
                  </label>
                  <Dropdown
                    value={timezone}
                    onChange={(v) => setTimezone(String(v))}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'Europe/Moscow', label: 'Europe/Moscow' },
                      { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
                      { value: 'Asia/Tbilisi', label: 'Asia/Tbilisi' },
                      { value: 'America/New_York', label: 'America/New_York' },
                      { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    {t('settings.system.defaultCurrency')}
                  </label>
                  <Dropdown
                    value={defaultCurrency}
                    onChange={(v) => setDefaultCurrency(String(v))}
                    options={[
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'GEL', label: 'GEL (₾)' },
                      { value: 'RUB', label: 'RUB (₽)' },
                    ]}
                  />
                </div>
              </div>
              <SettingsToggle
                checked={autoLoadLastPage}
                onChange={setAutoLoadLastPage}
                label={t('settings.system.autoLoadLastPage')}
                description={t('settings.system.autoLoadLastPageDescription')}
              />
              <SettingsToggle
                checked={autoSaveDrafts}
                onChange={setAutoSaveDrafts}
                label={t('settings.system.autoSaveDrafts')}
                description={t('settings.system.autoSaveDraftsDescription')}
              />
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.notifications') || 'Notifications'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.notifications.subtitle') || 'Choose what this device should remind you about.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              <SettingsToggle
                checked={enableDesktopNotifications}
                onChange={(v) => void handleDesktopNotifications(v)}
                label={t('settings.notifications.enableDesktop')}
                description={t('settings.notifications.enableDesktopDesc')}
              />
              <SettingsToggle
                checked={enableUnreadBadge}
                onChange={setEnableUnreadBadge}
                label={t('settings.notifications.enableBadge')}
                description={t('settings.notifications.enableBadgeDesc')}
              />
              <SettingsToggle
                checked={communicationEmails}
                onChange={setCommunicationEmails}
                label={t('settings.notifications.communicationEmails')}
                description={t('settings.notifications.communicationEmailsDesc')}
              />
              <SettingsToggle
                checked={announcementEmails}
                onChange={setAnnouncementEmails}
                label={t('settings.notifications.announcements')}
                description={t('settings.notifications.announcementsDesc')}
              />
              <SettingsToggle
                checked={disableNotificationSounds}
                onChange={setDisableNotificationSounds}
                label={t('settings.notifications.disableSounds')}
                description={t('settings.notifications.disableSoundsDesc')}
              />
            </div>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.data') || 'Data'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.data.subtitle') || 'Export from modules or clear this device cache.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              <button
                type="button"
                onClick={() => navigate('/finance')}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <Wallet className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {t('settings.data.exportFinance') || 'Export finance'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.data.exportFinanceDesc') || 'Open Finance and use Export JSON / CSV'}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate('/notes')}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {t('settings.data.exportNotes') || 'Export notes'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.data.exportNotesDesc') || 'Open Notes and use the export action'}
                  </div>
                </div>
              </button>
              <SettingsRow
                label={t('settings.data.clearLocal') || 'Clear local cache'}
                description={
                  t('settings.data.clearLocalDesc') ||
                  'Removes offline caches and filters on this device'
                }
                actionLabel={t('common.clear') || 'Clear'}
                onAction={() => void handleClearLocalData()}
              />
            </div>
          </div>
        )

      case 'delete':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t('settings.sections.delete') || 'Delete account'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('settings.delete.subtitle') || 'Danger zone — irreversible actions.'}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
              <p className="text-sm text-gray-700">
                {t('settings.delete.warning')}
              </p>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                {t('settings.delete.confirm')}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('settings-page', collapsed && 'is-collapsed')}>
      <aside className="settings-sidebar">
        <div className="settings-sidebar-head">
          <button
            type="button"
            className="sidebar-btn btn-outline"
            onClick={() => {
              const next = !collapsed
              setCollapsed(next)
              localStorage.setItem('frovo_settings_collapsed', String(next))
            }}
            aria-label={collapsed ? t('aria.expand') : t('aria.collapse')}
          >
            <ChevronLeft
              size={16}
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            />
          </button>
          {!collapsed && (
            <div className="title">{t('settings.title') || 'Settings'}</div>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-2.5">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                title={section.label}
                className={cn(
                  'flex h-[42px] items-center gap-2.5 rounded-xl border px-3 text-left text-sm transition-colors',
                  collapsed ? 'w-[42px] justify-center px-0' : 'w-full',
                  isActive
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : section.danger
                      ? 'border-transparent text-red-600 hover:bg-red-50'
                      : 'border-transparent text-gray-700 hover:bg-gray-50',
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate font-medium">{section.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="settings-content overflow-y-auto p-1 sm:p-2">{renderContent()}</div>

      <UnifiedModal
        open={showNameEdit}
        onClose={() => setShowNameEdit(false)}
        title={t('settings.account.editName') || 'Edit Name'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: () => void handleSaveName(),
            disabled: saving || !fullName.trim(),
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowNameEdit(false),
          },
        )}
      >
        <CoreInput
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('settings.account.namePlaceholder') || 'Enter your full name'}
          autoFocus
        />
      </UnifiedModal>

      <UnifiedModal
        open={showEmailEdit}
        onClose={() => setShowEmailEdit(false)}
        title={t('settings.account.editEmail') || 'Edit Email'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: () => void handleSaveEmail(),
            disabled: saving || !userEmail.trim(),
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowEmailEdit(false),
          },
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

      <UnifiedModal
        open={showPasswordEdit}
        onClose={() => setShowPasswordEdit(false)}
        title={t('settings.account.changePassword') || 'Change Password'}
        footer={createSimpleFooter(
          {
            label: t('actions.save') || 'Save',
            onClick: () => void handleSavePassword(),
            disabled:
              saving ||
              !newPassword ||
              newPassword !== confirmPassword ||
              newPassword.length < MIN_PASSWORD_LENGTH,
          },
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: () => setShowPasswordEdit(false),
          },
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('settings.account.newPassword') || 'New Password'}
            </label>
            <CoreInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={
                t('settings.account.newPasswordPlaceholder') ||
                `Enter new password (minimum ${MIN_PASSWORD_LENGTH} characters)`
              }
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('settings.account.confirmPassword') || 'Confirm Password'}
            </label>
            <CoreInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.account.confirmPasswordPlaceholder') || 'Repeat new password'}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {t('settings.account.passwordsDontMatch')}
              </p>
            )}
          </div>
        </div>
      </UnifiedModal>
    </div>
  )
}
