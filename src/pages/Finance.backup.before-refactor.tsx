import { MoreVertical } from "lucide-react";
import { TableSkeleton } from '@/components/Skeleton'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import '@/ui.css'
import '../finance-grid.css'
import CellEditor from '@/components/CellEditor'
import Modal from '@/components/Modal'
import YearDropdown from '@/components/YearDropdown'
import TypeDropdown from '@/components/TypeDropdown'
import AnnualStatsModal from '@/components/AnnualStatsModal'


// Added: accessible trigger for context menu
function ContextMenuButton({ onOpen }: { onOpen: (e: React.MouseEvent | React.KeyboardEvent) => void }) {
  return (
    <button
      type="button"
      aria-label="Open menu"
      aria-haspopup="menu"
      onClick={(e) => onOpen(e)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e); } }}
      className="menu-btn ml-1 rounded p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <MoreVertical className="size-4" />
    </button>
  );
}


type Cat = { id: string; name: string; type: 'income'|'expense'; values: number[]; parent_id?: string | null }
type EntryLite = { amount:number; note:string|null; included:boolean; position:number }

const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'] as const

const fmtEUR = (n:number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const cacheKey = (uid: string, year: number) => `finance:${uid}:${year}`
function writeCache(uid: string, year: number, data: {
  income: { id: string; name: string; values: number[]; parent_id?: string | null }[]
  expense:{ id: string; name: string; values: number[]; parent_id?: string | null }[]
}) {
  try { localStorage.setItem(cacheKey(uid, year), JSON.stringify(data)) } catch {}
}
function readCache(uid: string, year: number) {
  try {
    const raw = localStorage.getItem(cacheKey(uid, year))
    if (!raw) return null
    return JSON.parse(raw) as {
      income: { id: string; name: string; values: number[]; parent_id?: string | null }[]
      expense:{ id: string; name: string; values: number[]; parent_id?: string | null }[]
    }
  } catch { return null }
}

function clampToViewport(x:number, y:number, w:number, h:number){
  const pad = 8
  const vw = window.innerWidth, vh = window.innerHeight
  let nx = x, ny = y
  if (nx + w + pad > vw) nx = Math.max(pad, vw - w - pad)
  if (ny + h + pad > vh) ny = Math.max(pad, vh - h - pad)
  if (nx < pad) nx = pad
  if (ny < pad) ny = pad
  return { x: nx, y: ny }
}

const CTX_MENU_W = 192
const CTX_MENU_H_CAT = 140
const CTX_MENU_H_CELL = 96

function computeDescendantSums(list: Cat[]) {
  const months = 12
  const byId: Record<string, Cat> = {}
  const children: Record<string, string[]> = {}
  for (const c of list) {
    byId[c.id] = c
    if (c.parent_id) (children[c.parent_id] ||= []).push(c.id)
  }
  const memo: Record<string, number[]> = {}

  function dfs(id: string): number[] {
    if (!children[id]) return Array(months).fill(0)
    if (memo[id]) return memo[id].slice()
    const out = Array(months).fill(0)
    for (const childId of children[id]) {
      const child = byId[childId]
      for (let i = 0; i < months; i++) out[i] += (child?.values[i] || 0)
      const sub = dfs(childId)
      for (let i = 0; i < months; i++) out[i] += sub[i]
    }
    memo[id] = out.slice()
    return out
  }

  const result: Record<string, number[]> = {}
  Object.keys(children).forEach(pid => { result[pid] = dfs(pid) })
  return result
}

export default function Finance(){
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = useState(currentYear)
  const [userId, setUserId] = useState<string | null>(null)

  const [incomeRaw, setIncomeRaw] = useState<Cat[]>([])
  const [expenseRaw, setExpenseRaw] = useState<Cat[]>([])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const incomeCategories = useMemo(()=>applyCollapse(incomeRaw, collapsed), [incomeRaw, collapsed])
  const expenseCategories = useMemo(()=>applyCollapse(expenseRaw, collapsed), [expenseRaw, collapsed])

  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<'income'|'expense'>('income')
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState<{id:string,name:string}|null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCat, setEditorCat] = useState<{id:string,name:string,type:'income'|'expense'}|null>(null)
  const [editorMonth, setEditorMonth] = useState<number>(0)

  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState<{x:number,y:number}>({x:0,y:0})
  const [ctxCat, setCtxCat] = useState<{id:string,name:string,type:'income'|'expense'}|null>(null)

  const [cellCtxOpen, setCellCtxOpen] = useState(false)
  const [cellCtxPos, setCellCtxPos] = useState<{x:number,y:number}>({x:0,y:0})
  const [cellCtx, setCellCtx] = useState<{catId:string, type:'income'|'expense', month:number}|null>(null)
  const [cellClipboard, setCellClipboard] = useState<EntryLite[]|null>(null)
  const [cellCanCopy, setCellCanCopy] = useState(false)

  const [showStats, setShowStats] = useState(false)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [ctxCatHighlight, setCtxCatHighlight] = useState<string|null>(null)
  const [ctxCellHighlight, setCtxCellHighlight] = useState<{type:'income'|'expense', catId:string, month:number}|null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id || null
      setUserId(uid)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUserId(sess?.user?.id || null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!userId) return
    const cached = readCache(userId, year)
    if (cached) {
      setIncomeRaw(cached.income.map(c => ({...c, type: 'income' as const})))
      setExpenseRaw(cached.expense.map(c => ({...c, type: 'expense' as const})))
      setLoading(false)
    } else {
      setLoading(true)
    }
    ;(async () => {
      const [catsRes, entriesRes] = await Promise.all([
        supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at', { ascending: true }),
        supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', year),
      ])
      if (catsRes.error || entriesRes.error) { console.error(catsRes.error || entriesRes.error); setLoading(false); return }
      const cats = catsRes.data || []
      const entries = entriesRes.data || []
      const byId: Record<string, number[]> = {}
      for (const c of cats) byId[c.id] = Array(12).fill(0)
      for (const e of entries) {
        if (!e.included) continue
        const i = Math.min(11, Math.max(0, (e.month as number) - 1))
        const id = e.category_id as string
        if (!byId[id]) byId[id] = Array(12).fill(0)
        byId[id][i] += Number(e.amount) || 0
      }
      const income = cats.filter((c:any)=>c.type==='income').map((c:any)=>({ id:c.id, name:c.name, type:'income' as const, parent_id:c.parent_id, values:byId[c.id]||Array(12).fill(0) }))
      const expense = cats.filter((c:any)=>c.type==='expense').map((c:any)=>({ id:c.id, name:c.name, type:'expense' as const, parent_id:c.parent_id, values:byId[c.id]||Array(12).fill(0) }))
      setIncomeRaw(income); setExpenseRaw(expense); setLoading(false)
      writeCache(userId, year, {
        income: income.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
        expense: expense.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
      })
    })()
  }, [userId, year])

  const totalIncomeByMonth = useMemo(() => months.map((_,i)=> incomeRaw.reduce((s,c)=> s + (c.values[i]||0), 0)), [incomeRaw])
  const totalExpenseByMonth = useMemo(() => months.map((_,i)=> expenseRaw.reduce((s,c)=> s + (c.values[i]||0), 0)), [expenseRaw])
  const balanceByMonth = useMemo(() => totalIncomeByMonth.map((v,i)=> v - totalExpenseByMonth[i]), [totalIncomeByMonth, totalExpenseByMonth])

  const childrenMapIncome = useMemo(()=>{
    const map: Record<string, number> = {}
    incomeRaw.forEach(c => { if (c.parent_id) map[c.parent_id] = (map[c.parent_id]||0) + 1 })
    return map
  }, [incomeRaw])
  const childrenMapExpense = useMemo(()=>{
    const map: Record<string, number> = {}
    expenseRaw.forEach(c => { if (c.parent_id) map[c.parent_id] = (map[c.parent_id]||0) + 1 })
    return map
  }, [expenseRaw])

  const aggregatedIncomeByParent = useMemo(() => computeDescendantSums(incomeRaw), [incomeRaw])
  const aggregatedExpenseByParent = useMemo(() => computeDescendantSums(expenseRaw), [expenseRaw])

  function applyCollapse(list: Cat[], collapsed: Record<string, boolean>): Cat[]{
    const parents = list.filter(c => !c.parent_id)
    const byParent: Record<string, Cat[]> = {}
    list.forEach(c => { if (c.parent_id) (byParent[c.parent_id] ||= []).push(c) })
    const res: Cat[] = []
    parents.forEach(p => { 
      res.push(p)
      if (!collapsed[p.id]) (byParent[p.id]||[]).forEach(ch => res.push(ch))
    })
    list.filter(c=>c.parent_id && !parents.find(p=>p.id===c.parent_id)).forEach(ch=>res.push(ch))
    return res
  }

  async function addCategory(){
    const name = newName.trim()
    if (!name || !userId) return
    const type = newType
    const payload: any = { user_id: userId, type, name }
    if (newParent) payload.parent_id = newParent.id
    const { data, error } = await supabase.from('finance_categories').insert(payload).select('id,name,type,parent_id').single()
    if (error) { console.error(error); return }
    const cat: Cat = { id: data.id, name: data.name, type: data.type, parent_id: data.parent_id, values: Array(12).fill(0) }
    if (type === 'income') {
      const raw = [...incomeRaw, cat]; setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    } else {
      const raw = [...expenseRaw, cat]; setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    }
    setShowAdd(false); setNewName(''); setNewType('income'); setNewParent(null)
  }

  function onContextCategory(e: React.MouseEvent, cat: {id:string,name:string,type:'income'|'expense'}) {
    e.preventDefault(); e.stopPropagation()
    if (cellCtxOpen) setCellCtxOpen(false)
    setCtxCellHighlight(null)
    setCtxCatHighlight(cat.id)
    const cl = clampToViewport(e.clientX, e.clientY, CTX_MENU_W, CTX_MENU_H_CAT)
    setCtxPos({ x: cl.x, y: cl.y })
    setCtxCat(cat)
    setCtxOpen(true)
  }
  function closeCtx(){ setCtxOpen(false); setCtxCat(null); setCtxCatHighlight(null) }

  async function submitRename(){
    const name = renameValue.trim()
    if (!name || !ctxCat) { setRenameOpen(false); return }
    const { error } = await supabase.from('finance_categories').update({ name }).eq('id', ctxCat.id)
    if (error) { console.error(error); return }
    if (ctxCat.type === 'income') {
      const raw = incomeRaw.map(c => c.id === ctxCat.id ? { ...c, name } : c); setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    } else {
      const raw = expenseRaw.map(c => c.id === ctxCat.id ? { ...c, name } : c); setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    }
    setRenameOpen(false)
  }

  async function confirmDelete(){
    if (!ctxCat) return
    const { error } = await supabase.from('finance_categories').delete().eq('id', ctxCat.id)
    if (error) { console.error(error); return }
    if (ctxCat.type === 'income') {
      const raw = incomeRaw.filter(c => c.id !== ctxCat.id); setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    } else {
      const raw = expenseRaw.filter(c => c.id !== ctxCat.id); setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    }
    setDeleteOpen(false)
  }

  async function onCellContext(e: React.MouseEvent, type:'income'|'expense', catId:string, month:number, displayed:number){

    e.preventDefault(); e.stopPropagation()
    // Close any other menu instantly
    if (ctxOpen) setCtxOpen(false)
    if (cellCtxOpen) setCellCtxOpen(false)
    setCtxCatHighlight(null)
    setCtxCellHighlight({ type, catId, month })

    const where = { category_id: catId, year, month: month+1 }
    const canPaste = !!cellClipboard && cellClipboard.length > 0

    // If cell visually empty and nothing to paste -> do nothing (no menu)
    if (!canPaste && (!displayed || displayed === 0)) { setCtxCellHighlight(null); return }

    // Open menu immediately at cursor; copy option may appear after async check
    const cl = clampToViewport(e.clientX, e.clientY, CTX_MENU_W, CTX_MENU_H_CELL)
    setCellCtx({catId, type, month})
    setCellCtxPos({ x: cl.x, y: cl.y })
    setCellCanCopy(false)
    setCellCtxOpen(true)

    // Fetch entries async; if none and cannot paste -> close menu quickly
    const { data } = await supabase.from('finance_entries')
      .select('amount, note, included, position')
      .match(where)
      .order('position', { ascending: true }).order('created_at', { ascending: true })
    const entries: EntryLite[] = (data || []).map((d:any)=>({ amount:Number(d.amount)||0, note:d.note, included:!!d.included, position: d.position ?? 0 }))
    ;(window as any).__entriesForCopy = entries
    if (!entries.length && !canPaste) {
      setCellCtxOpen(false); setCtxCellHighlight(null)
      return
    }
    setCellCanCopy(entries.length > 0)
  
  }

  async function copyCell(){
    const entries: EntryLite[] = (window as any).__entriesForCopy || []
    if (!entries.length) { setCellCtxOpen(false); setCtxCellHighlight(null); return }
    setCellClipboard(entries.map(e=>({ ...e })))
    try { await navigator.clipboard.writeText(JSON.stringify(entries)) } catch {}
    setCellCtxOpen(false); setCtxCellHighlight(null)
  }

  async function pasteCell(){
    if (!cellCtx || !cellClipboard || !cellClipboard.length || !userId) return
    const { catId, type, month } = cellCtx
    const where = { category_id: catId, year, month: month+1 }
    await supabase.from('finance_entries').delete().match(where)
    const rows = cellClipboard.map((e, idx) => ({ ...where, user_id: userId, amount: e.amount, note: e.note, included: e.included, position: idx }))
    await supabase.from('finance_entries').insert(rows)
    const sum = rows.filter(r=>r.included).reduce((s,r)=>s + (r.amount||0), 0)
    const updateRaw = (raw: Cat[]) => raw.map(c => c.id === catId ? { ...c, values: c.values.map((v,i)=> i===month ? sum : v) } : c)
    if (type === 'income') setIncomeRaw(updateRaw(incomeRaw)); else setExpenseRaw(updateRaw(expenseRaw))
    setCellCtxOpen(false); setCtxCellHighlight(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCtxOpen(false); setCellCtxOpen(false); setCtxCatHighlight(null); setCtxCellHighlight(null) } }
    const onWheel = () => { setCtxOpen(false); setCellCtxOpen(false); setCtxCatHighlight(null); setCtxCellHighlight(null) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel) }
  }, [])

  if (loading) return <div className="p-4"><TableSkeleton rows={10} /></div>

  const isCurrentYear = year === currentYear
  const yearOptions = Array.from({length:7}).map((_,i)=> currentYear - 3 + i)

  return (
    <div className="space-y-6 finance-page" onContextMenu={(e)=>{ e.preventDefault() }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <YearDropdown value={year} years={yearOptions} onChange={setYear} />
        </div>
        <div className="flex gap-3">
          <button className="btn" onClick={()=>{ setNewType('income'); setNewParent(null); setShowAdd(true) }}>Добавить категорию</button>
          <button className="btn btn-outline text-gray-900" onClick={()=>setShowStats(true)}>Годовая статистика</button>
        </div>
      </div>

      <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">Категория</div></div>
        {months.map((m,idx) => (
          <div key={m} className={"finance-cell " + (isCurrentYear && idx===currentMonth ? "head-current" : "finance-head")}>
            <div className="cell-head cell-right">{m} {year}</div>
          </div>
        ))}

        <div className="finance-section">
          <span>Доходы</span>
          <button className="btn btn-outline btn-xs text-gray-900" onClick={()=>{ setNewType('income'); setNewParent(null); setShowAdd(true) }}>+ Категория</button>
        </div>

        {incomeCategories.map((row)=> {
          const hasChildren = !!aggregatedIncomeByParent[row.id]
          const valuesToShow = hasChildren ? aggregatedIncomeByParent[row.id] : row.values
          return (
            <div className="finance-row contents" key={'i'+row.id}>
              <div
                className={"finance-cell cell-name " + (ctxCatHighlight===row.id ? "ctx-active" : "")}
                onContextMenu={(e)=>onContextCategory(e, { id: row.id, name: row.name, type: 'income' })}
                style={{ display:'flex', alignItems:'center', gap:8, paddingLeft: row.parent_id ? 24 : 8 }}
              >
                {row.name}<ContextMenuButton onOpen={(e)=>onContextCategory(e, { id: row.id, name: row.name, type: 'income' })} />
                {!row.parent_id && (childrenMapIncome[row.id] || 0) > 0 && (
                  <div className={"chev " + (!collapsed[row.id] ? "open" : "")} onClick={()=> setCollapsed(p=>({ ...p, [row.id]: !p[row.id] }))} title={collapsed[row.id] ? 'Развернуть' : 'Свернуть'}>
                    <svg viewBox="0 0 20 20"><path fill="currentColor" d="M7 5l6 5-6 5z"/></svg>
                  </div>
                )}
              </div>
              {valuesToShow.map((v,mi)=>(
                <div
                  key={mi}
                  className={
                    "finance-cell " +
                    (isCurrentYear && mi===currentMonth ? "col-current " : "") +
                    (ctxCellHighlight && ctxCellHighlight.type==='income' && ctxCellHighlight.catId===row.id && ctxCellHighlight.month===mi ? "ctx-active" : "")
                  }
                  onContextMenu={(e)=>onCellContext(e, 'income', row.id, mi, v)}
                >
                  <button className="cell-btn" onClick={()=>{ setEditorCat({id: row.id, name: row.name, type: 'income'}); setEditorMonth(mi); setEditorOpen(true) }}>{v}</button>
                </div>
              ))}
            </div>
          )
        })}

        <div className="finance-section">
          <span>Расходы</span>
          <button className="btn btn-outline btn-xs text-gray-900" onClick={()=>{ setNewType('expense'); setNewParent(null); setShowAdd(true) }}>+ Категория</button>
        </div>

        {expenseCategories.map((row)=> {
          const hasChildren = !!aggregatedExpenseByParent[row.id]
          const valuesToShow = hasChildren ? aggregatedExpenseByParent[row.id] : row.values
          return (
            <div className="finance-row contents" key={'e'+row.id}>
              <div
                className={"finance-cell cell-name " + (ctxCatHighlight===row.id ? "ctx-active" : "")}
                onContextMenu={(e)=>onContextCategory(e, { id: row.id, name: row.name, type: 'expense' })}
                style={{ display:'flex', alignItems:'center', gap:8, paddingLeft: row.parent_id ? 24 : 8 }}
              >
                {row.name}<ContextMenuButton onOpen={(e)=>onContextCategory(e, { id: row.id, name: row.name, type: 'expense' })} />
                {!row.parent_id && (childrenMapExpense[row.id] || 0) > 0 && (
                  <div className={"chev " + (!collapsed[row.id] ? "open" : "")} onClick={()=> setCollapsed(p=>({ ...p, [row.id]: !p[row.id] }))} title={collapsed[row.id] ? 'Свернуть' : 'Развернуть'}>
                    <svg viewBox="0 0 20 20"><path fill="currentColor" d="M7 5l6 5-6 5z"/></svg>
                  </div>
                )}
              </div>
              {valuesToShow.map((v,mi)=>(
                <div
                  key={mi}
                  className={
                    "finance-cell " +
                    (isCurrentYear && mi===currentMonth ? "col-current " : "") +
                    (ctxCellHighlight && ctxCellHighlight.type==='expense' && ctxCellHighlight.catId===row.id && ctxCellHighlight.month===mi ? "ctx-active" : "")
                  }
                  onContextMenu={(e)=>onCellContext(e, 'expense', row.id, mi, v)}
                >
                  <button className="cell-btn" onClick={()=>{ setEditorCat({id: row.id, name: row.name, type: 'expense'}); setEditorMonth(mi); setEditorOpen(true) }}>{v}</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">Показатель</div></div>
        {months.map((m,idx) => (
          <div key={m} className={"finance-cell " + (isCurrentYear && idx===currentMonth ? "head-current" : "finance-head")}>
            <div className="cell-head cell-right">{m} {year}</div>
          </div>
        ))}
        <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head" style={{fontWeight:600}}>Доходы</div></div>
          {totalIncomeByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head cell-right">{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
        <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head" style={{fontWeight:600}}>Расходы</div></div>
          {totalExpenseByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head cell-right">{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
        <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head" style={{fontWeight:700}}>Баланс</div></div>
          {balanceByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head cell-right" style={{fontWeight:700}}>{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
      </div>

      {ctxOpen && ctxCat && (
        <>
          <div className="ctx-backdrop" onClick={closeCtx} onContextMenu={(e)=>e.preventDefault()} />
          <div className="ctx-menu" style={{ left: ctxPos.x, top: ctxPos.y }} onContextMenu={(e)=>e.preventDefault()}>
            <div className="ctx-item" onClick={()=>{ setRenameValue(ctxCat.name); setRenameOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}>Переименовать</div>
            <div className="ctx-item" onClick={()=>{ setNewType(ctxCat.type); setNewParent({ id: ctxCat.id, name: ctxCat.name }); setShowAdd(true); setCtxOpen(false); setCtxCatHighlight(null) }}>+ Подкатегория</div>
            <div className="ctx-item" style={{color:'#b91c1c'}} onClick={()=>{ setDeleteOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}>Удалить</div>
          </div>
        </>
      )}

      {cellCtxOpen && cellCtx && (
        <>
          <div className="ctx-backdrop" onClick={()=>{ setCellCtxOpen(false); setCtxCellHighlight(null) }} onContextMenu={(e)=>e.preventDefault()} />
          <div className="ctx-menu" style={{ left: cellCtxPos.x, top: cellCtxPos.y }} onContextMenu={(e)=>e.preventDefault()}>
            {cellCanCopy && <div className="ctx-item" onClick={copyCell}>Копировать записи</div>}
            {cellClipboard && cellClipboard.length > 0 && <div className="ctx-item" onClick={pasteCell}>Вставить записи (заменить)</div>}
          </div>
        </>
      )}

      <Modal
        open={showAdd}
        onClose={()=>{ setShowAdd(false); setNewParent(null) }}
        title={newParent ? 'Новая подкатегория' : 'Новая категория'}
        subTitle={newParent ? `Родитель: ${newParent.name}` : undefined}
        footer={<><button className="btn btn-outline text-gray-900" onClick={()=>{ setShowAdd(false); setNewParent(null) }}>Отмена</button><button className="btn" onClick={addCategory}>{newParent ? 'Добавить подкатегорию' : 'Добавить категорию'}</button></>}
      >
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 w-28">Тип</label>
          <div className="flex-1"><TypeDropdown value={newType} onChange={setNewType} fullWidth /></div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm text-gray-600 w-28">Название</label>
          <input
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            placeholder={newParent ? 'Напр. Коммунальные' : 'Напр. Жильё'}
            className="border rounded-lg px-3 py-2 text-sm flex-1"
          />
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title="Переименовать категорию"
        footer={<><button className="btn btn-outline text-gray-900" onClick={()=>setRenameOpen(false)}>Отмена</button><button className="btn" onClick={submitRename}>Сохранить</button></>}
      >
        <input
          value={renameValue}
          onChange={e=>setRenameValue(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full"
          autoFocus
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={()=>setDeleteOpen(false)}
        title="Удалить категорию?"
        footer={<><button className="btn btn-outline text-gray-900" onClick={()=>setDeleteOpen(false)}>Отмена</button><button className="btn btn-danger" onClick={confirmDelete}>Удалить</button></>}
      >
        <div className="text-sm text-gray-600">Все записи в этой категории будут удалены без возможности восстановления.</div>
      </Modal>

      {editorOpen && editorCat && (
        <CellEditor
          open={editorOpen}
          onClose={()=>setEditorOpen(false)}
          userId={userId!}
          categoryId={editorCat.id}
          categoryName={editorCat.name}
          monthIndex={editorMonth}
          year={year}
          onApply={(sum)=>{
            const updateRaw = (raw: Cat[]) => raw.map(c => c.id === editorCat.id ? { ...c, values: c.values.map((v,i)=> i===editorMonth ? sum : v) } : c)
            if (editorCat.type === 'income') setIncomeRaw(updateRaw(incomeRaw)); else setExpenseRaw(updateRaw(expenseRaw))
          }}
        />
      )}

      <AnnualStatsModal
        open={showStats}
        onClose={()=>setShowStats(false)}
        year={year}
        incomeByMonth={totalIncomeByMonth}
        expenseByMonth={totalExpenseByMonth}
      />
    </div>
  )
}
 