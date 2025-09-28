import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MoreVertical } from "lucide-react";
import { TableSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import '../finance-grid.css'
import CellEditor from '@/components/CellEditor'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import YearDropdown from '@/components/YearDropdown'
import TypeDropdown from '@/components/TypeDropdown'
import AnnualStatsModal from '@/components/AnnualStatsModal'
import YearToolbar from '@/components/finance/YearToolbar'
import SectionHeader from '@/components/finance/SectionHeader'
import CategoryRow from '@/components/finance/CategoryRow'
import SummaryRow from '@/components/finance/SummaryRow'
import CategoryMenu from '@/components/finance/CategoryMenu'
import CellMenu from '@/components/finance/CellMenu'
import type { Cat, CtxCat, CellCtx, EntryLite } from '@/types/shared'
function findCatById(id: string, list: Cat[]): Cat | undefined { return list.find(c => c.id === id) }
import { clampToViewport, computeDescendantSums } from '@/features/finance/utils'
import { months, monthCount, isCurrentYear as isCurrentYearUtil } from '@/features/finance/utils'
import { formatCurrencyEUR } from '@/lib/format'
import { useErrorHandler } from '@/lib/errorHandler'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useFinanceCache } from '@/hooks/useFinanceCache'
import { 
  CACHE_VERSION, 
  MONTHS_IN_YEAR, 
  FINANCE_TYPES, 
  FINANCE_MONTHS,
  CONTEXT_MENU_WIDTH,
  CONTEXT_MENU_HEIGHT_CATEGORY,
  CONTEXT_MENU_HEIGHT_CELL,
  CACHE_KEYS
} from '@/lib/constants'


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

const fmtEUR = (n:number) => formatCurrencyEUR(n, { maximumFractionDigits: 0 })

// Cache functions moved to useFinanceCache hook


