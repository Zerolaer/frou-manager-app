import React, { useEffect, useMemo, useRef, useState, Suspense, Fragment } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { MoreVertical } from "lucide-react";
import { supabase } from '@/lib/supabaseClient'
import '../finance-grid.css'
import { LazyFeatures, LazyFinance, LazyComponents } from '@/utils/codeSplitting'
import SectionHeader from '@/components/finance/SectionHeader'
import FinanceMobile from './mobile/FinanceMobile'
import CategoryRow from '@/components/finance/CategoryRow'
import NewCategoryMenu from '@/components/finance/NewCategoryMenu'
import NewCellMenu from '@/components/finance/NewCellMenu'
import AnnualStatsModal from '@/components/AnnualStatsModal'
import FinanceChatPanel from '@/components/finance/FinanceChatPanel'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput } from '@/components/ui/CoreInput'
import { YearDropdown } from '@/components/ui/UnifiedDropdown'
import TypeDropdown from '@/components/TypeDropdown'
import { LazyComponent, LazyFinanceRow } from '@/components/ui/LazyComponent'
import { FinanceRowSkeleton } from '@/components/ui/LoadingStates'
import CellEditor from '@/components/CellEditor'
import type { Cat, CtxCat, CellCtx, EntryLite, FinanceCellCtx } from '@/types/shared'
import { clampToViewport, computeDescendantSums, canAddSubcategory, buildCategoryHasDirectEntries, toFinanceCacheCat, buildChildrenMap, applyCollapse } from '@/features/finance/utils'
import { months, monthCount, isCurrentYear as isCurrentYearUtil } from '@/features/finance/utils'
import { formatCurrencyEUR } from '@/lib/format'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { exportToJSON, exportToCSV, downloadFile, parseJSONImport } from '@/lib/financeExport'
import { useFinanceCache } from '@/hooks/useFinanceCache'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { logger } from '@/lib/monitoring'
import { convertToEUR, initializeExchangeRates } from '@/utils/currency'
import { useModalConfirm } from '@/utils/modalConfirm'
import { registerFinanceSubheaderHandler } from '@/lib/financeSubheaderBridge'
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

function findCatById(id: string, list: Cat[]): Cat | undefined {
  return list.find((c) => c.id === id)
}

async function resolveCategoryHasDirectEntries(
  categoryId: string,
  year: number,
  hasEntriesInCell: boolean
): Promise<boolean> {
  if (hasEntriesInCell) return true
  const { count, error } = await supabase
    .from('finance_entries')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('year', year)
  if (error) {
    logger.error('Error checking category entries:', error)
    return true
  }
  return (count ?? 0) > 0
}

// Added: accessible trigger for context menu
function ContextMenuButton({ onOpen }: { onOpen: (e: React.MouseEvent | React.KeyboardEvent) => void }) {
  const { t } = useSafeTranslation()
  return (
    <button
      type="button"
      aria-label={t('aria.openMenu')}
      aria-haspopup="menu"
      onClick={(e) => onOpen(e)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e); } }}
      className="menu-btn ml-1 rounded p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <MoreVertical className="size-4" />
    </button>
  );
}

const EURNoDecimals = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtEUR = (n:number) => EURNoDecimals.format(n)

// Cache functions moved to useFinanceCache hook


