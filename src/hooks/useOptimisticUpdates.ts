import { useState, useCallback, useRef } from 'react'
import { useErrorHandler } from '@/lib/errorHandler'

// Generic optimistic update hook
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T, optimisticData: Partial<T>) => Promise<T>,
  options: {
    rollbackOnError?: boolean
    onSuccess?: (result: T) => void
    onError?: (error: Error, originalData: T) => void
  } = {}
) {
  const { rollbackOnError = true, onSuccess, onError } = options
  const { handleError, handleSuccess } = useErrorHandler()
  
  const [data, setData] = useState<T>(initialData)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Partial<T>>>(new Map())
  
  const originalDataRef = useRef<T>(initialData)
  const updateIdRef = useRef(0)

  const applyOptimisticUpdate = useCallback(async (
    optimisticData: Partial<T>,
    updateId?: string
  ) => {
    const id = updateId || `update_${++updateIdRef.current}`
    
    // Store original data for potential rollback
    originalDataRef.current = data
    
    // Apply optimistic update immediately
    setData(prev => ({ ...prev, ...optimisticData }))
    setIsOptimistic(true)
    
    // Track pending update
    setPendingUpdates(prev => new Map(prev).set(id, optimisticData))
    
    try {
      // Perform actual update
      const result = await updateFn(data, optimisticData)
      
      // Update with real data
      setData(result)
      setIsOptimistic(false)
      
      // Remove from pending updates
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      onSuccess?.(result)
      handleSuccess('Изменения сохранены')
      
      return result
    } catch (error) {
      // Rollback on error if enabled
      if (rollbackOnError) {
        setData(originalDataRef.current)
      }
      
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalDataRef.current)
      handleError(err, 'Ошибка при сохранении изменений')
      
      throw error
    }
  }, [data, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const cancelPendingUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })
    
    // If no more pending updates, clear optimistic state
    setPendingUpdates(current => {
      if (current.size === 0) {
        setIsOptimistic(false)
      }
      return current
    })
  }, [])

  const rollbackAll = useCallback(() => {
    setData(originalDataRef.current)
    setIsOptimistic(false)
    setPendingUpdates(new Map())
  }, [])

  return {
    data,
    isOptimistic,
    pendingUpdates: Array.from(pendingUpdates.entries()),
    applyOptimisticUpdate,
    cancelPendingUpdate,
    rollbackAll,
    hasPendingUpdates: pendingUpdates.size > 0
  }
}

