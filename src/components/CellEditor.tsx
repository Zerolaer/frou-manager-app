import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from '@/components/ui/Modal'
import { CoreInput } from '@/components/ui/CoreInput'
import Dropdown from '@/components/ui/Dropdown'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { convertToEUR, initializeExchangeRates } from '@/utils/currency'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/monitoring'

type Entry = { id: string; amount: number; currency: 'EUR' | 'USD' | 'GEL'; note: string | null; included: boolean; position: number }

export default function CellEditor({
  open, onClose, userId, categoryId, categoryName, monthIndex, year,
  onApply,
}: {
  open: boolean
  onClose: () => void
  userId: string
  categoryId: string
  categoryName: string
  monthIndex: number
  year: number
  onApply: (newSum: number) => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Entry[]>([])
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GEL'>('EUR')
  const [note, setNote] = useState<string>('')
  const [animatingCheckboxes, setAnimatingCheckboxes] = useState<Set<string>>(new Set())
  const [activeDropdownEntry, setActiveDropdownEntry] = useState<string | null>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const timers = useRef<Record<string, any>>({})
  const debounce = (key: string, fn: () => void, ms = 350) => {
    clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, ms)
  }

  const monthNames = useMemo(() => [
    t('finance.months.jan'),
    t('finance.months.feb'),
    t('finance.months.mar'),
    t('finance.months.apr'),
    t('finance.months.may'),
    t('finance.months.jun'),
    t('finance.months.jul'),
    t('finance.months.aug'),
    t('finance.months.sep'),
    t('finance.months.oct'),
    t('finance.months.nov'),
    t('finance.months.dec')
  ], [t])
  const monthLabel = monthNames[monthIndex]
  const fmt = useMemo(()=> new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }), [])

  // Drag state
  const dragId = useRef<string | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownEntry && !(event.target as Element).closest('.currency-dropdown')) {
        setActiveDropdownEntry(null)
      }
    }
    
    if (activeDropdownEntry) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdownEntry])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      
      // Initialize exchange rates
      await initializeExchangeRates()
      
      const { data, error } = await supabase
        .from('finance_entries')
        .select('id, amount, currency, note, included, position, created_at')
        .eq('category_id', categoryId)
        .eq('year', year)
        .eq('month', monthIndex + 1)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) { logger.error('Failed to load entries:', error); setLoading(false); return }
      const list = (data || []).map((d:any)=>({ 
        id: d.id, 
        amount: Number(d.amount)||0, 
        currency: d.currency || 'EUR',
        note: d.note, 
        included: !!d.included, 
        position: d.position ?? 0 
      }))
      setItems(list)
      setLoading(false)
    })()
  }, [open, categoryId, monthIndex, year])

  // Auto-focus on amount input when modal opens
  useEffect(() => {
    if (open && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  function sumIncluded(list: Entry[]) {
    return list.reduce((s, e) => {
      if (!e.included) return s
      const amountInEUR = convertToEUR(e.amount, e.currency)
      return s + amountInEUR
    }, 0)
  }

  async function addItem() {
    const value = Number(String(amount).replace(',', '.'))
    if (!userId || isNaN(value)) return
    const insert = {
      user_id: userId, category_id: categoryId, year, month: monthIndex + 1,
      amount: value, currency, note, included: true, position: items.length
    }
    const { data, error } = await supabase.from('finance_entries')
      .insert(insert).select('id, amount, currency, note, included, position').single()
    if (error) { logger.error('Failed to add entry:', error); return }
    const next: Entry[] = [...items, { 
      id: data.id, 
      amount: Number(data.amount)||0, 
      currency: data.currency || 'EUR',
      note: data.note, 
      included: !!data.included, 
      position: data.position ?? items.length 
    }]
    setItems(next); setAmount(''); setNote(''); setCurrency('EUR')
    onApply(sumIncluded(next))
    // Focus back to amount input after adding
    setTimeout(() => {
      amountInputRef.current?.focus()
    }, 50)
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  function updateItemLocal(id: string, patch: Partial<Entry>) {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...patch } : i)
      onApply(sumIncluded(next))
      return next
    })
  }

  function changeAmount(id: string, value: string) {
    const num = Number(String(value).replace(',', '.'))
    updateItemLocal(id, { amount: isNaN(num) ? 0 : num })
    debounce('amt:'+id, async () => {
      const { error } = await supabase.from('finance_entries').update({ amount: isNaN(num) ? 0 : num }).eq('id', id)
      if (error) logger.error('Failed to update entry:', error)
    })
  }

  function changeNote(id: string, value: string) {
    updateItemLocal(id, { note: value })
    debounce('note:'+id, async () => {
      const { error } = await supabase.from('finance_entries').update({ note: value }).eq('id', id)
      if (error) logger.error('Failed to update entry:', error)
    })
  }

  function changeCurrency(id: string, value: 'EUR' | 'USD' | 'GEL') {
    updateItemLocal(id, { currency: value })
    debounce('currency:'+id, async () => {
      const { error } = await supabase.from('finance_entries').update({ currency: value }).eq('id', id)
      if (error) logger.error('Failed to update entry:', error)
    })
  }

  function handleDropdownOpen(id: string) {
    setActiveDropdownEntry(id)
  }

  function handleDropdownClose() {
    setActiveDropdownEntry(null)
  }

  async function toggleIncluded(id: string, checked: boolean) {
    // Start animation
    setAnimatingCheckboxes(prev => new Set(prev).add(id))
    
    updateItemLocal(id, { included: checked })
    const { error } = await supabase.from('finance_entries').update({ included: checked }).eq('id', id)
    if (error) logger.error('Failed to toggle entry inclusion:', error)
    
    // Stop animation after 300ms
    setTimeout(() => {
      setAnimatingCheckboxes(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }, 300)
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from('finance_entries').delete().eq('id', id)
    if (error) { logger.error('Failed to delete entry:', error); return }
    const next = items.filter(i => i.id !== id)
    next.forEach((it, idx) => { it.position = idx })
    setItems(next)
    onApply(sumIncluded(next))
    await Promise.all(next.map((it, idx) => supabase.from('finance_entries').update({ position: idx }).eq('id', it.id)))
  }

  function onDragStart(id: string) { dragId.current = id }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  async function onDrop(overId: string) {
    const fromId = dragId.current
    dragId.current = null
    if (!fromId || fromId === overId) return
    const fromIdx = items.findIndex(i => i.id === fromId)
    const overIdx = items.findIndex(i => i.id === overId)
    if (fromIdx < 0 || overIdx < 0) return
    const next = items.slice()
    const [moved] = next.splice(fromIdx, 1)
    next.splice(overIdx, 0, moved)
    next.forEach((it, idx) => { it.position = idx })
    setItems(next)
    onApply(sumIncluded(next))
    await Promise.all(next.map((it, idx) => supabase.from('finance_entries').update({ position: idx }).eq('id', it.id)))
  }

  // CSS animations for checkboxes (add to head if not present)
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('checkbox-animations-cell')) {
      const style = document.createElement('style')
      style.id = 'checkbox-animations-cell'
      style.textContent = `
        @keyframes checkboxPress {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.85);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes checkmarkBounce {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
  
<Modal   open={open}   onClose={onClose}   title={
    <div className="text-center">
      <b>{categoryName}</b> · <span style={{ color: '#64748b', fontSize: '14px' }}>{monthLabel} {year}</span>
    </div>
  }
  footer={
    <div className="flex justify-between items-center w-full">
      <div className="cursor-default" style={{ 
        color: '#64748b',
        padding: '8px 16px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'transparent',
        fontSize: '14px'
      }}>
        <span style={{ fontWeight: 400 }}>{t('finance.total')}:</span> {fmt.format(sumIncluded(items))}
      </div>
      <button className="btn btn-outline" onClick={onClose}>
        {t('actions.close')}
      </button>
    </div>
  }
  size="cell"
>
  <div className="editor-body">
          {loading && <div className="loading-overlay">{t('common.loading')}</div>}
          <div className="editor-add">
            <CoreInput 
              ref={amountInputRef}
              type="number" 
              placeholder={t('finance.amount')} 
              value={amount} 
              onChange={e=>setAmount(e.target.value)} 
              onKeyPress={handleKeyPress}
              className="editor-input number" 
            />
            <Dropdown
              value={currency}
              onChange={(value) => setCurrency(value as 'EUR' | 'USD' | 'GEL')}
              options={[
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
                { value: 'GEL', label: 'GEL' }
              ]}
              className="editor-input currency"
              dropdownClassName="currency-dropdown"
            />
            <CoreInput 
              placeholder={t('finance.descriptionOptional')} 
              value={note} 
              onChange={e=>setNote(e.target.value)} 
              onKeyPress={handleKeyPress}
              className="editor-input text" 
            />
            <button className="btn btn-primary" style={{ borderRadius: '12px' }} onClick={addItem}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div>
            {items.map(i => (
              <div key={i.id} className={"entry-row " + (!i.included ? "entry-disabled" : "") + (activeDropdownEntry === i.id ? " entry-active" : "")}
                draggable onDragStart={()=>onDragStart(i.id)} onDragOver={onDragOver} onDrop={()=>onDrop(i.id)}>
                <div className="entry-drag">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div
                  onClick={() => toggleIncluded(i.id, !i.included)}
                  style={{ 
                    width: '24px', 
                    height: '24px',
                    borderRadius: '999px',
                    backgroundColor: i.included ? '#000000' : '#ffffff',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                    animation: animatingCheckboxes.has(i.id) ? 'checkboxPress 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                  }}
                >
                  {i.included && (
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: animatingCheckboxes.has(i.id) ? 'checkmarkBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                      }}
                    >
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  )}
                </div>
                <CoreInput 
                  type="number" 
                  className="editor-input entry-amount" 
                  value={String(i.amount)} 
                  onChange={e=>changeAmount(i.id, e.target.value)}
                />
                <div onClick={() => handleDropdownOpen(i.id)}>
                  <Dropdown
                    value={i.currency}
                    onChange={(value) => {
                      changeCurrency(i.id, value as 'EUR' | 'USD' | 'GEL')
                      handleDropdownClose()
                    }}
                    options={[
                      { value: 'EUR', label: 'EUR' },
                      { value: 'USD', label: 'USD' },
                      { value: 'GEL', label: 'GEL' }
                    ]}
                    className="editor-input entry-currency"
                    dropdownClassName="currency-dropdown"
                  />
                </div>
                <CoreInput className="editor-input entry-note" value={i.note || ""} onChange={e=>changeNote(i.id, e.target.value)} />
                <button className="w-10 h-10 bg-white border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50" onClick={()=>removeItem(i.id)}>
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
            {!loading && items.length === 0 && (<div style={{ fontSize:13, color:'#64748b' }}>{t('finance.noEntries')}</div>)}
          </div>
        </div>

</Modal>

)
}