export default function Finance(){
  const { t } = useSafeTranslation()
  const { userId, loading: authLoading } = useSupabaseAuth()
  const { writeCache, readCache } = useFinanceCache()
  const { createSimpleFooter, createDeleteFooter } = useModalActions()
  const { isMobile } = useMobileDetection()
  const { confirm } = useModalConfirm()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Translated months array
  const translatedMonths = useMemo(() => [
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

  const [year, setYear] = useState(currentYear)
  const [mobileDate, setMobileDate] = useState(new Date())

  const [incomeRaw, setIncomeRaw] = useState<Cat[]>([])
  const [expenseRaw, setExpenseRaw] = useState<Cat[]>([])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const incomeCategories = useMemo(()=>applyCollapse(incomeRaw, collapsed), [incomeRaw, collapsed])
  const expenseCategories = useMemo(()=>applyCollapse(expenseRaw, collapsed), [expenseRaw, collapsed])

  const [loading, setLoading] = useState(true)
  const dataReadyRef = useRef(false)

  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<'income'|'expense'>(FINANCE_TYPES.INCOME)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState<{id:string,name:string}|null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCat, setEditorCat] = useState<CtxCat|null>(null)

  const [editorMonth, setEditorMonth] = useState<number>(0)

  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxMouseX, setCtxMouseX] = useState(0)
  const [ctxMouseY, setCtxMouseY] = useState(0)
  const [ctxCat, setCtxCat] = useState<CtxCat|null>(null)

  const [cellCtxOpen, setCellCtxOpen] = useState(false)
  const [cellCtxMouseX, setCellCtxMouseX] = useState(0)
  const [cellCtxMouseY, setCellCtxMouseY] = useState(0)
  const [cellCtx, setCellCtx] = useState<FinanceCellCtx|null>(null)
  const [cellClipboard, setCellClipboard] = useState<EntryLite[]|null>(null)
  const [cellCanCopy, setCellCanCopy] = useState(false)
  const [cellEntries, setCellEntries] = useState<EntryLite[]|null>(null)

  const [showStats, setShowStats] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [ctxCatHighlight, setCtxCatHighlight] = useState<string|null>(null)
  const [ctxCellHighlight, setCtxCellHighlight] = useState<FinanceCellCtx|null>(null)

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-category':
        setNewType(FINANCE_TYPES.INCOME)
        setNewParent(null)
        setShowAdd(true)
        break
      case 'annual-stats':
        setShowStats(true)
        break
      case 'ai-assistant':
        setShowAIChat(true)
        break
      case 'export':
        handleExport()
        break
      case 'import':
        handleImport()
        break
      default:
        // Unknown action
    }
  }

  // Auth loading handled by useSupabaseAuth hook

  // Single subheader handler slot (see financeSubheaderBridge) — avoids duplicate window listeners / stacked modals
  const handleSubHeaderActionRef = useRef(handleSubHeaderAction)
  handleSubHeaderActionRef.current = handleSubHeaderAction
  useEffect(() => {
    const bridge = (action: string) => handleSubHeaderActionRef.current(action)
    registerFinanceSubheaderHandler(bridge)
    return () => registerFinanceSubheaderHandler(null)
  }, [])

  // Notify App.tsx about current year
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('finance-year-changed', { detail: year }))
  }, [year])

  // Function to load financial data
  const reloadFinanceData = async (signal?: AbortSignal) => {
    if (!userId) return

    if (!dataReadyRef.current) {
      setLoading(true)
    }
    
    try {
      // Initialize exchange rates before loading data
      await initializeExchangeRates()
      
      const [catsRes, entriesRes] = await Promise.all([
        supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at', { ascending: true }),
        supabase.from('finance_entries').select('category_id,month,amount,currency,included').eq('year', year),
      ])
      
      if (signal?.aborted) return
      
      if (catsRes.error || entriesRes.error) { 
        logger.error('Error loading financial data:', catsRes.error || entriesRes.error); 
        setLoading(false); 
        return 
      }
      
      const cats = catsRes.data || []
      const entries = entriesRes.data || []
      const byId: Record<string, number[]> = {}
      const entryFlags = buildCategoryHasDirectEntries(entries)
      
      for (const c of cats) byId[c.id] = Array(MONTHS_IN_YEAR).fill(0)
      for (const e of entries) {
        if (!e.included) continue
        const i = Math.min(11, Math.max(0, (e.month as number) - 1))
        const id = e.category_id as string
        if (!byId[id]) byId[id] = Array(MONTHS_IN_YEAR).fill(0)
        // Convert to EUR before adding
        const currency = (e.currency || 'EUR') as 'EUR' | 'USD' | 'GEL'
        const amountInEUR = convertToEUR(Number(e.amount) || 0, currency)
        byId[id][i] += amountInEUR
      }
      
      const income = cats.filter((c)=>c.type===FINANCE_TYPES.INCOME).map((c)=>({ id:c.id, name:c.name, type: 'income' as const, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0), hasDirectEntries: !!entryFlags[c.id] }))
      const expense = cats.filter((c)=>c.type===FINANCE_TYPES.EXPENSE).map((c)=>({ id:c.id, name:c.name, type: 'expense' as const, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0), hasDirectEntries: !!entryFlags[c.id] }))
      
      if (!signal?.aborted) {
        setIncomeRaw(income)
        setExpenseRaw(expense)
        dataReadyRef.current = true
        setLoading(false)
        
        // Update cache
        writeCache(userId, year, {
          income: income.map(toFinanceCacheCat),
          expense: expense.map(toFinanceCacheCat),
        })
      }
    } catch (error) {
      if (!signal?.aborted) {
        logger.error('Error loading financial data:', error)
        setLoading(false)
      }
    }
  }

  const userIdRef = useRef(userId)
  userIdRef.current = userId
  const reloadFinanceDataRef = useRef(reloadFinanceData)
  reloadFinanceDataRef.current = reloadFinanceData

  useEffect(() => {
    const handleYearChangeEvent = (event: CustomEvent) => {
      setYear(event.detail)
    }
    const handleFinanceDataUpdated = () => {
      if (userIdRef.current) {
        reloadFinanceDataRef.current()
      }
    }
    window.addEventListener('subheader-year-change', handleYearChangeEvent as EventListener)
    window.addEventListener('finance-data-updated', handleFinanceDataUpdated as EventListener)
    return () => {
      window.removeEventListener('subheader-year-change', handleYearChangeEvent as EventListener)
      window.removeEventListener('finance-data-updated', handleFinanceDataUpdated as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    const cached = readCache(userId, year)
    if (cached) {
      setIncomeRaw((cached.income ?? []).map(c => ({ ...c, type: 'income' as const, hasDirectEntries: c.hasDirectEntries ?? false })))
      setExpenseRaw((cached.expense ?? []).map(c => ({ ...c, type: 'expense' as const, hasDirectEntries: c.hasDirectEntries ?? false })))
      setLoading(false)
      dataReadyRef.current = true
    } else {
      dataReadyRef.current = false
    }
    
    const ctl = new AbortController()
    reloadFinanceData(ctl.signal)
    return () => ctl.abort()
  }, [userId, year])

  const totalIncomeByMonth = useMemo(() => months.map((_, i) => incomeRaw.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)), [incomeRaw])
  const totalExpenseByMonth = useMemo(() => months.map((_, i) => expenseRaw.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)), [expenseRaw])
  const balanceByMonth = useMemo(() => totalIncomeByMonth.map((v, i) => v - totalExpenseByMonth[i]), [totalIncomeByMonth, totalExpenseByMonth])

  const childrenMapIncome = useMemo(() => buildChildrenMap(incomeRaw), [incomeRaw])
  const childrenMapExpense = useMemo(() => buildChildrenMap(expenseRaw), [expenseRaw])

  const aggregatedIncomeByParent = useMemo(() => computeDescendantSums(incomeRaw), [incomeRaw])
  const aggregatedExpenseByParent = useMemo(() => computeDescendantSums(expenseRaw), [expenseRaw])

  async function addCategory(){
    const name = newName.trim()
    if (!name || !userId) return
    const type = newType
    if (newParent) {
      const parent = (type === FINANCE_TYPES.INCOME ? incomeRaw : expenseRaw).find((c) => c.id === newParent.id)
      if (!parent || !canAddSubcategory(parent)) return
    }
    const payload: { user_id: string; type: 'income' | 'expense'; name: string; parent_id?: string } = { user_id: userId, type, name }
    if (newParent) payload.parent_id = newParent.id
    const { data, error } = await supabase.from('finance_categories').insert(payload).select('id,name,type,parent_id').single()
    if (error) { logger.error('Error creating category:', error); return }
    const cat: Cat = { id: data.id, name: data.name, type: data.type, parent_id: data.parent_id, values: Array(MONTHS_IN_YEAR).fill(0) }
    if (type === FINANCE_TYPES.INCOME) {
      const raw = [...incomeRaw, cat]; setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(toFinanceCacheCat), expense: expenseRaw.map(toFinanceCacheCat) })
    } else {
      const raw = [...expenseRaw, cat]; setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(toFinanceCacheCat), expense: raw.map(toFinanceCacheCat) })
    }
    setShowAdd(false); setNewName(''); setNewType(FINANCE_TYPES.INCOME); setNewParent(null)
  }

  function onContextCategory(e: React.MouseEvent, cat: {id:string,name:string,type:'income'|'expense'}) {
    try {
      e.preventDefault(); 
      e.stopPropagation()
      if (cellCtxOpen) setCellCtxOpen(false)
      setCtxCellHighlight(null)
      setCtxCatHighlight(cat.id)
      
      // COMPLETE SCROLL INDEPENDENCE - only mouse coordinates
      const x = e.clientX ?? 0
      const y = e.clientY ?? 0
      setCtxMouseX(x + 10) // Right of cursor
      setCtxMouseY(y - 10) // Above cursor
      setCtxCat(cat)
      setCtxOpen(true)
    } catch (error) {
      logger.error('Error opening category context menu:', error)
    }
  }
  function closeCtx(){ setCtxOpen(false); setCtxCat(null); setCtxCatHighlight(null) }

  async function submitRename(){
    const name = renameValue.trim()
    if (!name || !ctxCat) { setRenameOpen(false); return }
    const { error } = await supabase.from('finance_categories').update({ name }).eq('id', ctxCat.id)
    if (error) { logger.error('Error updating category:', error); return }
    if (ctxCat.type === 'income') {
      const raw = incomeRaw.map(c => c.id === ctxCat.id ? { ...c, name } : c); setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(toFinanceCacheCat), expense: expenseRaw.map(toFinanceCacheCat) })
    } else {
      const raw = expenseRaw.map(c => c.id === ctxCat.id ? { ...c, name } : c); setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(toFinanceCacheCat), expense: raw.map(toFinanceCacheCat) })
    }
    setRenameOpen(false)
  }

  async function confirmDelete(){
    if (!ctxCat) return
    const { error } = await supabase.from('finance_categories').delete().eq('id', ctxCat.id)
    if (error) { logger.error('Error deleting category:', error); return }
    if (ctxCat.type === 'income') {
      const raw = incomeRaw.filter(c => c.id !== ctxCat.id); setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(toFinanceCacheCat), expense: expenseRaw.map(toFinanceCacheCat) })
    } else {
      const raw = expenseRaw.filter(c => c.id !== ctxCat.id); setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(toFinanceCacheCat), expense: raw.map(toFinanceCacheCat) })
    }
    setDeleteOpen(false)
  }

  async function onCellContext(e: React.MouseEvent, type:'income'|'expense', catId:string, month:number, displayed:number){
    e.preventDefault(); 
    e.stopPropagation()
    
    // Close any other menu instantly
    if (ctxOpen) setCtxOpen(false)
    if (cellCtxOpen) setCellCtxOpen(false)
    setCtxCatHighlight(null)
    setCtxCellHighlight({ type, catId, month })

    const canPaste = !!cellClipboard && cellClipboard.length > 0
    const hasValue = !!(displayed && displayed !== 0)

    // Load entries for this cell if it has value
    if (hasValue && userId) {
      try {
        const { data } = await supabase
          .from('finance_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('category_id', catId)
          .eq('year', year)
          .eq('month', month + 1)
          .order('position')
        
        if (data) {
          setCellEntries(data.map(e => ({
            id: e.id,
            amount: e.amount,
            month: e.month,
            category_id: e.category_id,
            note: e.note,
            included: e.included,
            currency: (e.currency || 'EUR') as 'EUR' | 'USD' | 'GEL',
          })))
        }
      } catch (error) {
        logger.error('Error loading cell entries:', error)
      }
    }

    // Show menu if there's something to copy OR something to paste
    if (!hasValue && !canPaste) { 
      setCtxCellHighlight(null); 
      return 
    }

    // COMPLETE SCROLL INDEPENDENCE - only mouse coordinates
    setCellCtxMouseX(e.clientX - 90) // Center menu (menu width ~180px)
    setCellCtxMouseY(e.clientY + 10) // Below cursor
    setCellCtx({catId, type, month})
    setCellCtxOpen(true)
    
    // Set canCopy based on whether cell has value
    setCellCanCopy(hasValue)
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
    
    try {
      // Delete existing entries
      await supabase.from('finance_entries').delete().match(where)
      
      // Insert new entries
      const rows = cellClipboard.map((e, idx) => ({ 
        category_id: catId, 
        year, 
        month: month+1, 
        user_id: userId, 
        amount: e.amount, 
        currency: e.currency || 'EUR',
        note: e.note, 
        included: e.included, 
        position: idx 
      }))
      
      const { error } = await supabase.from('finance_entries').insert(rows)
      if (error) throw error
      
      // Update local state (displayed totals are EUR-converted)
      const sum = rows.filter(r => r.included).reduce((s, r) => {
        const cur = (r.currency || 'EUR') as 'EUR' | 'USD' | 'GEL'
        return s + convertToEUR(Number(r.amount) || 0, cur)
      }, 0)
      const updateRaw = (raw: Cat[]) => raw.map(c => c.id === catId ? { ...c, values: c.values.map((v,i)=> i===month ? sum : v), hasDirectEntries: rows.length > 0 ? true : c.hasDirectEntries } : c)
      
      if (type === 'income') {
        setIncomeRaw(updateRaw(incomeRaw))
        writeCache(userId, year, { 
          income: updateRaw(incomeRaw).map(toFinanceCacheCat), 
          expense: expenseRaw.map(toFinanceCacheCat) 
        })
      } else {
        setExpenseRaw(updateRaw(expenseRaw))
        writeCache(userId, year, { 
          income: incomeRaw.map(toFinanceCacheCat), 
          expense: updateRaw(expenseRaw).map(toFinanceCacheCat) 
        })
      }
      
      logger.debug('Data pasted successfully')
    } catch (error) {
      logger.error('Error pasting data:', error)
    }
    
    setCellCtxOpen(false); setCtxCellHighlight(null)
  }

  // Export functionality
  async function handleExport() {
    const timestamp = new Date().toISOString().slice(0, 10)
    
    // Show export options
    const exportFormat = await confirm(
      t('finance.exportFormat'), t('finance.exportData')
    )
    
    if (exportFormat) {
      // Export as JSON
      const jsonData = exportToJSON(incomeRaw, expenseRaw, year)
      downloadFile(jsonData, `finance-${year}-${timestamp}.json`, 'application/json')
      console.log('Exported to JSON')
    } else {
      // Export as CSV
      const csvData = exportToCSV(incomeRaw, expenseRaw, year)
      downloadFile(csvData, `finance-${year}-${timestamp}.csv`, 'text/csv')
      console.log('Exported to CSV')
    }
  }

  // Import functionality
  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = parseJSONImport(text)
        
        if (!data) {
          console.error('Invalid import file format')
          return
        }
        
        // Confirm import
        const importConfirm = await confirm(
          t('finance.confirmImport', { year: data.year }),
          t('finance.importData')
        )
        
        if (!importConfirm) return
        
        // Apply imported data
        setIncomeRaw(data.income)
        setExpenseRaw(data.expense)
        setYear(data.year)
        
        // Save to cache
        if (userId) {
          writeCache(userId, data.year, {
            income: data.income.map(toFinanceCacheCat),
            expense: data.expense.map(toFinanceCacheCat)
          })
        }
        
        console.log('Data imported successfully')
      } catch (error) {
        console.error('Import failed:', error)
      }
    }
    
    input.click()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCtxOpen(false); setCellCtxOpen(false); setCtxCatHighlight(null); setCtxCellHighlight(null) } }
    const onWheel = () => { setCtxOpen(false); setCellCtxOpen(false); setCtxCatHighlight(null); setCtxCellHighlight(null) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel) }
  }, [])

  const isCurrentYear = year === currentYear

  // Mobile view
  if (isMobile) {
    return <FinanceMobile />
  }

  // Desktop view — modals stay mounted during loading to avoid orphaned overlay portals
  return (
    <Fragment>
      {!loading && (
      <div className="finance-page" onContextMenu={(e)=>{ e.preventDefault() }}>
      <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">{t('finance.category')}</div></div>
        {translatedMonths.map((m,idx) => (
          <div key={idx} className={"finance-cell " + (isCurrentYear && idx===currentMonth ? "head-current" : "finance-head")}>
            <div className="cell-head text-left" style={{color: '#64748b'}}>{m} {year}</div>
          </div>
        ))}

        <SectionHeader title={t('finance.income')} onAdd={()=>{ setNewType(FINANCE_TYPES.INCOME); setNewParent(null); setShowAdd(true) }} />

        {incomeCategories.map((row, idx, arr)=> {
          const hasChildren = (childrenMapIncome[row.id] || 0) > 0
          const valuesToShow = hasChildren ? aggregatedIncomeByParent[row.id] : row.values
          
          // Calculate child index for staggered animation
          let childIndex = 0
          if (row.parent_id) {
            for (let i = 0; i < idx; i++) {
              if (arr[i].parent_id === row.parent_id) {
                childIndex++
              }
            }
          }
          
          return (
            <CategoryRow
              key={row.id}
              type="income"
              row={row}
              values={valuesToShow}
              isCurrentYear={isCurrentYear}
              currentMonth={currentMonth}
              hasChildren={hasChildren}
              collapsed={!!collapsed[row.id]}
              childIndex={childIndex}
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

        <SectionHeader title={t('finance.expense')} onAdd={()=>{ setNewType(FINANCE_TYPES.EXPENSE); setNewParent(null); setShowAdd(true) }} />

        {expenseCategories.map((row, idx, arr)=> {
          const hasChildren = (childrenMapExpense[row.id] || 0) > 0
          const valuesToShow = hasChildren ? aggregatedExpenseByParent[row.id] : row.values
          
          // Calculate child index for staggered animation
          let childIndex = 0
          if (row.parent_id) {
            for (let i = 0; i < idx; i++) {
              if (arr[i].parent_id === row.parent_id) {
                childIndex++
              }
            }
          }
          
          return (
            <CategoryRow
              key={row.id}
              type="expense"
              row={row}
              values={valuesToShow}
              isCurrentYear={isCurrentYear}
              currentMonth={currentMonth}
              hasChildren={hasChildren}
              collapsed={!!collapsed[row.id]}
              childIndex={childIndex}
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

      <div className="mt-4">
        <div className="finance-grid">
        <div className="finance-cell"><div className="cell-head">{t('finance.indicator')}</div></div>
        {translatedMonths.map((m,idx) => (
          <div key={idx} className={"finance-cell " + (isCurrentYear && idx===currentMonth ? "head-current" : "finance-head")}>
            <div className="cell-head text-left" style={{color: '#64748b'}}>{m} {year}</div>
          </div>
        ))}
        <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head">{t('finance.income')}</div></div>
          {totalIncomeByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head">{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
        <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head">{t('finance.expense')}</div></div>
          {totalExpenseByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head">{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
                <div className="finance-row contents">
          <div className="finance-cell"><div className="cell-head summary-title balance-title">{t('finance.balance')}</div></div>
          {balanceByMonth.map((v,i)=>(
            <div className={"finance-cell " + (isCurrentYear && i===currentMonth ? "col-current" : "")} key={i}>
              <div className="cell-head summary-value balance-value">{fmtEUR(v)}</div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {ctxOpen && ctxCat && (() => {
        const ctxCatFull = ctxCat.type === 'income' ? findCatById(ctxCat.id, incomeRaw) : findCatById(ctxCat.id, expenseRaw)
        const canAdd = ctxCatFull ? canAddSubcategory(ctxCatFull) : false
        const addBlocked = ctxCatFull ? !ctxCatFull.parent_id && !canAdd : false
        return (
        <NewCategoryMenu
          x={ctxMouseX}
          y={ctxMouseY}
          canAddSub={canAdd}
          addSubBlocked={addBlocked}
          onClose={closeCtx}
          onRename={()=>{ setRenameValue(ctxCat.name); setRenameOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onAddSub={()=>{ setNewType(ctxCat.type as 'income' | 'expense'); setNewParent({ id: ctxCat.id, name: ctxCat.name }); setShowAdd(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onDelete={()=>{ setDeleteOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
        />
        )
      })()}{cellCtxOpen && cellCtx && (
        <NewCellMenu
          x={cellCtxMouseX}
          y={cellCtxMouseY}
          onClose={()=>{ setCellCtxOpen(false); setCtxCellHighlight(null) }}
          canCopy={cellCanCopy}
          hasClipboard={!!(cellClipboard && cellClipboard.length > 0)}
          onCopy={copyCell}
          onPaste={pasteCell}
        />
      )}
      </div>
      )}

      <UnifiedModal
        open={showAdd}
        onClose={()=>{ setShowAdd(false); setNewParent(null) }}
        title={newParent ? t('finance.newSubcategory') : t('finance.newCategory')}
        subtitle={newParent ? `${t('finance.parent')}: ${newParent.name}` : undefined}
        footer={createSimpleFooter(
          { 
            label: newParent ? t('finance.addSubcategory') : t('finance.addCategory'), 
            onClick: addCategory,
            disabled: !newName.trim()
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => { setShowAdd(false); setNewParent(null) }
          }
        )}
      >
        <div className="flex items-center gap-3">
          <label className="text-label text-gray-600 w-28">{t('finance.type')}</label>
          <div className="flex-1"><TypeDropdown value={newType} onChange={setNewType} fullWidth /></div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <label className="text-label text-gray-600 w-28">{t('finance.name')}</label>
          <CoreInput
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            placeholder={newParent ? t('finance.placeholderUtilities') : t('finance.placeholderHousing')}
            className="flex-1"
          />
        </div>
      </UnifiedModal>

      <UnifiedModal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title={t('finance.renameCategory')}
        footer={createSimpleFooter(
          { 
            label: t('actions.save'), 
            onClick: submitRename,
            disabled: !renameValue.trim()
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => setRenameOpen(false)
          }
        )}
      >
        <CoreInput
          value={renameValue}
          onChange={e=>setRenameValue(e.target.value)}
          autoFocus
        />
      </UnifiedModal>

      <UnifiedModal
        open={deleteOpen}
        onClose={()=>setDeleteOpen(false)}
        title={t('finance.deleteCategory')}
        footer={createDeleteFooter(
          {
            label: t('actions.delete'),
            onClick: confirmDelete,
          },
          {
            label: t('actions.cancel'),
            onClick: () => setDeleteOpen(false),
          }
        )}
      >
        <div className="text-sm text-gray-600">{t('finance.allRecordsWillBeDeleted')}</div>
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
          onApply={async (sum, hasEntriesInCell) => {
            const hasDirectEntries = await resolveCategoryHasDirectEntries(editorCat.id, year, hasEntriesInCell)
            const updateRaw = (raw: Cat[]) => raw.map(c => c.id === editorCat.id ? { ...c, values: c.values.map((v,i)=> i===editorMonth ? sum : v), hasDirectEntries } : c)
            if (editorCat.type === 'income') {
              const next = updateRaw(incomeRaw)
              setIncomeRaw(next)
              if (userId) writeCache(userId, year, { income: next.map(toFinanceCacheCat), expense: expenseRaw.map(toFinanceCacheCat) })
            } else {
              const next = updateRaw(expenseRaw)
              setExpenseRaw(next)
              if (userId) writeCache(userId, year, { income: incomeRaw.map(toFinanceCacheCat), expense: next.map(toFinanceCacheCat) })
            }
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

      <FinanceChatPanel
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
        year={year}
        income={incomeRaw}
        expense={expenseRaw}
      />
    </Fragment>
  )
}