// Optimistic updates for lists
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  updateFn: (items: T[], item: T) => Promise<T[]>,
  options: {
    rollbackOnError?: boolean
    onSuccess?: (result: T[]) => void
    onError?: (error: Error, originalItems: T[]) => void
  } = {}
) {
  const { rollbackOnError = true, onSuccess, onError } = options
  const { handleError, handleSuccess } = useErrorHandler()
  
  const [items, setItems] = useState<T[]>(initialItems)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, T>>(new Map())
  
  const originalItemsRef = useRef<T[]>(initialItems)
  const updateIdRef = useRef(0)

  const addOptimistically = useCallback(async (newItem: T) => {
    const id = `add_${++updateIdRef.current}`
    
    originalItemsRef.current = items
    
    // Add item immediately
    setItems(prev => [newItem, ...prev])
    setIsOptimistic(true)
    setPendingUpdates(prev => new Map(prev).set(id, newItem))
    
    try {
      const result = await updateFn(items, newItem)
      setItems(result)
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      onSuccess?.(result)
      handleSuccess('Элемент добавлен')
      return result
    } catch (error) {
      if (rollbackOnError) {
        setItems(originalItemsRef.current)
      }
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalItemsRef.current)
      handleError(err, 'Ошибка при добавлении элемента')
      throw error
    }
  }, [items, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const updateOptimistically = useCallback(async (updatedItem: T) => {
    const id = `update_${++updateIdRef.current}`
    
    originalItemsRef.current = items
    
    // Update item immediately
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ))
    setIsOptimistic(true)
    setPendingUpdates(prev => new Map(prev).set(id, updatedItem))
    
    try {
      const result = await updateFn(items, updatedItem)
      setItems(result)
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      onSuccess?.(result)
      handleSuccess('Элемент обновлен')
      return result
    } catch (error) {
      if (rollbackOnError) {
        setItems(originalItemsRef.current)
      }
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalItemsRef.current)
      handleError(err, 'Ошибка при обновлении элемента')
      throw error
    }
  }, [items, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const removeOptimistically = useCallback(async (itemId: string) => {
    const id = `remove_${++updateIdRef.current}`
    
    originalItemsRef.current = items
    const itemToRemove = items.find(item => item.id === itemId)
    
    if (!itemToRemove) return
    
    // Remove item immediately
    setItems(prev => prev.filter(item => item.id !== itemId))
    setIsOptimistic(true)
    setPendingUpdates(prev => new Map(prev).set(id, itemToRemove))
    
    try {
      // Create a dummy update function for removal
      const result = await updateFn(items.filter(item => item.id !== itemId), itemToRemove)
      setItems(result)
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      onSuccess?.(result)
      handleSuccess('Элемент удален')
      return result
    } catch (error) {
      if (rollbackOnError) {
        setItems(originalItemsRef.current)
      }
      setIsOptimistic(false)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalItemsRef.current)
      handleError(err, 'Ошибка при удалении элемента')
      throw error
    }
  }, [items, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const rollbackAll = useCallback(() => {
    setItems(originalItemsRef.current)
    setIsOptimistic(false)
    setPendingUpdates(new Map())
  }, [])

  return {
    items,
    isOptimistic,
    pendingUpdates: Array.from(pendingUpdates.entries()),
    addOptimistically,
    updateOptimistically,
    removeOptimistically,
    rollbackAll,
    hasPendingUpdates: pendingUpdates.size > 0
  }
}

// Optimistic updates for form fields
export function useOptimisticField<T>(
  initialValue: T,
  updateFn: (value: T) => Promise<T>,
  options: {
    debounceMs?: number
    rollbackOnError?: boolean
    onSuccess?: (result: T) => void
    onError?: (error: Error, originalValue: T) => void
  } = {}
) {
  const { debounceMs = 500, rollbackOnError = true, onSuccess, onError } = options
  const { handleError, handleSuccess } = useErrorHandler()
  
  const [value, setValue] = useState<T>(initialValue)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [isPending, setIsPending] = useState(false)
  
  const originalValueRef = useRef<T>(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdateRef = useRef<T | null>(null)

  const updateValue = useCallback(async (newValue: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Store original value for potential rollback
    originalValueRef.current = value
    
    // Apply optimistic update immediately
    setValue(newValue)
    setIsOptimistic(true)
    pendingUpdateRef.current = newValue
    
    // Debounce the actual update
    timeoutRef.current = setTimeout(async () => {
      setIsPending(true)
      
      try {
        const result = await updateFn(newValue)
        setValue(result)
        setIsOptimistic(false)
        setIsPending(false)
        pendingUpdateRef.current = null
        
        onSuccess?.(result)
        handleSuccess('Изменения сохранены')
      } catch (error) {
        if (rollbackOnError) {
          setValue(originalValueRef.current)
        }
        
        setIsOptimistic(false)
        setIsPending(false)
        pendingUpdateRef.current = null
        
        const err = error instanceof Error ? error : new Error(String(error))
        onError?.(err, originalValueRef.current)
        handleError(err, 'Ошибка при сохранении изменений')
      }
    }, debounceMs)
  }, [value, updateFn, debounceMs, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const rollback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setValue(originalValueRef.current)
    setIsOptimistic(false)
    setIsPending(false)
    pendingUpdateRef.current = null
  }, [])

  return {
    value,
    isOptimistic,
    isPending,
    updateValue,
    rollback
  }
}

// Optimistic toggle for boolean values
export function useOptimisticToggle(
  initialValue: boolean,
  updateFn: (value: boolean) => Promise<boolean>,
  options: {
    rollbackOnError?: boolean
    onSuccess?: (result: boolean) => void
    onError?: (error: Error, originalValue: boolean) => void
  } = {}
) {
  const { rollbackOnError = true, onSuccess, onError } = options
  const { handleError, handleSuccess } = useErrorHandler()
  
  const [value, setValue] = useState(initialValue)
  const [isOptimistic, setIsOptimistic] = useState(false)
  
  const originalValueRef = useRef(initialValue)

  const toggle = useCallback(async () => {
    const newValue = !value
    
    originalValueRef.current = value
    
    // Apply optimistic update immediately
    setValue(newValue)
    setIsOptimistic(true)
    
    try {
      const result = await updateFn(newValue)
      setValue(result)
      setIsOptimistic(false)
      
      onSuccess?.(result)
      handleSuccess(newValue ? 'Включено' : 'Выключено')
    } catch (error) {
      if (rollbackOnError) {
        setValue(originalValueRef.current)
      }
      
      setIsOptimistic(false)
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalValueRef.current)
      handleError(err, 'Ошибка при изменении настройки')
    }
  }, [value, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const setValueOptimistically = useCallback(async (newValue: boolean) => {
    if (newValue === value) return
    
    originalValueRef.current = value
    
    setValue(newValue)
    setIsOptimistic(true)
    
    try {
      const result = await updateFn(newValue)
      setValue(result)
      setIsOptimistic(false)
      
      onSuccess?.(result)
      handleSuccess(newValue ? 'Включено' : 'Выключено')
    } catch (error) {
      if (rollbackOnError) {
        setValue(originalValueRef.current)
      }
      
      setIsOptimistic(false)
      
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err, originalValueRef.current)
      handleError(err, 'Ошибка при изменении настройки')
    }
  }, [value, updateFn, rollbackOnError, onSuccess, onError, handleError, handleSuccess])

  const rollback = useCallback(() => {
    setValue(originalValueRef.current)
    setIsOptimistic(false)
  }, [])

  return {
    value,
    isOptimistic,
    toggle,
    setValue: setValueOptimistically,
    rollback
  }
}
