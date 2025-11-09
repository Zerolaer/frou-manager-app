import React from 'react'
import { format as formatDate } from 'date-fns'
import { useModal } from '@/hooks/useModal'
import Dropdown, { DropdownOption } from './Dropdown'
import { useSafeTranslation } from '@/utils/safeTranslation'
import CustomDatePicker from './CustomDatePicker'

export interface UnifiedDropdownProps {
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  variant?: 'default' | 'compact' | 'large'
  size?: 'sm' | 'md' | 'lg'
  searchable?: boolean
  multiple?: boolean
  clearable?: boolean
  'aria-label'?: string
}

// Project dropdown variant
export interface ProjectDropdownProps extends UnifiedDropdownProps {
  projects: Array<{ id: string; name: string }>
}

export function ProjectDropdown({ 
  projects, 
  value, 
  onChange, 
  placeholder,
  ...props 
}: ProjectDropdownProps) {
  const { t } = useSafeTranslation()
  
  const options: DropdownOption[] = [
    { value: '', label: t('projects.noProject') },
    ...projects.map(project => ({
      value: project.id,
      label: project.name
    }))
  ]

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('projects.selectProject')}
      {...props}
    />
  )
}

// Priority dropdown variant
export interface PriorityDropdownProps extends UnifiedDropdownProps {
  priorities?: Array<{ value: string; label: string; color?: string }>
}

export function PriorityDropdown({ 
  priorities,
  value, 
  onChange, 
  placeholder,
  ...props 
}: PriorityDropdownProps) {
  const { t } = useSafeTranslation()
  
  // Use provided priorities or default with translations
  const defaultPriorities = [
    { value: 'low', label: t('tasks.lowPriority'), color: '#10b981' },
    { value: 'normal', label: t('tasks.normalPriority'), color: '#3b82f6' },
    { value: 'high', label: t('tasks.highPriority'), color: '#ef4444' }
  ]
  
  const prioritiesToUse = priorities || defaultPriorities
  const options: DropdownOption[] = prioritiesToUse.map(priority => ({
    value: priority.value,
    label: priority.label
  }))

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('tasks.priority')}
      {...props}
    />
  )
}

// Status dropdown variant
export interface StatusDropdownProps extends UnifiedDropdownProps {
  statuses?: Array<{ value: string; label: string; color?: string }>
}

export function StatusDropdown({ 
  statuses,
  value, 
  onChange, 
  placeholder,
  ...props 
}: StatusDropdownProps) {
  const { t } = useSafeTranslation()
  
  // Use provided statuses or default with translations
  const defaultStatuses = [
    { value: 'open', label: t('tasks.open'), color: '#3b82f6' },
    { value: 'closed', label: t('tasks.closed'), color: '#10b981' }
  ]
  
  const statusesToUse = statuses || defaultStatuses
  const options: DropdownOption[] = statusesToUse.map(status => ({
    value: status.value,
    label: status.label
  }))

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('tasks.status')}
      {...props}
    />
  )
}

// Date dropdown variant
export interface DateDropdownProps extends UnifiedDropdownProps {
  format?: 'date' | 'datetime' | 'time'
  minDate?: Date
  maxDate?: Date
}

export function DateDropdown({ 
  format = 'date',
  minDate,
  maxDate,
  value, 
  onChange, 
  placeholder = 'Выберите дату...',
  ...props 
}: DateDropdownProps) {
  // Use custom date picker for 'date' format, fallback to native input for time/datetime
  if (format !== 'date') {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    }
    
    return (
      <input
        type={format === 'time' ? 'time' : 'datetime-local'}
        value={value as string}
        onChange={handleChange}
        placeholder={placeholder}
        min={minDate ? formatDate(minDate, 'yyyy-MM-dd') : undefined}
        max={maxDate ? formatDate(maxDate, 'yyyy-MM-dd') : undefined}
        disabled={props.disabled}
        className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
        aria-label={props['aria-label']}
      />
    )
  }

  return (
    <CustomDatePicker
      value={value as string}
      onChange={(newValue) => onChange(newValue)}
      placeholder={placeholder}
      disabled={props.disabled}
      className={props.className}
      buttonClassName={props.buttonClassName}
    />
  )
}

// Year dropdown variant
export interface YearDropdownProps extends UnifiedDropdownProps {
  years: number[]
}

export function YearDropdown({ 
  years,
  value, 
  onChange, 
  placeholder = 'Выберите год...',
  ...props 
}: YearDropdownProps) {
  const options: DropdownOption[] = years.map(year => ({
    value: year.toString(),
    label: year.toString()
  }))

  return (
    <Dropdown
      options={options}
      value={value.toString()}
      onChange={(newValue) => onChange(typeof newValue === 'number' ? newValue : parseInt(String(newValue)))}
      placeholder={placeholder}
      {...props}
    />
  )
}

// Type dropdown variant
export interface TypeDropdownProps extends UnifiedDropdownProps {
  types?: Array<{ value: string; label: string }>
  fullWidth?: boolean
}

export function TypeDropdown({ 
  types = [
    { value: 'income', label: 'Доход' },
    { value: 'expense', label: 'Расход' }
  ],
  fullWidth = false,
  value, 
  onChange, 
  placeholder = 'Выберите тип...',
  ...props 
}: TypeDropdownProps) {
  const options: DropdownOption[] = types.map(type => ({
    value: type.value,
    label: type.label
  }))

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={fullWidth ? 'w-full' : props.className}
      {...props}
    />
  )
}

// Generic unified dropdown
export function UnifiedDropdown({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  variant = 'default',
  size = 'md',
  searchable = false,
  multiple = false,
  clearable = false,
  ...props
}: UnifiedDropdownProps & { options: DropdownOption[] }) {
  const dropdownOptions: DropdownOption[] = [
    ...(clearable ? [{ value: '', label: 'Очистить' }] : []),
    ...options
  ]

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const variantClasses = {
    default: 'border-gray-200',
    compact: 'border-gray-300 px-2 py-1.5 text-xs',
    large: 'border-gray-200 px-4 py-3 text-base'
  }

  return (
    <Dropdown
      options={dropdownOptions}
      value={value}
      onChange={(newValue) => {
        if (clearable && newValue === '') {
          onChange('')
        } else {
          onChange(newValue)
        }
      }}
      placeholder={placeholder}
      buttonClassName={`${sizeClasses[size]} ${variantClasses[variant]}`}
      {...props}
    />
  )
}

// Export all dropdown variants
export {
  type DropdownOption
}
