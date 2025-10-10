import { useState, useCallback } from 'react'
import type { Todo } from '@/types/shared'

interface UseTodoManagerReturn {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  updateTodoText: (id: string, text: string) => void
  setTodos: (todos: Todo[]) => void
  clearTodos: () => void
  completedCount: number
  totalCount: number
  hasCompleted: boolean
  hasIncomplete: boolean
}

/**
 * Custom hook to manage todos within a task
 * 
 * Usage:
 * ```tsx
 * const { todos, addTodo, toggleTodo, removeTodo } = useTodoManager(initialTodos)
 * 
 * <button onClick={() => addTodo('New todo')}>Add</button>
 * {todos.map(todo => (
 *   <div key={todo.id}>
 *     <input 
 *       type="checkbox" 
 *       checked={todo.done}
 *       onChange={() => toggleTodo(todo.id)}
 *     />
 *     <span>{todo.text}</span>
 *     <button onClick={() => removeTodo(todo.id)}>Delete</button>
 *   </div>
 * ))}
 * ```
 */
export function useTodoManager(initialTodos: Todo[] = []): UseTodoManagerReturn {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)

  const addTodo = useCallback((text: string) => {
    if (!text.trim()) return
    
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      done: false
    }
    
    setTodos(prev => [...prev, newTodo])
  }, [])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id 
          ? { ...todo, done: !todo.done } 
          : todo
      )
    )
  }, [])

  const removeTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }, [])

  const updateTodoText = useCallback((id: string, text: string) => {
    if (!text.trim()) {
      removeTodo(id)
      return
    }
    
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, text: text.trim() }
          : todo
      )
    )
  }, [removeTodo])

  const clearTodos = useCallback(() => {
    setTodos([])
  }, [])

  const completedCount = todos.filter(t => t.done).length
  const totalCount = todos.length
  const hasCompleted = completedCount > 0
  const hasIncomplete = completedCount < totalCount

  return {
    todos,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodoText,
    setTodos,
    clearTodos,
    completedCount,
    totalCount,
    hasCompleted,
    hasIncomplete
  }
}

