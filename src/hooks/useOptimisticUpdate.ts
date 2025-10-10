import { useState, useCallback } from 'react'

interface OptimisticOperation<T> {
  id: string
  type: 'add' | 'update' | 'delete'
  data?: T
  rollback?: () => void
}

/**
 * Optimistic updates hook for instant UI feedback
 * 
 * Usage:
 * ```tsx
 * const { data, addOptimistic, commitOptimistic, rollbackOptimistic } = useOptimisticUpdate(initialTasks)
 * 
 * // Add task optimistically
 * const tempId = 'temp-' + Date.now()
 * const tempTask = { id: tempId, title: 'New task', ... }
 * addOptimistic({ id: tempId, type: 'add', data: tempTask })
 * 
 * // Save to DB
 * const { data: savedTask } = await supabase.insert(task)
 * 
 * // Commit (replace temp with real)
 * commitOptimistic(tempId, savedTask)
 * 
 * // Or rollback on error
 * if (error) rollbackOptimistic(tempId)
 * ```
 */
export function useOptimisticUpdate<T extends { id: string }>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData)
  const [operations, setOperations] = useState<Map<string, OptimisticOperation<T>>>(new Map())

  // Add optimistic operation
  const addOptimistic = useCallback((operation: OptimisticOperation<T>) => {
    setOperations(prev => new Map(prev).set(operation.id, operation))
    
    setData(prev => {
      switch (operation.type) {
        case 'add':
          return operation.data ? [...prev, operation.data] : prev
          
        case 'update':
          return operation.data 
            ? prev.map(item => item.id === operation.id ? operation.data! : item)
            : prev
            
        case 'delete':
          return prev.filter(item => item.id !== operation.id)
          
        default:
          return prev
      }
    })
  }, [])

  // Commit optimistic operation (replace temp with real data)
  const commitOptimistic = useCallback((tempId: string, realData?: T) => {
    setOperations(prev => {
      const next = new Map(prev)
      next.delete(tempId)
      return next
    })
    
    if (realData) {
      setData(prev => 
        prev.map(item => 
          item.id === tempId ? realData : item
        )
      )
    }
  }, [])

  // Rollback optimistic operation
  const rollbackOptimistic = useCallback((id: string) => {
    const operation = operations.get(id)
    
    if (operation?.rollback) {
      operation.rollback()
    } else {
      // Default rollback: reverse the operation
      setData(prev => {
        switch (operation?.type) {
          case 'add':
            return prev.filter(item => item.id !== id)
            
          case 'delete':
            return operation.data ? [...prev, operation.data] : prev
            
          default:
            return prev
        }
      })
    }
    
    setOperations(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [operations])

  // Clear all pending operations
  const clearOptimistic = useCallback(() => {
    operations.forEach((op) => {
      op.rollback?.()
    })
    setOperations(new Map())
  }, [operations])

  return {
    data,
    setData,
    addOptimistic,
    commitOptimistic,
    rollbackOptimistic,
    clearOptimistic,
    hasPending: operations.size > 0,
    pendingCount: operations.size
  }
}

/**
 * Simple optimistic update for single item
 * 
 * Usage:
 * ```tsx
 * const { executeOptimistic } = useSimpleOptimistic()
 * 
 * await executeOptimistic(
 *   // Optimistic action
 *   () => setTasks([...tasks, tempTask]),
 *   // Real action
 *   () => supabase.insert(task),
 *   // Rollback on error
 *   () => setTasks(tasks.filter(t => t.id !== tempTask.id))
 * )
 * ```
 */
export function useSimpleOptimistic() {
  const executeOptimistic = useCallback(async <T>(
    optimisticAction: () => void,
    realAction: () => Promise<T>,
    rollbackAction: () => void
  ): Promise<T | null> => {
    // Execute optimistic update immediately
    optimisticAction()

    try {
      // Execute real action
      const result = await realAction()
      return result
    } catch (error) {
      // Rollback on error
      rollbackAction()
      throw error
    }
  }, [])

  return { executeOptimistic }
}

