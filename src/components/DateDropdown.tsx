import React from 'react'

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
  disabled = false,
  className = ''
}: DateDropdownProps) {

  return (
    <div className={`relative ${className}`}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-xl px-4 text-sm border border-gray-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      />
    </div>
  )
}