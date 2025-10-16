import { useState, useCallback } from 'react'
import type { Todo } from '@/types/shared'

interface UseTodoManagerReturn {
  todos: Todo[]
  newTodo: string
  hoveredTodoId: string | null
  addTodo: (text?: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  updateTodoText: (id: string, text: string) => void
  setTodos: (todos: Todo[]) => void
  setNewTodo: (text: string) => void
  setHoveredTodoId: (id: string | null) => void
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
  const [newTodo, setNewTodo] = useState('')
  const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null)

  const addTodo = useCallback((text?: string) => {
    const todoText = text || newTodo
    if (!todoText.trim()) return
    
    const newTodoItem: Todo = {
      id: crypto.randomUUID(),
      text: todoText.trim(),
      done: false
    }
    
    setTodos(prev => [...prev, newTodoItem])
    setNewTodo('')
  }, [newTodo])

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
    setNewTodo('')
  }, [])

  const completedCount = todos.filter(t => t.done).length
  const totalCount = todos.length
  const hasCompleted = completedCount > 0
  const hasIncomplete = completedCount < totalCount

  return {
    todos,
    newTodo,
    hoveredTodoId,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodoText,
    setTodos,
    setNewTodo,
    setHoveredTodoId,
    clearTodos,
    completedCount,
    totalCount,
    hasCompleted,
    hasIncomplete
  }
}

