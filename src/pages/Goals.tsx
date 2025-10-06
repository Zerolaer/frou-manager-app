import React, { useEffect, useMemo, useState, useCallback } from 'react'
import GoalsToolbar from '@/components/goals/GoalsToolbar'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import GoalsStats from '@/components/goals/GoalsStats'
import { listGoals, createGoal, updateGoal, deleteGoal, completeGoal, type Goal, type GoalUpsert } from '@/features/goals/api'
import { useErrorHandler } from '@/lib/errorHandler'
import { ContentLoader, StaggeredChildren } from '@/components/ContentLoader'
import { GoalsListSkeleton } from '@/components/skeletons/PageSkeletons'
import { useContentTransition } from '@/hooks/useContentTransition'
import { PageErrorBoundary } from '@/components/ErrorBoundaries'

function GoalsPageContent(){
  const { handleError, handleSuccess } = useErrorHandler()
  const [items, setItems] = useState<Goal[]>([])
  const { isLoading, startLoading, completeLoading, setError: setTransitionError } = useContentTransition({
    minLoadingTime: 300
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<Error | null>(null)

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-goal':
        setEditing(null)
        setModalOpen(true)
        break
      case 'filter':
        // TODO: Implement filter functionality
        handleSuccess('Фильтр будет реализован в следующей версии')
        break
      case 'progress':
        setStatsOpen(true)
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    
    const loadGoals = async () => {
      try {
        startLoading()
        const data = await listGoals()
        
        if (!cancelled) {
          setItems(data || [])
          completeLoading(data && data.length > 0)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Ошибка загрузки целей')
          setError(error)
          setTransitionError(error)
          handleError(err, 'Загрузка целей')
          setItems([])
        }
      }
    }
    
    loadGoals()
    
    return () => { 
      cancelled = true 
    }
  }, [])

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
    <div className="space-y-6 p-4">
      <GoalsToolbar onCreate={onCreate} onOpenStats={() => setStatsOpen(true)} />
      <div className="flex items-center gap-2">
        <input className="input w-full max-w-md" placeholder="Поиск по целям…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <ContentLoader
        loading={isLoading}
        error={error}
        empty={filtered.length === 0 && !query}
        emptyMessage="Цели не найдены. Создайте первую цель!"
        skeleton={<GoalsListSkeleton />}
        minHeight="600px"
        fadeIn={true}
      >
        {filtered.length === 0 && query ? (
          <div className="text-center text-gray-500 py-8">
            Ничего не найдено
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StaggeredChildren stagger={40}>
              {filtered.map(g => (
                <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
              ))}
            </StaggeredChildren>
          </div>
        )}
      </ContentLoader>

      <GoalModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSave={onSave} />
      <GoalsStats open={statsOpen} onClose={() => setStatsOpen(false)} goals={items} />
    </div>
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
