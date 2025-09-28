import React, { useEffect, useMemo, useState, useCallback } from 'react'
import SubHeader from '@/components/SubHeader'
import PageContainer from '@/components/PageContainer'
// CSS imports removed - styles now in styles.css
import GoalsToolbar from '@/components/goals/GoalsToolbar'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import GoalsStats from '@/components/goals/GoalsStats'
import { listGoals, createGoal, updateGoal, deleteGoal, completeGoal, type Goal, type GoalUpsert } from '@/features/goals/api'
import { useErrorHandler } from '@/lib/errorHandler'
import { LoadingState, ListSkeleton } from '@/components/LoadingStates'
import { VirtualizedList } from '@/components/VirtualizedList'
import { PageErrorBoundary } from '@/components/ErrorBoundaries'

function GoalsPageContent(){
  const { handleError, handleSuccess } = useErrorHandler()
  const [items, setItems] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await listGoals()
        
        if (!cancelled) {
          setItems(data || [])
        }
      } catch (error) {
        if (!cancelled) {
          handleError(error, 'Загрузка целей')
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    
    return () => { 
      cancelled = true 
    }
  }, []) // Пустой массив зависимостей - выполняется только один раз

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(g => (g.title + ' ' + (g.description ?? '')).toLowerCase().includes(q)) : items
  }, [items, query])

  const onCreate = useCallback(() => { 
    setEditing(null); 
    setModalOpen(true) 
  }, []);
  
  const onEdit = useCallback((g: Goal) => { 
    setEditing(g); 
    setModalOpen(true) 
  }, []);
  
  const onOpenStats = useCallback(() => {
    setStatsOpen(true);
  }, []);
  
  const onCloseStats = useCallback(() => {
    setStatsOpen(false);
  }, []);
  
  const onCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);
  const onDelete = async (g: Goal) => {
    if (!confirm('Удалить цель?')) return
    try {
      await deleteGoal(g.id)
      setItems(s => s.filter(x => x.id !== g.id))
      handleSuccess('Цель удалена')
    } catch (error) {
      handleError(error, 'Удаление цели')
    }
  }
  const onComplete = async (g: Goal) => {
    try {
      const updated = await completeGoal(g.id)
      setItems(s => s.map(x => x.id === g.id ? updated : x))
      handleSuccess('Цель завершена')
    } catch (error) {
      handleError(error, 'Завершение цели')
    }
  }
  const onSave = async (payload: GoalUpsert, id?: string) => {
    try {
      if (id) {
        const updated = await updateGoal(Number(id), payload)
        setItems(s => s.map(x => x.id === Number(id) ? updated : x))
        handleSuccess('Цель обновлена')
      } else {
        const created = await createGoal(payload)
        setItems(s => [created, ...s])
        handleSuccess('Цель создана')
      }
      setModalOpen(false)
    } catch (error) {
      handleError(error, id ? 'Обновление цели' : 'Создание цели')
    }
  }

  return (
    <>
      <SubHeader title="Цели">
        <GoalsToolbar onCreate={onCreate} onOpenStats={() => setStatsOpen(true)} />
      </SubHeader>
      
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <input className="input w-full max-w-md" placeholder="Поиск по целям…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>

      {loading ? (
        <ListSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
          ))}
          {filtered.length === 0 && !loading ? (
            <div className="col-span-full text-center text-gray-500 py-8">
              {query ? 'Ничего не найдено' : 'Цели не найдены. Создайте первую цель!'}
            </div>
          ) : null}
        </div>
      )}

        <GoalModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSave={onSave} />
        <GoalsStats open={statsOpen} onClose={() => setStatsOpen(false)} goals={items} />
        </div>
      </PageContainer>
    </>
  )
}

export default function GoalsPage(){
  return (
    <PageErrorBoundary 
      pageName="Цели"
      onError={(error, errorInfo) => {
        console.error('Goals page error:', error, errorInfo);
      }}
    >
      <GoalsPageContent />
    </PageErrorBoundary>
  );
}
