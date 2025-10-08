import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  dropdownClassName?: string
  icon?: React.ReactNode
  'aria-label'?: string
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  icon,
  'aria-label': ariaLabel
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const [dropdownAlignment, setDropdownAlignment] = useState<'left' | 'right'>('left')
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find selected option
  const selectedOption = options.find(option => option.value === value)

  // Smart positioning when dropdown opens
  useEffect(() => {
    if (!open || !btnRef.current || !dropdownRef.current) return

    const button = btnRef.current
    const dropdown = dropdownRef.current
    const buttonRect = button.getBoundingClientRect()
    const dropdownRect = dropdown.getBoundingClientRect()
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    // Check if dropdown fits below button
    const fitsBelow = buttonRect.bottom + dropdownRect.height + 8 <= viewport.height
    // Check if dropdown fits above button
    const fitsAbove = buttonRect.top - dropdownRect.height - 8 >= 0
    
    // Check horizontal alignment
    const fitsRight = buttonRect.left + dropdownRect.width <= viewport.width
    const fitsLeft = buttonRect.right - dropdownRect.width >= 0

    // Determine position
    setDropdownPosition(fitsBelow ? 'bottom' : fitsAbove ? 'top' : 'bottom')
    setDropdownAlignment(fitsRight ? 'left' : fitsLeft ? 'right' : 'left')
  }, [open])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleOptionSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={btnRef}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-button bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {icon}
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div 
            ref={dropdownRef}
            className={`absolute bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto p-2 w-60 ${dropdownClassName}`}
            style={{
              [dropdownPosition === 'bottom' ? 'top' : 'bottom']: '100%',
              [dropdownPosition === 'bottom' ? 'marginTop' : 'marginBottom']: '8px',
              [dropdownAlignment === 'left' ? 'left' : 'right']: '0',
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => !option.disabled && handleOptionSelect(option.value)}
                disabled={option.disabled}
                style={{ fontSize: '13px' }}
                className={`w-full px-2 py-3 text-left transition-colors ${
                  option.value === value 
                    ? 'bg-black text-white font-medium' 
                    : option.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
