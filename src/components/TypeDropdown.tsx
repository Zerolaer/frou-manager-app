
import { useEffect, useRef, useState } from 'react'

type Props = {
  value: 'income' | 'expense'
  onChange: (v: 'income' | 'expense') => void
  fullWidth?: boolean
}

export default function TypeDropdown({ value, onChange, fullWidth }: Props){
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    const onDoc = (e:MouseEvent)=>{
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const label = value === 'income' ? 'Доходы' : 'Расходы'

  return (
    <div ref={wrapRef} className={`dd-wrap ${fullWidth ? 'block' : ''}`}>
      <button
        type="button"
        className={`btn btn-outline dd-btn ${fullWidth ? 'full' : ''}`}
        style={{ justifyContent: 'flex-start' }}  // левое выравнивание
        onClick={()=>setOpen(v=>!v)}
      >
        <span style={{ pointerEvents:'none' }}>{label}</span>
        <span style={{ marginLeft:'auto', opacity:.7 }}>&#9662;</span>
      </button>
      {open && (
        <>
          <div className="dd-backdrop" onClick={()=>setOpen(false)} />
          <div className={`dd-menu ${fullWidth ? 'full' : ''}`}>
            <div className={`dd-item ${value==='income' ? 'dd-active':''}`} onClick={()=>{ onChange('income'); setOpen(false) }}>Доходы</div>
            <div className={`dd-item ${value==='expense' ? 'dd-active':''}`} onClick={()=>{ onChange('expense'); setOpen(false) }}>Расходы</div>
          </div>
        </>
      )}
    </div>
  )
}
