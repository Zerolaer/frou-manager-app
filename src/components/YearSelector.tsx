import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

interface YearSelectorProps {
  currentYear: number
  onYearChange: (year: number) => void
}

export default function YearSelector({ currentYear, onYearChange }: YearSelectorProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Generate years array (current year ± 3)
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

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

  const handleYearSelect = (year: number) => {
    onYearChange(year)
    setOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-button bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        aria-label="Выбрать год"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Calendar className="w-4 h-4" />
        {currentYear}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  year === currentYear ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
                role="option"
                aria-selected={year === currentYear}
              >
                {year}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
