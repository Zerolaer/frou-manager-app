import React from 'react'

export default function Check({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={
        'w-4 h-4 inline-grid place-items-center flex-none shrink-0 grow-0 rounded-none border ' +
        (checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50')
      }
      style={{ lineHeight: 0 }}
    >
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="h-3 w-3">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8.5 11.586l6.793-6.793a1 1 0 0 1 1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}