export default function Finance(){
  const { handleError, handleSuccess } = useErrorHandler()
  const { userId, loading: authLoading } = useSupabaseAuth()
  const { writeCache, readCache } = useFinanceCache()
  const { createSimpleFooter, createDangerFooter } = useModalActions()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = useState(currentYear)

  const [incomeRaw, setIncomeRaw] = useState<Cat[]>([])
  const [expenseRaw, setExpenseRaw] = useState<Cat[]>([])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const incomeCategories = useMemo(()=>applyCollapse(incomeRaw, collapsed), [incomeRaw, collapsed])
  const expenseCategories = useMemo(()=>applyCollapse(expenseRaw, collapsed), [expenseRaw, collapsed])

  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<'income'|'expense'>(FINANCE_TYPES.INCOME)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState<{id:string,name:string}|null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCat, setEditorCat] = useState<CtxCat|null>(null)
  const [editorMonth, setEditorMonth] = useState<number>(0)

  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState<{x:number,y:number}>({x:0,y:0})
  const [ctxCat, setCtxCat] = useState<CtxCat|null>(null)

  const [cellCtxOpen, setCellCtxOpen] = useState(false)
  const [cellCtxPos, setCellCtxPos] = useState<{x:number,y:number}>({x:0,y:0})
  const [cellCtx, setCellCtx] = useState<CellCtx|null>(null)
  const [cellClipboard, setCellClipboard] = useState<EntryLite[]|null>(null)
  const [cellCanCopy, setCellCanCopy] = useState(false)
  const [cellEntries, setCellEntries] = useState<EntryLite[]|null>(null)

  const [showStats, setShowStats] = useState(false)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [ctxCatHighlight, setCtxCatHighlight] = useState<string|null>(null)
  const [ctxCellHighlight, setCtxCellHighlight] = useState<CellCtx|null>(null)

  // Auth loading handled by useSupabaseAuth hook

  useEffect(() => {
    if (!userId) return
    const cached = readCache(userId, year)
    if (cached) {
      setIncomeRaw(cached.income ?? [])
      setExpenseRaw(cached.expense ?? [])
      setLoading(false)
    } else {
      setLoading(true)
    }
    ;(async () => {
      const [catsRes, entriesRes] = await Promise.all([
        supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at', { ascending: true }),
        supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', year),
      ])
      if (catsRes.error || entriesRes.error) { 
        handleError(catsRes.error || entriesRes.error, 'Загрузка финансовых данных'); 
        setLoading(false); 
        return 
      }
      const cats = catsRes.data || []
      const entries = entriesRes.data || []
      const byId: Record<string, number[]> = {}
      for (const c of cats) byId[c.id] = Array(MONTHS_IN_YEAR).fill(0)
      for (const e of entries) {
        if (!e.included) continue
        const i = Math.min(11, Math.max(0, (e.month as number) - 1))
        const id = e.category_id as string
        if (!byId[id]) byId[id] = Array(MONTHS_IN_YEAR).fill(0)
        byId[id][i] += Number(e.amount) || 0
      }
      const income = cats.filter((c)=>c.type===FINANCE_TYPES.INCOME).map((c)=>({ id:c.id, name:c.name, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) }))
      const expense = cats.filter((c)=>c.type===FINANCE_TYPES.EXPENSE).map((c)=>({ id:c.id, name:c.name, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) }))
      setIncomeRaw(income); setExpenseRaw(expense); setLoading(false)
      writeCache(userId, year, {
        income: income.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
        expense: expense.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
      })
    })()
  }, [userId, year])

  const totalIncomeByMonth = useMemo(() => months.map((_, i) => incomeRaw.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)), [incomeRaw])
  const totalExpenseByMonth = useMemo(() => months.map((_, i) => expenseRaw.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)), [expenseRaw])
  const balanceByMonth = useMemo(() => totalIncomeByMonth.map((v, i) => v - totalExpenseByMonth[i]), [totalIncomeByMonth, totalExpenseByMonth])

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
    const payload: { user_id: string; type: 'income' | 'expense'; name: string; parent_id?: string } = { user_id: userId, type, name }
    if (newParent) payload.parent_id = newParent.id
    const { data, error } = await supabase.from('finance_categories').insert(payload).select('id,name,type,parent_id').single()
    if (error) { handleError(error, 'Создание категории'); return }
    const cat: Cat = { id: data.id, name: data.name, type: data.type, parent_id: data.parent_id, values: Array(MONTHS_IN_YEAR).fill(0) }
    if (type === FINANCE_TYPES.INCOME) {
      const raw = [incomeRaw, cat]; setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    } else {
      const raw = [expenseRaw, cat]; setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    }
    handleSuccess(`Категория "${name}" создана`)
    setShowAdd(false); setNewName(''); setNewType(FINANCE_TYPES.INCOME); setNewParent(null)
  }

  function onContextCategory(e: React.MouseEvent, cat: {id:string,name:string,type:'income'|'expense'}) {
    e.preventDefault(); e.stopPropagation()
    if (cellCtxOpen) setCellCtxOpen(false)
    setCtxCellHighlight(null)
    setCtxCatHighlight(cat.id)
    
    const menuWidth = 200;
    const menuHeight = 120;
    const offset = 8; // Отступ от курсора
    const pad = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Позиция меню - немного правее и ниже курсора
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    
    // Проверяем, не выходит ли меню за правый край
    if (x + menuWidth > vw - pad) {
      x = e.clientX - menuWidth - offset; // Показываем слева от курсора
    }
    
    // Проверяем, не выходит ли меню за нижний край
    if (y + menuHeight > vh - pad) {
      y = e.clientY - menuHeight - offset; // Показываем выше курсора
    }
    
    // Проверяем, не выходит ли меню за левый край
    if (x < pad) {
      x = pad;
    }
    
    // Проверяем, не выходит ли меню за верхний край
    if (y < pad) {
      y = pad;
    }
    
    setCtxPos({ x, y })
    setCtxCat(cat)
    setCtxOpen(true)
  }
  function closeCtx(){ setCtxOpen(false); setCtxCat(null); setCtxCatHighlight(null) }

  async function submitRename(){
    const name = renameValue.trim()
    if (!name || !ctxCat) { setRenameOpen(false); return }
    const { error } = await supabase.from('finance_categories').update({ name }).eq('id', ctxCat.id)
    if (error) { handleError(error, 'Создание категории'); return }
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
    if (error) { handleError(error, 'Создание категории'); return }
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
    const menuWidth = 200;
    const menuHeight = 100;
    const offset = 8; // Отступ от курсора
    const pad = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Позиция меню - немного правее и ниже курсора
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    
    // Проверяем, не выходит ли меню за правый край
    if (x + menuWidth > vw - pad) {
      x = e.clientX - menuWidth - offset; // Показываем слева от курсора
    }
    
    // Проверяем, не выходит ли меню за нижний край
    if (y + menuHeight > vh - pad) {
      y = e.clientY - menuHeight - offset; // Показываем выше курсора
    }
    
    // Проверяем, не выходит ли меню за левый край
    if (x < pad) {
      x = pad;
    }
    
    // Проверяем, не выходит ли меню за верхний край
    if (y < pad) {
      y = pad;
    }
    
    setCellCtx({catId, type, month})
    setCellCtxPos({ x, y })
    setCellCanCopy(false)
    setCellCtxOpen(true)

    // Fetch entries async; if none and cannot paste -> close menu quickly
    const { data } = await supabase.from('finance_entries')
      .select('amount, note, included, position')
      .match(where)
      .order('position', { ascending: true }).order('created_at', { ascending: true })
    const entries: EntryLite[] = (data || []).map((d: { amount: number; note: string | null; included: boolean; position: number | null })=>({ 
      amount: Number(d.amount) || 0, 
      note: d.note, 
      included: !!d.included, 
      position: d.position ?? 0 
    }))
    setCellEntries(entries)
    if (!entries.length && !canPaste) {
      setCellCtxOpen(false); setCtxCellHighlight(null)
      return
    }
    setCellCanCopy(entries.length > 0)
  
  }

  async function copyCell(){
    const entries: EntryLite[] = cellEntries || []
    if (!entries.length) { setCellCtxOpen(false); setCtxCellHighlight(null); return }
    setCellClipboard(entries.slice())
    try { await navigator.clipboard.writeText(JSON.stringify(entries)) } catch {}
    setCellCtxOpen(false); setCtxCellHighlight(null)
  }

  async function pasteCell(){
    if (!cellCtx || !cellClipboard || !cellClipboard.length || !userId) return
    const { catId, type, month } = cellCtx
    const where = { category_id: catId, year, month: month+1 }
    await supabase.from('finance_entries').delete().match(where)
    const rows = cellClipboard.map((e, idx) => ({ where, user_id: userId, amount: e.amount, note: e.note, included: e.included, position: idx }))
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
    <React.Fragment>
      <div className="space-y-6 finance-page" onContextMenu={(e)=>{ e.preventDefault() }}>
        <YearToolbar year={year} years={yearOptions} onYearChange={setYear} onAddCategory={()=>{ setNewType(FINANCE_TYPES.INCOME); setNewParent(null); setShowAdd(true) }} onShowStats={()=>setShowStats(true)} />

      <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">Категория</div></div>
        {FINANCE_MONTHS.map((m,idx) => (
          <div key={m} className={"finance-cell " + (isCurrentYear && idx===currentMonth ? "head-current" : "finance-head")}>
            <div className="cell-head cell-right">{m} {year}</div>
          </div>
        ))}

        <SectionHeader title="Доходы" onAdd={()=>{ setNewType(FINANCE_TYPES.INCOME); setNewParent(null); setShowAdd(true) }} />

        {incomeCategories.map((row)=> {
          const hasChildren = !!aggregatedIncomeByParent[row.id]
          const valuesToShow = hasChildren ? aggregatedIncomeByParent[row.id] : row.values
          return (
            <CategoryRow
              type="income"
              row={row}
              values={valuesToShow}
              isCurrentYear={isCurrentYear}
              currentMonth={currentMonth}
              hasChildren={hasChildren}
              collapsed={!!collapsed[row.id]}
              onToggleCollapse={(id)=> setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))}
              onNameContext={(e, info)=> onContextCategory(e, info)}
              onCellContext={onCellContext}
              onCellEdit={(t,id,mi)=>{ setEditorCat({ id, name: row.name, type: t } as CtxCat); setEditorMonth(mi); setEditorOpen(true) }}
              fmt={fmtEUR}
              ctxCatHighlight={ctxCatHighlight}
              ctxCellHighlight={ctxCellHighlight}
            />
          )
        })}

        <SectionHeader title="Расходы" onAdd={()=>{ setNewType(FINANCE_TYPES.EXPENSE); setNewParent(null); setShowAdd(true) }} />

        {expenseCategories.map((row)=> {
          const hasChildren = !!aggregatedExpenseByParent[row.id]
          const valuesToShow = hasChildren ? aggregatedExpenseByParent[row.id] : row.values
          return (
            <CategoryRow
              type="expense"
              row={row}
              values={valuesToShow}
              isCurrentYear={isCurrentYear}
              currentMonth={currentMonth}
              hasChildren={hasChildren}
              collapsed={!!collapsed[row.id]}
              onToggleCollapse={(id)=> setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))}
              onNameContext={(e, info)=> onContextCategory(e, info)}
              onCellContext={onCellContext}
              onCellEdit={(t,id,mi)=>{ setEditorCat({ id, name: row.name, type: t } as CtxCat); setEditorMonth(mi); setEditorOpen(true) }}
              fmt={fmtEUR}
              ctxCatHighlight={ctxCatHighlight}
              ctxCellHighlight={ctxCellHighlight}
            />
          )
        })}
      </div>

      <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">Показатель</div></div>
        {FINANCE_MONTHS.map((m,idx) => (
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
      </div>

      {ctxOpen && ctxCat && (
        <CategoryMenu
          pos={ctxPos}
          canAddSub={!Boolean((findCatById(ctxCat.id, incomeRaw) || findCatById(ctxCat.id, expenseRaw))?.parent_id)}
          onClose={closeCtx}
          onRename={()=>{ setRenameValue(ctxCat.name); setRenameOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onAddSub={()=>{ setNewType(ctxCat.type as 'income' | 'expense'); setNewParent({ id: ctxCat.id, name: ctxCat.name }); setShowAdd(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onDelete={()=>{ setDeleteOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
        />
      )}{cellCtxOpen && cellCtx && (
        <CellMenu
          pos={cellCtxPos}
          onClose={()=>{ setCellCtxOpen(false); setCtxCellHighlight(null) }}
          canCopy={cellCanCopy}
          hasClipboard={!!(cellClipboard && cellClipboard.length > 0)}
          onCopy={copyCell}
          onPaste={pasteCell}
        />
      )}<UnifiedModal
        open={showAdd}
        onClose={()=>{ setShowAdd(false); setNewParent(null) }}
        title={newParent ? 'Новая подкатегория' : 'Новая категория'}
        subtitle={newParent ? `Родитель: ${newParent.name}` : undefined}
        footer={createSimpleFooter(
          { 
            label: newParent ? 'Добавить подкатегорию' : 'Добавить категорию', 
            onClick: addCategory,
            disabled: !newName.trim()
          },
          { 
            label: 'Отмена', 
            onClick: () => { setShowAdd(false); setNewParent(null) }
          }
        )}
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
      </UnifiedModal>

      <UnifiedModal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title="Переименовать категорию"
        footer={createSimpleFooter(
          { 
            label: 'Сохранить', 
            onClick: submitRename,
            disabled: !renameValue.trim()
          },
          { 
            label: 'Отмена', 
            onClick: () => setRenameOpen(false)
          }
        )}
      >
        <input
          value={renameValue}
          onChange={e=>setRenameValue(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full"
          autoFocus
        />
      </UnifiedModal>

      <UnifiedModal
        open={deleteOpen}
        onClose={()=>setDeleteOpen(false)}
        title="Удалить категорию?"
        footer={createDangerFooter(
          { 
            label: 'Удалить', 
            onClick: confirmDelete
          },
          { 
            label: 'Отмена', 
            onClick: () => setDeleteOpen(false)
          }
        )}
      >
        <div className="text-sm text-gray-600">Все записи в этой категории будут удалены без возможности восстановления.</div>
      </UnifiedModal>

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
    </React.Fragment>
  )
}