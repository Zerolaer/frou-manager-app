import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from '@/components/ui/Modal'
import { Plus, Trash2, GripVertical } from 'lucide-react'

type Entry = { id: string; amount: number; note: string | null; included: boolean; position: number }

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
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Entry[]>([])
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState<string>('')

  const timers = useRef<Record<string, any>>({})
  const debounce = (key: string, fn: () => void, ms = 350) => {
    clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, ms)
  }

  const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
  const monthLabel = monthNames[monthIndex]
  const fmt = useMemo(()=> new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR' }), [])

  // Drag state
  const dragId = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('finance_entries')
        .select('id, amount, note, included, position, created_at')
        .eq('category_id', categoryId)
        .eq('year', year)
        .eq('month', monthIndex + 1)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) { console.error(error); setLoading(false); return }
      const list = (data || []).map((d:any)=>({ id: d.id, amount: Number(d.amount)||0, note: d.note, included: !!d.included, position: d.position ?? 0 }))
      setItems(list)
      setLoading(false)
    })()
  }, [open, categoryId, monthIndex, year])

  function sumIncluded(list: Entry[]) {
    return list.reduce((s, e) => s + (e.included ? e.amount : 0), 0)
  }

  async function addItem() {
    const value = Number(String(amount).replace(',', '.'))
    if (!userId || isNaN(value)) return
    const insert = {
      user_id: userId, category_id: categoryId, year, month: monthIndex + 1,
      amount: value, note, included: true, position: items.length
    }
    const { data, error } = await supabase.from('finance_entries')
      .insert(insert).select('id, amount, note, included, position').single()
    if (error) { console.error(error); return }
    const next: Entry[] = [...items, { id: data.id, amount: Number(data.amount)||0, note: data.note, included: !!data.included, position: data.position ?? items.length }]
    setItems(next); setAmount(''); setNote('')
    onApply(sumIncluded(next))
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
      if (error) console.error(error)
    })
  }

  function changeNote(id: string, value: string) {
    updateItemLocal(id, { note: value })
    debounce('note:'+id, async () => {
      const { error } = await supabase.from('finance_entries').update({ note: value }).eq('id', id)
      if (error) console.error(error)
    })
  }

  async function toggleIncluded(id: string, checked: boolean) {
    updateItemLocal(id, { included: checked })
    const { error } = await supabase.from('finance_entries').update({ included: checked }).eq('id', id)
    if (error) console.error(error)
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from('finance_entries').delete().eq('id', id)
    if (error) { console.error(error); return }
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

  return (
  
<Modal   open={open}   onClose={onClose}   title={<span bodyClassName="p-0"><b>{categoryName}</b> · {monthLabel} {year}</span>}
  footer={<div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
    <button className="btn btn-outline" onClick={onClose}>Закрыть</button>
  </div>}
  size="md"
>
  <div className="editor-body">
          {loading && <div className="loading-overlay">Загрузка…</div>}
          <div className="editor-add">
            <input type="number" placeholder="Сумма (€)" value={amount} onChange={e=>setAmount(e.target.value)} className="editor-input number" />
            <input placeholder="Описание (необязательно)" value={note} onChange={e=>setNote(e.target.value)} className="editor-input text" />
            <button className="btn btn-outline flex items-center gap-2" onClick={addItem}>
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
          <div>
            {items.map(i => (
              <div key={i.id} className={"entry-row " + (!i.included ? "entry-disabled" : "")}
                draggable onDragStart={()=>onDragStart(i.id)} onDragOver={onDragOver} onDrop={()=>onDrop(i.id)}>
                <div className="entry-drag">
                  <GripVertical className="w-4 h-4" />
                </div>
                <label className="chk">
                  <input type="checkbox" checked={i.included} onChange={e=>toggleIncluded(i.id, e.target.checked)} />
                  <span className="box"><svg className="icon" viewBox="0 0 20 20"><path fill="currentColor" d="M8.143 13.314 4.829 10l-1.18 1.18 4.494 4.494 8-8-1.18-1.18z"/></svg></span>
                </label>
                <input type="number" className="editor-input entry-amount" value={String(i.amount)} onChange={e=>changeAmount(i.id, e.target.value)} />
                <input className="editor-input entry-note" value={i.note || ""} onChange={e=>changeNote(i.id, e.target.value)} />
                <button className="btn btn-danger btn-sm flex items-center gap-1" onClick={()=>removeItem(i.id)}>
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              </div>
            ))}
            {!loading && items.length === 0 && (<div style={{ fontSize:13, color:'#64748b' }}>Ещё нет записей.</div>)}
          </div>
        </div>

</Modal>

)
}
