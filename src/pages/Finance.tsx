import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { MoreVertical } from "lucide-react";
import { supabase } from '@/lib/supabaseClient'
import '../finance-grid.css'
import { LazyFeatures, LazyFinance, LazyComponents } from '@/utils/codeSplitting'
import SectionHeader from '@/components/finance/SectionHeader'
import CategoryRow from '@/components/finance/CategoryRow'
import AnnualStatsModal from '@/components/AnnualStatsModal'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput } from '@/components/ui/CoreInput'
import { YearDropdown, TypeDropdown } from '@/components/ui/UnifiedDropdown'
import { LazyComponent, LazyFinanceRow } from '@/components/ui/LazyComponent'
import { FinanceRowSkeleton } from '@/components/ui/LoadingStates'
import CellEditor from '@/components/CellEditor'
import NewCategoryMenu from '@/components/finance/NewCategoryMenu'
import NewCellMenu from '@/components/finance/NewCellMenu'
import type { Cat, CtxCat, CellCtx, EntryLite, FinanceCellCtx } from '@/types/shared'
function findCatById(id: string, list: Cat[]): Cat | undefined { return list.find(c => c.id === id) }
import { clampToViewport, computeDescendantSums } from '@/features/finance/utils'
import { months, monthCount, isCurrentYear as isCurrentYearUtil } from '@/features/finance/utils'
import { formatCurrencyEUR } from '@/lib/format'
import { useEnhancedErrorHandler } from '@/lib/enhancedErrorHandler'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { exportToJSON, exportToCSV, downloadFile, parseJSONImport } from '@/lib/financeExport'
import { useFinanceCache } from '@/hooks/useFinanceCache'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { logger } from '@/lib/monitoring'
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
  const { handleError, handleSuccess, handleWarning, handleInfo } = useEnhancedErrorHandler()
  const { userId, loading: authLoading } = useSupabaseAuth()
  const { writeCache, readCache } = useFinanceCache()
  const { createSimpleFooter, createDangerFooter } = useModalActions()
  const { isMobile } = useMobileDetection()
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

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    const handleYearChangeEvent = (event: CustomEvent) => {
      setYear(event.detail)
    }
    
    const handleFinanceDataUpdated = () => {
      // Reload data when updated via AI assistant
      if (userId) {
        reloadFinanceData()
      }
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    window.addEventListener('subheader-year-change', handleYearChangeEvent as EventListener)
    window.addEventListener('finance-data-updated', handleFinanceDataUpdated as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
      window.removeEventListener('subheader-year-change', handleYearChangeEvent as EventListener)
      window.removeEventListener('finance-data-updated', handleFinanceDataUpdated as EventListener)
    }
  }, [userId])

  // Notify App.tsx about current year
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('finance-year-changed', { detail: year }))
  }, [year])

  // Function to load financial data
  const reloadFinanceData = async (signal?: AbortSignal) => {
    if (!userId) return
    
    setLoading(true)
    
    try {
      const [catsRes, entriesRes] = await Promise.all([
        supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at', { ascending: true }),
        supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', year),
      ])
      
      if (signal?.aborted) return
      
      if (catsRes.error || entriesRes.error) { 
        handleError(catsRes.error || entriesRes.error, t('finance.loadingFinancialData')); 
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
      
      const income = cats.filter((c)=>c.type===FINANCE_TYPES.INCOME).map((c)=>({ id:c.id, name:c.name, type: 'income' as const, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) }))
      const expense = cats.filter((c)=>c.type===FINANCE_TYPES.EXPENSE).map((c)=>({ id:c.id, name:c.name, type: 'expense' as const, parent_id:c.parent_id, values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) }))
      
      if (!signal?.aborted) {
        setIncomeRaw(income)
        setExpenseRaw(expense)
        setLoading(false)
        
        // Update cache
        writeCache(userId, year, {
          income: income.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
          expense: expense.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
        })
      }
    } catch (error) {
      if (!signal?.aborted) {
        handleError(error, t('finance.loadingFinancialData'))
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!userId) return
    const cached = readCache(userId, year)
    if (cached) {
      setIncomeRaw((cached.income ?? []).map(c => ({ ...c, type: 'income' as const })))
      setExpenseRaw((cached.expense ?? []).map(c => ({ ...c, type: 'expense' as const })))
      setLoading(false)
    }
    
    const ctl = new AbortController()
    reloadFinanceData(ctl.signal)
    return () => ctl.abort()
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
    // Group categories with their children and add collapse state
    const parents = list.filter(c => !c.parent_id)
    const byParent: Record<string, Cat[]> = {}
    list.forEach(c => { if (c.parent_id) (byParent[c.parent_id] ||= []).push(c) })
    
    const result: Cat[] = []
    parents.forEach(p => { 
      // Add parent category
      result.push({ ...p, isCollapsed: false })
      
      // Add children with collapse state
      const children = byParent[p.id] || []
      children.forEach(child => {
        result.push({ ...child, isCollapsed: !!collapsed[p.id] })
      })
    })
    
    // Add orphaned children (if any)
    list.filter(c=>c.parent_id && !parents.find(p=>p.id===c.parent_id)).forEach(ch=>{
      result.push({ ...ch, isCollapsed: false })
    })
    
    return result
  }

  async function addCategory(){
    const name = newName.trim()
    if (!name || !userId) return
    const type = newType
    const payload: { user_id: string; type: 'income' | 'expense'; name: string; parent_id?: string } = { user_id: userId, type, name }
    if (newParent) payload.parent_id = newParent.id
    const { data, error } = await supabase.from('finance_categories').insert(payload).select('id,name,type,parent_id').single()
    if (error) { handleError(error, t('finance.creatingCategory')); return }
    const cat: Cat = { id: data.id, name: data.name, type: data.type, parent_id: data.parent_id, values: Array(MONTHS_IN_YEAR).fill(0) }
    if (type === FINANCE_TYPES.INCOME) {
      const raw = [...incomeRaw, cat]; setIncomeRaw(raw)
      writeCache(userId!, year, { income: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    } else {
      const raw = [...expenseRaw, cat]; setExpenseRaw(raw)
      writeCache(userId!, year, { income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), expense: raw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) })
    }
    handleSuccess(t('finance.categoryCreated', { name }))
    setShowAdd(false); setNewName(''); setNewType(FINANCE_TYPES.INCOME); setNewParent(null)
  }

  function onContextCategory(e: React.MouseEvent, cat: {id:string,name:string,type:'income'|'expense'}) {
    e.preventDefault(); 
    e.stopPropagation()
    if (cellCtxOpen) setCellCtxOpen(false)
    setCtxCellHighlight(null)
    setCtxCatHighlight(cat.id)
    
    // COMPLETE SCROLL INDEPENDENCE - only mouse coordinates
    setCtxMouseX(e.clientX + 10) // Right of cursor
    setCtxMouseY(e.clientY - 10) // Above cursor
    setCtxCat(cat)
    setCtxOpen(true)
  }
  function closeCtx(){ setCtxOpen(false); setCtxCat(null); setCtxCatHighlight(null) }

  async function submitRename(){
    const name = renameValue.trim()
    if (!name || !ctxCat) { setRenameOpen(false); return }
    const { error } = await supabase.from('finance_categories').update({ name }).eq('id', ctxCat.id)
    if (error) { handleError(error, t('finance.creatingCategory')); return }
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
    if (error) { handleError(error, t('finance.creatingCategory')); return }
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
            included: e.included
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
        note: e.note, 
        included: e.included, 
        position: idx 
      }))
      
      const { error } = await supabase.from('finance_entries').insert(rows)
      if (error) throw error
      
      // Update local state
      const sum = rows.filter(r=>r.included).reduce((s,r)=>s + (r.amount||0), 0)
      const updateRaw = (raw: Cat[]) => raw.map(c => c.id === catId ? { ...c, values: c.values.map((v,i)=> i===month ? sum : v) } : c)
      
      if (type === 'income') {
        setIncomeRaw(updateRaw(incomeRaw))
        writeCache(userId, year, { 
          income: updateRaw(incomeRaw).map(({id,name,values,parent_id})=>({id,name,values,parent_id})), 
          expense: expenseRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})) 
        })
      } else {
        setExpenseRaw(updateRaw(expenseRaw))
        writeCache(userId, year, { 
          income: incomeRaw.map(({id,name,values,parent_id})=>({id,name,values,parent_id})), 
          expense: updateRaw(expenseRaw).map(({id,name,values,parent_id})=>({id,name,values,parent_id})) 
        })
      }
      
      handleSuccess(t('finance.dataInserted'))
    } catch (error) {
      handleError(t('finance.errorInsertingData'))
      logger.error('Paste error:', error)
    }
    
    setCellCtxOpen(false); setCtxCellHighlight(null)
  }

  // Export functionality
  function handleExport() {
    const timestamp = new Date().toISOString().slice(0, 10)
    
    // Show export options
    const exportFormat = window.confirm(
      t('finance.exportFormat') || 'Экспортировать в JSON? (Отмена = CSV)'
    )
    
    if (exportFormat) {
      // Export as JSON
      const jsonData = exportToJSON(incomeRaw, expenseRaw, year)
      downloadFile(jsonData, `finance-${year}-${timestamp}.json`, 'application/json')
      handleSuccess(t('finance.exportedJSON') || 'Экспортировано в JSON')
    } else {
      // Export as CSV
      const csvData = exportToCSV(incomeRaw, expenseRaw, year)
      downloadFile(csvData, `finance-${year}-${timestamp}.csv`, 'text/csv')
      handleSuccess(t('finance.exportedCSV') || 'Экспортировано в CSV')
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
          handleError(t('finance.invalidImportFile') || 'Неверный формат файла')
          return
        }
        
        // Confirm import
        const confirm = window.confirm(
          t('finance.confirmImport', { year: data.year }) || 
          `Импортировать данные за ${data.year}? Это перезапишет текущие данные.`
        )
        
        if (!confirm) return
        
        // Apply imported data
        setIncomeRaw(data.income)
        setExpenseRaw(data.expense)
        setYear(data.year)
        
        // Save to cache
        if (userId) {
          writeCache(userId, data.year, {
            income: data.income.map(({id,name,values,parent_id})=>({id,name,values,parent_id})),
            expense: data.expense.map(({id,name,values,parent_id})=>({id,name,values,parent_id}))
          })
        }
        
        handleSuccess(t('finance.importedSuccessfully') || 'Данные успешно импортированы')
      } catch (error) {
        handleError(error, t('finance.importFailed') || 'Ошибка импорта')
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

  if (loading) return null;

  const isCurrentYear = year === currentYear
  const yearOptions = Array.from({length:7}).map((_,i)=> currentYear - 3 + i)

  // Mobile view - single day display
  if (isMobile) {
    return (
      <div className="mobile-finance-page">
        <Suspense fallback={<div className="h-16 bg-gray-100 animate-pulse" />}>
          <LazyComponents.MobileDayNavigator
            currentDate={mobileDate}
            onDateChange={setMobileDate}
            className="sticky top-0 z-10"
          />
        </Suspense>
        
        <div className="flex-1">
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg m-4" />}>
            <LazyFinance.MobileFinanceDay
              date={mobileDate}
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
              onAddCategory={(type) => {
                setNewType(type)
                setNewParent(null)
                setShowAdd(true)
              }}
              onEditCategory={(category, monthIndex) => {
                setEditorCat({ id: category.id, name: category.name, type: category.type } as CtxCat)
                setEditorMonth(monthIndex)
                setEditorOpen(true)
              }}
              onContextCategory={onContextCategory}
              onCellContext={onCellContext}
              ctxCatHighlight={ctxCatHighlight}
              ctxCellHighlight={ctxCellHighlight}
              fmt={fmtEUR}
            />
          </Suspense>
        </div>

        {/* Mobile modals */}
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
            <div className="flex-1"><TypeDropdown value={newType} onChange={(value) => setNewType(value as 'income' | 'expense')} fullWidth /></div>
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
              label: t('finance.save'), 
              onClick: submitRename,
              disabled: !renameValue.trim()
            },
            { 
              label: t('finance.cancel'), 
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
          footer={createDangerFooter(
            { 
              label: t('finance.delete'), 
              onClick: confirmDelete
            },
            { 
              label: t('finance.cancel'), 
              onClick: () => setDeleteOpen(false)
            }
          )}
        >
          <div className="text-sm text-gray-600">{t('finance.allRecordsWillBeDeleted')}</div>
        </UnifiedModal>

        {editorOpen && editorCat && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 animate-pulse w-96 h-64" /></div>}>
            <LazyFeatures.CellEditor
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
          </Suspense>
        )}

        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 animate-pulse w-96 h-64" /></div>}>
          <LazyFeatures.AnnualStatsModal
            open={showStats}
            onClose={()=>setShowStats(false)}
            year={year}
            incomeByMonth={totalIncomeByMonth}
            expenseByMonth={totalExpenseByMonth}
          />
        </Suspense>

        {/* Context menus */}
        {ctxOpen && ctxCat && (
          <NewCategoryMenu
            x={ctxMouseX}
            y={ctxMouseY}
            canAddSub={!Boolean((findCatById(ctxCat.id, incomeRaw) || findCatById(ctxCat.id, expenseRaw))?.parent_id)}
            onClose={closeCtx}
            onRename={()=>{ setRenameValue(ctxCat.name); setRenameOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
            onAddSub={()=>{ setNewType(ctxCat.type as 'income' | 'expense'); setNewParent({ id: ctxCat.id, name: ctxCat.name }); setShowAdd(true); setCtxOpen(false); setCtxCatHighlight(null) }}
            onDelete={()=>{ setDeleteOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          />
        )}

        {cellCtxOpen && cellCtx && (
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
    )
  }

  // Desktop view - original grid layout
  return (
    <React.Fragment>
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

      {ctxOpen && ctxCat && (
        <NewCategoryMenu
          x={ctxMouseX}
          y={ctxMouseY}
          canAddSub={!Boolean((findCatById(ctxCat.id, incomeRaw) || findCatById(ctxCat.id, expenseRaw))?.parent_id)}
          onClose={closeCtx}
          onRename={()=>{ setRenameValue(ctxCat.name); setRenameOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onAddSub={()=>{ setNewType(ctxCat.type as 'income' | 'expense'); setNewParent({ id: ctxCat.id, name: ctxCat.name }); setShowAdd(true); setCtxOpen(false); setCtxCatHighlight(null) }}
          onDelete={()=>{ setDeleteOpen(true); setCtxOpen(false); setCtxCatHighlight(null) }}
        />
      )}{cellCtxOpen && cellCtx && (
        <NewCellMenu
          x={cellCtxMouseX}
          y={cellCtxMouseY}
          onClose={()=>{ setCellCtxOpen(false); setCtxCellHighlight(null) }}
          canCopy={cellCanCopy}
          hasClipboard={!!(cellClipboard && cellClipboard.length > 0)}
          onCopy={copyCell}
          onPaste={pasteCell}
        />
      )}<UnifiedModal
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
          <div className="flex-1"><TypeDropdown value={newType} onChange={(value) => setNewType(value as 'income' | 'expense')} fullWidth /></div>
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
        footer={createDangerFooter(
          { 
            label: t('actions.delete'), 
            onClick: confirmDelete
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => setDeleteOpen(false)
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
    </React.Fragment>
  )
}