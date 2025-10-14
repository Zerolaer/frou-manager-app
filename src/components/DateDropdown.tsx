import React from 'react'
import CustomDatePicker from './ui/CustomDatePicker'

interface DateDropdownProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function DateDropdown({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}: DateDropdownProps) {

  return (
    <CustomDatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}