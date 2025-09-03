import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabaseClient'
import '@/ui.css'

type Entry = { id: string; amount: number; note: string | null; included: boolean; position: number }

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  categoryId: string
  categoryName: string
  monthIndex: number
  year: number
  onApply: (sum: number) => void
}

/** Debounce helper */
function useDebounce() {
  const timers = useRef<Record<string, any>>({})
  return (key: string, fn: () => void, ms = 300) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(fn, ms)
  }
}

export default function CellEditorModal(props: Props) {
  const { open, onClose, categoryId, categoryName, monthIndex, year, onApply } = props
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Entry[]>([])
  const dragId = useRef<string | null>(null)
  const debounce = useDebounce()

  const sumIncluded = (arr: Entry[]) => arr.filter(i => i.included).reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const sum = useMemo(() => sumIncluded(items), [items])

  async function reload() {
    if (!open) return
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_entries')
      .select('id, amount, note, included, position, created_at')
      .eq('category_id', categoryId)
      .eq('year', year)
      .eq('month', monthIndex + 1)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      setItems([])
    } else {
      const rows = (data ?? []) as any[]
      const mapped: Entry[] = rows.map(r => ({
        id: r.id,
        amount: Number(r.amount) || 0,
        note: r.note,
        included: !!r.included,
        position: Number(r.position) || 0,
      }))
      setItems(mapped)
      onApply(sumIncluded(mapped))
    }
    setLoading(false)
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, categoryId, monthIndex, year])

  async function addItem() {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_entries')
      .insert({
        category_id: categoryId,
        year,
        month: monthIndex + 1,
        amount: 0,
        note: null,
        included: true,
        position: items.length,
      })
      .select()
      .single()
    if (error) {
      console.error(error)
    } else {
      const r: any = data
      const next = items.concat([{ id: r.id, amount: 0, note: null, included: true, position: items.length }])
      setItems(next)
      onApply(sumIncluded(next))
    }
    setLoading(false)
  }

  function setAmount(id: string, value: number) {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, amount: value } : it)
      onApply(sumIncluded(next))
      return next
    })
    debounce('amount:' + id, async () => {
      const { error } = await supabase.from('finance_entries').update({ amount: value }).eq('id', id)
      if (error) console.error(error)
    })
  }

  function setNote(id: string, note: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, note } : it))
    debounce('note:' + id, async () => {
      const { error } = await supabase.from('finance_entries').update({ note }).eq('id', id)
      if (error) console.error(error)
    })
  function saveNoteImmediate(id: string, note: string) {
    (async () => {
      const { error } = await supabase.from('finance_entries').update({ note }).eq('id', id)
      if (error) console.error(error)
    })()
  }

  }

  async function toggleInclude(id: string) {
    const it = items.find(i => i.id === id)
    if (!it) return
    const nextVal = !it.included
    setItems(prev => {
      const next = prev.map(x => x.id === id ? { ...x, included: nextVal } : x)
      onApply(sumIncluded(next))
      return next
    })
    const { error } = await supabase.from('finance_entries').update({ included: nextVal }).eq('id', id)
    if (error) console.error(error)
  }

  async function del(id: string) {
    const { error } = await supabase.from('finance_entries').delete().eq('id', id)
    if (error) {
      console.error(error); return
    }
    const next = items.filter(i => i.id !== id).map((it, idx) => ({ ...it, position: idx }))
    setItems(next)
    onApply(sumIncluded(next))
    // persist positions
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
    next.forEach((it, idx) => it.position = idx)
    setItems(next)
    await Promise.all(next.map((it, idx) => supabase.from('finance_entries').update({ position: idx }).eq('id', it.id)))
  }

  const monthName = new Date(year, monthIndex, 1).toLocaleString('ru-RU', { month: 'long' })
  const title = (
    <div className="flex flex-col">
      <div className="text-base font-semibold">{categoryName}</div>
      <div className="text-xs text-gray-500 capitalize">{monthName} {year}</div>
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-gray-600">Сумма: <b>{sum}</b></div>
      <div className="flex gap-2">
        <button className="btn btn-outline" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={addItem} disabled={loading}>Добавить</button>
        </div>
        <div className="space-y-2">
          {items.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 border rounded-xl p-2"
              draggable
              onDragStart={() => onDragStart(e.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(e.id)}
            >
              <input type="checkbox" checked={e.included} onChange={() => toggleInclude(e.id)} />
              <input
                type="number"
                className="flex-1 input input-sm"
                value={e.amount}
                onChange={ev => setAmount(e.id, Number((ev.target as HTMLInputElement).value) || 0)}
              />
              <input
                type="text"
                className="flex-1 input input-sm"
                placeholder="Название"
                value={e.note ?? ''}
                onChange={ev => setNote(e.id, (ev.target as HTMLInputElement).value)} onBlur={ev => saveNoteImmediate(e.id, (ev.target as HTMLInputElement).value)}
              />
              <button className="btn btn-outline" onClick={() => del(e.id)}>Удалить</button>
            </div>
          ))}
          {!loading && items.length === 0 && (<div className="text-sm text-gray-500">Ещё нет записей.</div>)}
        </div>
      </div>
    </Modal>
  )
}
