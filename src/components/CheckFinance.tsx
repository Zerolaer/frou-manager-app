import React from 'react'
// CSS imports removed - styles now in styles.css

export default function CheckFinance({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <label className="chk" style={{ lineHeight: 0 }}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="box">
        <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8.5 11.586l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
    </label>
  )
}
