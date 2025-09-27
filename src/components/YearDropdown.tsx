import { useEffect, useRef, useState } from 'react'
// CSS imports removed - styles now in styles.css

export default function YearDropdown({
  value, years, onChange,
}: {
  value: number
  years: number[]
  onChange: (v:number)=>void
}){
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement|null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent){
      if (!open) return
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="dd-wrap">
      <button ref={btnRef} className="btn btn-outline dd-btn" onClick={()=>setOpen(v=>!v)}>{value}</button>
      {open && <div className="dd-backdrop" onClick={()=>setOpen(false)} />}
      {open && (
        <div className="dd-menu">
          {years.map(y => (
            <div
              key={y}
              className={"dd-item " + (y===value ? "dd-active" : "")}
              onClick={()=>{ onChange(y); setOpen(false) }}
            >
              {y}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
