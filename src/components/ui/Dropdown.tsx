import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

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
  buttonStyle?: React.CSSProperties
  dropdownClassName?: string
  icon?: React.ReactNode
  hideChevron?: boolean
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
  buttonStyle,
  dropdownClassName = '',
  icon,
  hideChevron = false,
  'aria-label': ariaLabel
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const [dropdownAlignment, setDropdownAlignment] = useState<'left' | 'right'>('left')
  const [buttonWidth, setButtonWidth] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedOptionRef = useRef<HTMLButtonElement>(null)

  // Find selected option
  const selectedOption = options.find(option => option.value === value)

  // Measure button width when dropdown opens
  useEffect(() => {
    if (open && btnRef.current) {
      setButtonWidth(btnRef.current.offsetWidth)
    }
  }, [open])

  // Auto-scroll to selected option when dropdown opens
  useEffect(() => {
    if (open && selectedOptionRef.current && dropdownRef.current) {
      const dropdown = dropdownRef.current
      const selectedElement = selectedOptionRef.current
      
      // Get positions
      const dropdownRect = dropdown.getBoundingClientRect()
      const selectedRect = selectedElement.getBoundingClientRect()
      
      // Calculate scroll position to center the selected item
      const dropdownHeight = dropdown.clientHeight
      const selectedOffsetTop = selectedElement.offsetTop
      const selectedHeight = selectedElement.offsetHeight
      
      // Center the selected item in the dropdown
      const scrollPosition = selectedOffsetTop - (dropdownHeight / 2) + (selectedHeight / 2)
      
      // Smooth scroll to position
      dropdown.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [open])

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
      if (event.key === 'Escape' && open) {
        event.stopImmediatePropagation()
        setOpen(false)
      }
    }

    if (open) {
      // Add listener with higher priority (capture phase)
      window.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
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
        className={`inline-flex items-center justify-between px-4 py-2.5 rounded-xl text-button bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 ${buttonClassName}`}
        style={buttonStyle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className={`flex items-center ${(selectedOption?.label || placeholder) ? 'gap-2' : ''}`}>
          {icon}
          {(selectedOption?.label || placeholder) && <span>{selectedOption?.label || placeholder}</span>}
        </div>
        {!hideChevron && <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div 
            ref={dropdownRef}
            className={`absolute bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto p-2 ${dropdownClassName}`}
            style={{
              [dropdownPosition === 'bottom' ? 'top' : 'bottom']: '100%',
              [dropdownPosition === 'bottom' ? 'marginTop' : 'marginBottom']: '8px',
              [dropdownAlignment === 'left' ? 'left' : 'right']: '0',
              minWidth: buttonWidth > 0 ? `${buttonWidth}px` : '240px',
              width: 'auto',
              animation: 'dropdownAppear 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: dropdownPosition === 'bottom' ? 'top' : 'bottom'
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                ref={option.value === value ? selectedOptionRef : null}
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
