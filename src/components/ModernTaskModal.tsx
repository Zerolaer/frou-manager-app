import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, Calendar, Tag, Check, Bold, Italic, Strikethrough, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react'
import ProjectDropdown from './ProjectDropdown'
import DateDropdown from './DateDropdown'
import CoreMenu from '@/components/ui/CoreMenu'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import TagTimeInput from '@/components/ui/TagTimeInput'
import { isValidScheduledTime } from '@/lib/scheduledTime'
import { supabase } from '@/lib/supabaseClient'
import SideModal from '@/components/ui/SideModal'
import { ModalButton, UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { useSafeTranslation } from '@/utils/safeTranslation'
import type { Todo, Project } from '@/types/shared'
import { logger } from '@/lib/monitoring'
import { TASK_STATUSES } from '@/lib/constants'
import { filterVisibleTaskProjects } from '@/lib/taskProjects'
import RecurringTaskBlock from './RecurringTaskBlock'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import { format, parseISO, isAfter, isEqual } from 'date-fns'
import { sanitizeRichTextHtml } from '@/lib/dataValidation'
import { useModalConfirm } from '@/utils/modalConfirm'
import '@/notes.css'

// CSS animations for checkboxes
const checkboxAnimations = `
  @keyframes checkboxPress {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.85);
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes checkmarkBounce {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes todoBackgroundFill {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }
  
  @keyframes todoBackgroundUnfill {
    0% {
      width: 100%;
    }
    100% {
      width: 0%;
    }
  }
`;

// Add styles to head if not present
if (typeof document !== 'undefined' && !document.getElementById('checkbox-animations')) {
  const style = document.createElement('style');
  style.id = 'checkbox-animations';
  style.textContent = checkboxAnimations;
  document.head.appendChild(style);
}

type Task = {
  id: string
  project_id?: string | null
  title: string
  description?: string | null
  priority?: string | null
  tag?: string | null
  scheduled_time?: string | null
  date?: string | null
  todos?: Todo[]
  status?: string
  created_at?: string
  updated_at?: string
}

type Props = {
  open: boolean
  onClose: () => void
  task: Task | null
  onUpdated?: (task: Task | null, isSave?: boolean) => void
  onUpdateRecurrence?: (taskId: string, settings: any) => Promise<void>
  onOpenTask?: (task: Task) => void
  onCancel?: () => void // New prop for subtask cancel behavior
  noBackdrop?: boolean // Don't render backdrop
  position?: 'left' | 'right' // Position of modal
  customZIndex?: number // Custom z-index
  disableBackdropClick?: boolean // Don't close on backdrop click
  splitView?: boolean // Enable 50/50 split view mode
  onUpdateBoard?: (taskId: string, todos: Todo[]) => void // Прямое обновление доски
  onSubtaskDateChange?: (subtask: Task | null, isSave?: boolean) => void // Обновление подзадачи при изменении даты
}

export default function ModernTaskModal({ open, onClose, task, onUpdated, onUpdateRecurrence, onOpenTask, onCancel, noBackdrop, position, customZIndex, disableBackdropClick, splitView, onUpdateBoard, onSubtaskDateChange }: Props) {
  const { t, i18n } = useSafeTranslation()
  const { alert } = useModalConfirm()
  const modalContentRef = useRef<HTMLDivElement>(null)
  
  
  // React hooks are now imported directly, no need for safety check
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionMinHeight, setDescriptionMinHeight] = useState(144) // Минимальная высота (6 строк * 24px)
  const descriptionResizeRef = useRef<HTMLDivElement>(null)
  const descriptionEditorRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)
  const [priority, setPriority] = useState('')
  const [tag, setTag] = useState('')
  const [scheduledTime, setScheduledTime] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [newTodoDate, setNewTodoDate] = useState<string>('')
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [animatingTodos, setAnimatingTodos] = useState<Set<string>>(new Set())
  const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [parentTaskDate, setParentTaskDate] = useState<string | null>(null)
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null) // ID подзадачи для удаления
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null) // ID todo для редактирования
  const [editingTodoText, setEditingTodoText] = useState<string>('') // Текст редактируемого todo
  const [subtaskMode, setSubtaskMode] = useState<'subtasks' | 'todos'>('subtasks') // Режим: подзадачи или простые todo
  const wasDoneBeforeAnimationRef = useRef<Map<string, boolean>>(new Map()) // Track previous done state for animation direction
  const { createStandardFooter } = useModalActions()

  // Memoize task todos string to detect changes
  const taskTodosStr = useMemo(() => {
    return task?.todos ? JSON.stringify(task.todos) : ''
  }, [task?.todos])
  
  // Prevent backdrop clicks from closing modal when clicking inside
  useEffect(() => {
    if (!open || !modalContentRef.current) return
    
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // If clicking inside modal content, prevent backdrop click
      if (modalContentRef.current?.contains(target)) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    
    // Use capture phase to intercept events before they reach backdrop
    document.addEventListener('mousedown', handleMouseDown, true)
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [open])
  
  // Load task data when modal opens or task changes (excluding todos and status updates)
  // Todos and status are handled in separate useEffects for smooth real-time updates
  useEffect(() => {
    if (!open || !task) {
      setIsLoading(true)
      setParentTaskDate(null)
      return
    }
    
    // Only show loading and delay on initial open or task id change
    // NOT on todos/status updates (they are handled separately)
    const isTaskChange = task.id !== title || !title
    
    if (isTaskChange) {
      setIsLoading(true)
      
      // Sync todos with actual subtask statuses from database when opening parent task
      // This ensures todos reflect the current state of subtasks
      if (task?.todos && Array.isArray(task.todos) && task.todos.length > 0) {
        const todosWithTaskId = task.todos.filter((t: Todo) => (t as any).taskId && (t as any).isTask)
        if (todosWithTaskId.length > 0) {
          // Load actual statuses of all subtasks from database
          const subtaskIds = todosWithTaskId.map((t: Todo) => (t as any).taskId)
          supabase
            .from('tasks_items')
            .select('id,status')
            .in('id', subtaskIds)
            .then(({ data: subtasks, error }) => {
              if (!error && subtasks && subtasks.length > 0) {
                // Create a map of subtask id to status
                const statusMap = new Map(subtasks.map(s => [s.id, s.status]))
                
                // Update todos with actual statuses
                const syncedTodos = (task.todos ?? []).map((todo: Todo) => {
                  const taskId = (todo as any).taskId
                  if (taskId && statusMap.has(taskId)) {
                    const actualStatus = statusMap.get(taskId)
                    const isClosed = actualStatus === 'closed' || actualStatus === TASK_STATUSES.CLOSED
                    if (todo.done !== isClosed) {
                      console.log('🔄 Syncing todo with actual subtask status:', {
                        todoId: todo.id,
                        taskId: taskId,
                        oldDone: todo.done,
                        newDone: isClosed,
                        actualStatus: actualStatus
                      })
                      return { ...todo, done: isClosed }
                    }
                  }
                  return todo
                })
                
                // Update todos if any changed
                const todosChanged = JSON.stringify(task.todos) !== JSON.stringify(syncedTodos)
                if (todosChanged) {
                  console.log('✅ Synced todos with actual subtask statuses from database')
                  setTodos(syncedTodos)
                  
                  // Also update parent task in database if todos changed
                  if (task.id) {
                    supabase
                      .from('tasks_items')
                      .update({ todos: syncedTodos })
                      .eq('id', task.id)
                      .then(({ error }) => {
                        if (error) {
                          console.error('❌ Error syncing todos in database:', error)
                        } else {
                          console.log('✅ Updated parent task todos in database with synced statuses')
                        }
                      })
                  }
                }
              }
            })
            .then(undefined, (error: unknown) => {
              console.error('❌ Error loading subtask statuses for sync:', error)
            })
        }
      }
    }
    
    // Use delay only for task changes, not for todos/status updates
    const delay = isTaskChange ? 100 : 0
    const timer = setTimeout(() => {
      setTitle(task.title || '')
      const taskDescription = task.description || ''
      setDescription(taskDescription)
      setDescriptionMinHeight(144) // Сбрасываем минимальную высоту
      // Устанавливаем контент в contenteditable элемент
      setTimeout(() => {
        if (descriptionEditorRef.current) {
          descriptionEditorRef.current.innerHTML = taskDescription
          // Устанавливаем начальную высоту на основе содержимого
          const editor = descriptionEditorRef.current
          editor.style.height = 'auto'
          editor.style.height = `${Math.max(editor.scrollHeight, descriptionMinHeight - 40)}px`
        }
      }, 0)
      setPriority((task.priority as any) || 'normal')
      setTag(task.tag || '')
      setScheduledTime(isValidScheduledTime(task.scheduled_time) ? task.scheduled_time : null)
      setDate(task.date || '')
      // Todos are updated in separate useEffect for smooth real-time updates
      // Status is updated in separate useEffect for smooth real-time updates
      setProjectId(task.project_id || '')
      setNewTodo('')
      setNewTodoDate('')
      
      // Загружаем сохраненный режим для этой задачи
      const savedMode = localStorage.getItem(`task_${task.id}_subtaskMode`) as 'subtasks' | 'todos' | null
      if (savedMode === 'subtasks' || savedMode === 'todos') {
        setSubtaskMode(savedMode)
      } else {
        setSubtaskMode('subtasks') // По умолчанию
      }
      
      setIsLoading(false)
    }, delay)
    
    // Load parent task date if this is a subtask
    if ((task as any)?.parent_task_id) {
      supabase
        .from('tasks_items')
        .select('date')
        .eq('id', (task as any).parent_task_id)
        .single()
        .then(
          ({ data: parentTask }) => {
            if (parentTask?.date) {
              setParentTaskDate(parentTask.date)
            }
          },
          (error: unknown) => {
            logger.error('Error loading parent task date:', error)
          }
        )
    } else {
      setParentTaskDate(null)
    }
    
    return () => clearTimeout(timer)
  }, [open, task?.id, task?.title, task?.description, task?.priority, task?.tag, task?.scheduled_time, task?.date, task?.project_id]) // Only watch for non-todos/status changes
  
  // Обновляем доску при закрытии модального окна подзадачи
  useEffect(() => {
    if (!open && task && (task as any)?.parent_task_id && onUpdateBoard && todos.length > 0) {
      // Обновляем подзадачу на доске при закрытии
      onUpdateBoard(task.id, todos)
      console.log('🔄 Обновляем подзадачу на доске при закрытии:', {
        taskId: task.id,
        todosCount: todos.length
      })
    }
  }, [open, task, todos, onUpdateBoard])
  
  // Update status immediately when task.status changes (for smooth real-time updates)
  // This runs separately to avoid triggering loading state or delays
  useEffect(() => {
    if (!open || !task) return
    
    const newStatus = (task as any)?.status || 'open'
    if (status !== newStatus) {
      console.log('🔄 Updating status immediately (smooth update):', { 
        taskId: task.id,
        oldStatus: status,
        newStatus: newStatus
      })
      setStatus(newStatus)
    }
  }, [task?.status, open, task?.id]) // Only depend on status, not other fields
  
  // Update todos immediately when task.todos changes (for subtask sync)
  // This ensures immediate UI update when parent task todos change
  useEffect(() => {
    if (!open || !task) {
      console.log('⏸️ Modal not open or no task, skipping todos update')
      return
    }
    
    const newTodos = Array.isArray(task.todos) ? (task.todos as Todo[]) : []
    
    // Use functional update to compare with current state
    setTodos(prevTodos => {
      const currentTodosStr = JSON.stringify(prevTodos)
      const newTodosStr = JSON.stringify(newTodos)
      
      console.log('🔍 Checking todos changes:', {
        taskId: task.id,
        taskTodosStr,
        currentTodosStr: currentTodosStr.substring(0, 100),
        newTodosStr: newTodosStr.substring(0, 100),
        areEqual: currentTodosStr === newTodosStr,
        oldTodosCount: prevTodos.length,
        newTodosCount: newTodos.length
      })
      
      // Only update if todos actually changed
      if (currentTodosStr !== newTodosStr) {
        console.log('✅ Todos changed in task prop, updating local state immediately:', { 
          taskId: task.id,
          oldTodosCount: prevTodos.length,
          newTodosCount: newTodos.length,
          oldTodos: prevTodos.map(t => ({ id: t.id, text: t.text, done: t.done })),
          newTodos: newTodos.map(t => ({ id: t.id, text: t.text, done: t.done }))
        })
        return newTodos
      } else {
        console.log('⏭️ Todos unchanged, skipping update')
        return prevTodos
      }
    })
  }, [taskTodosStr, open, task?.id, task]) // Watch for changes in task.todos using stringified version
  
  // Legacy effect for initial load
  const prevTaskTodosRef = useRef<string>('')
  const prevTaskIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open || !task) return
    
    // Reset refs when task changes
    if (prevTaskIdRef.current !== task.id) {
      prevTaskIdRef.current = task.id
      prevTaskTodosRef.current = ''
    }
    
    if (task?.todos && Array.isArray(task.todos)) {
      const newTodosStr = JSON.stringify(task.todos)
      // Only update if todos actually changed
      if (prevTaskTodosRef.current !== newTodosStr) {
        prevTaskTodosRef.current = newTodosStr
        const currentTodosStr = JSON.stringify(todos)
        if (currentTodosStr !== newTodosStr) {
          setTodos(task.todos as Todo[])
        }
      }
    }
  }, [task?.id, task?.todos, open])

  // Load projects
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data } = await supabase
        .from('tasks_projects')
        .select('id,name')
        .order('created_at', { ascending: true })
      setProjects(
        filterVisibleTaskProjects((data as Project[]) || [], t('projects.uncategorized'))
      )
    })()
  }, [open, t])

  // Auto-save title and description with debounce
  // Use ref to track if we're currently saving to prevent loops
  const isSavingRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingStatusRef = useRef(false) // Flag to prevent save when updating status
  
  useEffect(() => {
    if (!open || !task || isSavingRef.current) return
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    logger.debug('⏱️ Title/description changed, scheduling save in 800ms')
    saveTimeoutRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        isSavingRef.current = true
        save(true).finally(() => {
          isSavingRef.current = false
        })
      }
    }, 800)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, description, open, task?.id])

  // Auto-save other fields with small delay
  useEffect(() => {
    if (!open || !task || isSavingRef.current) return
    
    // Skip auto-save if we're updating status for a subtask (updateSubtaskStatus handles it)
    if (isUpdatingStatusRef.current && (task as any)?.parent_task_id) {
      isUpdatingStatusRef.current = false // Reset flag
      return
    }
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    logger.debug('⏱️ Fields changed, scheduling save in 500ms', { date, priority, tag, scheduledTime, status, projectId })
    saveTimeoutRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        isSavingRef.current = true
        save(true).finally(() => {
          isSavingRef.current = false
        })
      }
    }, 500)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [priority, tag, scheduledTime, date, status, projectId, open, task?.id, task?.todos])

  // Auto-save todos when they change
  useEffect(() => {
    if (!open || !task || isSavingRef.current) return
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    logger.debug('⏱️ Todos changed, scheduling save in 300ms')
    saveTimeoutRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        isSavingRef.current = true
        save(true).finally(() => {
          isSavingRef.current = false
        })
      }
    }, 300)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [todos, open, task?.id])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Formatting functions for description
  const applyFormat = (command: string, value?: string) => {
    const editor = descriptionEditorRef.current
    if (!editor) return
    
    editor.focus()
    document.execCommand(command, false, value)
    
    // Update content from contenteditable
    setDescription(editor.innerHTML)
  }

  const insertList = (type: 'ordered' | 'unordered') => {
    const editor = descriptionEditorRef.current
    if (!editor) return
    
    editor.focus()
    
    // Ensure we have a selection - if not, create one at the end
    let selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    
    if (type === 'ordered') {
      document.execCommand('insertOrderedList', false)
    } else {
      document.execCommand('insertUnorderedList', false)
    }
    
    setDescription(editor.innerHTML)
  }

  // Handler for closing with save
  const handleClose = useCallback(async () => {
    logger.debug('🚪 Closing modal, saving first...')
    await save(false) // false = manual save (user action)
    logger.debug('🚪 Saved, now closing')
    onClose()
  }, [save, onClose])

  async function save(isAutoSave = false, skipOnUpdated = false) {
    if (!task) {
      logger.debug('❌ Save skipped: no task')
      return
    }

    // Allow saving even with empty title for other fields
    const finalTitle = title.trim() || task.title || 'Untitled Task'

    logger.debug('💾 Saving task:', { 
      id: task.id, 
      title: finalTitle, 
      description: descriptionEditorRef.current?.innerHTML ? sanitizeRichTextHtml(descriptionEditorRef.current.innerHTML) : description.trim(), 
      priority, 
      tag: tag.trim(), 
      date, 
      projectId,
      todos: todos.length,
      originalDate: task.date,
      skipOnUpdated
    })

    const updates = {
      title: finalTitle,
      description: descriptionEditorRef.current?.innerHTML ? sanitizeRichTextHtml(descriptionEditorRef.current.innerHTML) : (description.trim() || ''),
      priority: priority || 'normal',
      tag: tag.trim() || '',
      scheduled_time: isValidScheduledTime(scheduledTime) ? scheduledTime : null,
      date: date || null, // Allow null dates
      todos,
      status,
      project_id: projectId || null,
    }

    logger.debug('📤 Updates payload:', updates)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        await alert(
          t('tasks.sessionRequired'),
          t('common.error')
        )
        return
      }

      const { data, error } = await supabase
        .from('tasks_items')
        .update(updates)
        .eq('id', task.id)
        .select('id,project_id,title,description,date,position,priority,tag,scheduled_time,todos,status')

      if (error) {
        logger.error('❌ Supabase error:', error)
        await alert(
          `${t('tasks.saveFailed')}: ${error.message}`,
          t('common.error')
        )
        throw error
      }

      const row = Array.isArray(data) ? data[0] : (data as Record<string, unknown> | null)
      if (!row) {
        logger.error('❌ Task save returned 0 rows (RLS / wrong id)', { id: task.id })
        await alert(
          t('tasks.saveNoRows') ||
            t('tasks.saveNoRows'),
          t('common.error')
        )
        return
      }

      logger.debug('✅ Task saved successfully:', row)
      
      // If this is a subtask, sync changes back to parent task's todos array
      // Sync status changes immediately (even on auto-save) to update parent task's checkbox
      if (row && (task as any)?.parent_task_id) {
        try {
          // Load parent task
          const { data: parentTask } = await supabase
            .from('tasks_items')
            .select('*')
            .eq('id', (task as any).parent_task_id)
            .single()
          
          if (parentTask?.todos && Array.isArray(parentTask.todos)) {
            // Find the todo item that corresponds to this subtask
            const updatedTodos = parentTask.todos.map((todo: Todo) => {
              if (todo.taskId === task.id) {
                // Update todo with current subtask data
                return {
                  ...todo,
                  text: finalTitle, // Sync title
                  done: status === 'closed', // Sync status - важно для обновления чекбокса
                  date: date || null, // Sync date
                  description: descriptionEditorRef.current?.innerHTML ? sanitizeRichTextHtml(descriptionEditorRef.current.innerHTML) : (description.trim() || null), // Sync description
                  tag: tag.trim() || null, // Sync tag
                  priority: priority || null // Sync priority
                }
              }
              return todo
            })
            
            // Check if todos actually changed
            const todosChanged = JSON.stringify(parentTask.todos) !== JSON.stringify(updatedTodos)
            
            if (todosChanged) {
              // Update parent task's todos array
              await supabase
                .from('tasks_items')
                .update({ todos: updatedTodos })
                .eq('id', (task as any).parent_task_id)
              
              logger.debug('✅ Synced subtask changes to parent task', { status, done: status === 'closed' })
            }
          }
        } catch (syncError) {
          logger.error('❌ Error syncing subtask to parent:', syncError)
        }
      }
      
      // Update local task with actual data from database
      // Only call onUpdated if data actually changed to prevent loops
      if (row && !skipOnUpdated) {
        const r = row as Task & Record<string, unknown>
        const updatedTask = { 
          ...task, 
          ...r,
          project_id: r.project_id || projectId || null,
          // Ensure status is explicitly set (important for subtasks)
          status: r.status || status
        }
        
        // CRITICAL: If this is a subtask, call onUpdated to update board immediately
        // This ensures status changes are reflected on board right away
        if ((task as any)?.parent_task_id && onUpdated) {
          // Reload full task data with all necessary fields including project_name
          const { data: fullTaskData } = await supabase
            .from('tasks_items')
            .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
            .eq('id', task.id)
            .single()
          
          if (fullTaskData) {
            const subtaskToUpdate = {
              ...fullTaskData,
              project_name: (fullTaskData as any).tasks_projects?.name || null
            }
            onUpdated(subtaskToUpdate as any, isAutoSave)
            return // Don't call onUpdated again below
          }
        }
        
        // Check if task actually changed
        const taskChanged = 
          updatedTask.title !== task.title ||
          updatedTask.description !== task.description ||
          updatedTask.priority !== task.priority ||
          updatedTask.tag !== task.tag ||
          updatedTask.date !== task.date ||
          updatedTask.status !== task.status ||
          updatedTask.project_id !== task.project_id ||
          JSON.stringify(updatedTask.todos) !== JSON.stringify(task.todos)
        
        if (taskChanged) {
          logger.debug('📢 Calling onUpdated with:', { updatedTask: updatedTask.title, isAutoSave, isManualSave: !isAutoSave })
          // Call onUpdated for both manual saves and auto-saves to update the UI
          onUpdated?.(updatedTask, !isAutoSave) // false for auto-save, true for manual save
        } else {
          logger.debug('⏭️ Skipped onUpdated call - no changes detected')
        }
      } else if (skipOnUpdated) {
        logger.debug('⏭️ Skipped onUpdated call')
      }
    } catch (error) {
      logger.error('❌ Error saving task:', error)
      console.error('Error saving task:', error)
    }
  }

  async function addTodo() {
    const text = newTodo.trim()
    if (!text) return
    
    // Validate date if provided
    if (newTodoDate && task?.date) {
      const todoDate = parseISO(newTodoDate)
      const parentDate = parseISO(task.date)
      
      // Check if todo date is before parent date
      if (isAfter(parentDate, todoDate) && !isEqual(parentDate, todoDate)) {
        await alert(t('tasks.subtaskDateValidation'), t('common.validationError'))
        return
      }
    }
    
    const newTodoItem: Todo = {
      id: String(Date.now()),
      text,
      done: false,
      date: newTodoDate || null,
      isSimpleTodo: false // Это подзадача, не простой todo
    }
    setTodos(prev => [...prev, newTodoItem])
    setNewTodo('')
    setNewTodoDate('')
    
    // If date is provided, automatically convert to task on board
    if (newTodoDate) {
      setTimeout(() => {
        convertToTask(newTodoItem)
      }, 100)
    }
  }

  // Простая функция для добавления простого todo (не подзадача)
  function addSimpleTodo() {
    const text = newTodo.trim()
    if (!text) return
    
    const newTodoItem: Todo = {
      id: String(Date.now()),
      text,
      done: false,
      isSimpleTodo: true // Флаг для простых todo
    }
    setTodos(prev => [...prev, newTodoItem])
    setNewTodo('')
    // Сохраняем изменения в задачу (автосохранение, не закрывает модальное окно)
    save(true, false)
  }

  // Функция для переключения простого todo (не подзадача)
  async function toggleSimpleTodo(id: string) {
    // Trigger animation
    setAnimatingTodos(prev => new Set(prev).add(id))
    
    setTimeout(() => {
      setAnimatingTodos(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
    
    const todo = todos.find(t => t.id === id)
    if (!todo || !todo.isSimpleTodo) return // Только для простых todo
    
    const newDoneState = !todo.done
    
    // Track previous state for animation
    wasDoneBeforeAnimationRef.current.set(id, todo.done)
    
    // Toggle todo state locally
    const updatedTodos = todos.map(t => 
      t.id === id ? { ...t, done: newDoneState } : t
    )
    setTodos(updatedTodos)
    
    // Сохраняем изменения в задачу (простые todo не обновляют родительские задачи)
    if (task && task.id) {
      try {
        const { error } = await supabase
          .from('tasks_items')
          .update({ todos: updatedTodos })
          .eq('id', task.id)
        
        if (error) {
          logger.error('❌ Error saving simple todo toggle:', error)
          // Revert on error
          setTodos(todos)
          return
        }
        
        // Обновляем текущую задачу в UI через onUpdated
        if (onUpdated) {
          const updatedTask = {
            ...task,
            todos: updatedTodos
          }
          onUpdated(updatedTask as any, false)
        }
      } catch (error) {
        logger.error('❌ Error in toggleSimpleTodo:', error)
        // Revert on error
        setTodos(todos)
      }
    }
  }

  // Простая функция для удаления todo в подзадачах
  async function removeSimpleTodo(id: string) {
    const todo = todos.find(t => t.id === id)
    if (!todo || !todo.isSimpleTodo) return // Только для простых todo
    
    const updatedTodos = todos.filter(t => t.id !== id)
    setTodos(updatedTodos)
    
    if (task && task.id) {
      try {
        // Сохраняем todos в текущую задачу (простые todo не обновляют родительские задачи)
        const { error } = await supabase
          .from('tasks_items')
          .update({ todos: updatedTodos })
          .eq('id', task.id)
        
        if (error) {
          logger.error('❌ Error removing simple todo:', error)
          // Revert on error
          setTodos(todos)
          return
        }
        
        // Обновляем текущую задачу в UI через onUpdated
        if (onUpdated) {
          onUpdated({ ...task, todos: updatedTodos } as any, false)
        }
      } catch (error) {
        logger.error('❌ Error in removeSimpleTodo:', error)
        // Revert on error
        setTodos(todos)
      }
    }
  }

  // Начать редактирование todo
  function startEditingTodo(id: string, currentText: string) {
    setEditingTodoId(id)
    setEditingTodoText(currentText)
  }

  // Сохранить изменения в todo
  async function saveTodoEdit(id: string) {
    if (editingTodoText.trim()) {
      const todo = todos.find(t => t.id === id)
      const isSimpleTodo = todo?.isSimpleTodo === true
      
      const updatedTodos = todos.map(t => 
        t.id === id ? { ...t, text: editingTodoText.trim() } : t
      )
      setTodos(updatedTodos)
      
      if (task && task.id) {
        try {
          // Сохраняем todos в текущую задачу
          const { error } = await supabase
            .from('tasks_items')
            .update({ todos: updatedTodos })
            .eq('id', task.id)
          
          if (error) {
            logger.error('❌ Error saving todo edit:', error)
            return
          }
          
          // Если это подзадача (не простой todo), обновляем родительскую задачу МОМЕНТАЛЬНО
          if ((task as any)?.parent_task_id && !isSimpleTodo) {
            try {
              const { data: parentTask } = await supabase
                .from('tasks_items')
                .select('*')
                .eq('id', (task as any).parent_task_id)
                .single()
              
              if (parentTask?.todos && Array.isArray(parentTask.todos)) {
                const updatedParentTodos = parentTask.todos.map((parentTodo: Todo) => {
                  if ((parentTodo as any).taskId === task.id) {
                    return {
                      ...parentTodo,
                      text: editingTodoText.trim()
                    }
                  }
                  return parentTodo
                })
                
              // Обновляем родительскую задачу в базе данных
              await supabase
                .from('tasks_items')
                .update({ todos: updatedParentTodos })
                .eq('id', (task as any).parent_task_id)
              
              // МГНОВЕННОЕ обновление доски для родительской задачи
              if (onUpdateBoard) {
                onUpdateBoard((task as any).parent_task_id, updatedParentTodos)
              }
              
              // Также вызываем onUpdated для полного обновления
              if (onUpdated) {
                const updatedParentTask = {
                  ...parentTask,
                  todos: updatedParentTodos
                }
                onUpdated(updatedParentTask as any, false)
              }
              }
            } catch (parentError) {
              logger.error('❌ Error updating parent task:', parentError)
            }
          }
          
          // МГНОВЕННОЕ обновление доски для текущей подзадачи (только если не простой todo)
          if (onUpdateBoard && task && task.id && !isSimpleTodo) {
            onUpdateBoard(task.id, updatedTodos)
          }
          
          // Обновляем текущую задачу в UI через onUpdated
          if (onUpdated) {
            onUpdated({ ...task, todos: updatedTodos } as any, false)
          }
        } catch (error) {
          logger.error('❌ Error in saveTodoEdit:', error)
        }
      }
    }
    setEditingTodoId(null)
    setEditingTodoText('')
  }

  // Отменить редактирование todo
  function cancelTodoEdit() {
    setEditingTodoId(null)
    setEditingTodoText('')
  }

  async function toggleTodo(id: string) {
    // Trigger animation
    setAnimatingTodos(prev => new Set(prev).add(id))
    
    // Remove animation class after it completes
    setTimeout(() => {
      setAnimatingTodos(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
    
    // Find the todo being toggled
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    
    const newDoneState = !todo.done
    
    // Toggle todo state locally
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, done: newDoneState } : t
    ))
    
    // If this todo is linked to a subtask (has taskId), update the subtask's status
    if (todo.taskId && todo.isTask) {
      try {
        // Update the subtask's status in database
        const { data: updatedSubtask, error } = await supabase
          .from('tasks_items')
          .update({ status: newDoneState ? 'closed' : 'open' })
          .eq('id', todo.taskId)
          .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
          .single()
        
        if (error) {
          console.error('❌ Error updating subtask status:', error)
          // Revert local change on error
          setTodos(prev => prev.map(t => 
            t.id === id ? { ...t, done: !newDoneState } : t
          ))
          return
        }
        
        // First, update parent task's todos array in database to sync checkbox state
        // This must be done BEFORE calling onUpdated to ensure parent task has latest todos
        if (task && task.id) {
          try {
            // Load current parent task
            const { data: currentParentTask } = await supabase
              .from('tasks_items')
              .select('*')
              .eq('id', task.id)
              .single()
            
            if (currentParentTask?.todos && Array.isArray(currentParentTask.todos)) {
              // Update the corresponding todo item with new done state
              const updatedTodos = currentParentTask.todos.map((parentTodo: Todo) => {
                // Check both taskId and id to ensure we find the right todo
                const matches = parentTodo.taskId === todo.taskId || parentTodo.id === todo.id
                if (matches) {
                  return {
                    ...parentTodo,
                    done: newDoneState,
                    text: updatedSubtask.title || parentTodo.text,
                    description: updatedSubtask.description || null,
                    tag: updatedSubtask.tag || null,
                    priority: updatedSubtask.priority || null,
                    date: updatedSubtask.date || null
                  }
                }
                return parentTodo
              })
              
              // Update parent task's todos in database
              const { data: updatedParentTask, error: updateError } = await supabase
                .from('tasks_items')
                .update({ todos: updatedTodos })
                .eq('id', task.id)
                .select('*')
                .single()
              
              if (updateError) {
                console.error('❌ Error updating parent task todos:', updateError)
              } else if (updatedParentTask) {
                // Update local todos state immediately to reflect the change
                setTodos(updatedTodos)
              }
            }
          } catch (syncError) {
            console.error('❌ Error syncing to parent task:', syncError)
          }
        }
        
        // Notify parent component to update UI (this will update the board and trigger handleSubtaskUpdate)
        // This must be called AFTER syncing with parent task to ensure proper flow
        // IMPORTANT: This MUST be called to update the subtask status on the board
        if (onUpdated && updatedSubtask) {
          // Ensure status is explicitly set based on newDoneState, not relying on DB response
          const explicitStatus = newDoneState ? 'closed' : 'open'
          
          // Get parent_task_id from task (current parent task) - we're in parent task modal
          // The task.id IS the parent task ID - this is critical for routing to handleSubtaskUpdate
          const parentTaskId = task?.id || null
          
          if (!parentTaskId) {
            return
          }
          
          // Create complete task object with all necessary fields
          const subtaskToUpdate = {
            ...updatedSubtask,
            project_id: updatedSubtask.project_id || null,
            status: explicitStatus, // Always use explicit status from checkbox state
            parent_task_id: parentTaskId, // CRITICAL: Must be set for handleTaskUpdate to route to handleSubtaskUpdate
            project_name: (updatedSubtask as any).tasks_projects?.name || null
          }
          
          // CRITICAL: Call onSubtaskDateChange FIRST for direct board update
          // This ensures the board is updated immediately, even if onUpdated doesn't route correctly
          // Must be called synchronously before any async operations
          if (onSubtaskDateChange) {
            // Direct call to handleSubtaskUpdate - this updates the board immediately
            onSubtaskDateChange(subtaskToUpdate as any, false)
          }
          
          // Also call onUpdated to trigger handleTaskUpdate (which routes to handleSubtaskUpdate)
          // This ensures parent task sync and other updates
          if (onUpdated) {
            onUpdated(subtaskToUpdate as any, false)
          }
        }
        
        // Also notify parent component about parent task update (if parent task modal is open)
        // This ensures the parent task's todos list is updated in the modal
        if (onUpdated && task && task.id) {
          try {
            // Reload parent task to get latest todos
            const { data: latestParentTask } = await supabase
              .from('tasks_items')
              .select('*')
              .eq('id', task.id)
              .single()
            
            if (latestParentTask) {
              const updatedTaskWithTodos = {
                ...task,
                ...latestParentTask,
                todos: latestParentTask.todos || [],
                project_id: latestParentTask.project_id || null
              }
              // Call onUpdated to notify parent component about parent task update
              // This will update viewTask in Tasks.tsx if parent task is open
              onUpdated(updatedTaskWithTodos as any, false)
            }
          } catch (parentUpdateError) {
            console.error('❌ Error updating parent task in onUpdated:', parentUpdateError)
          }
        }
      } catch (err) {
        console.error('❌ Error:', err)
        // Revert local change on error
        setTodos(prev => prev.map(t => 
          t.id === id ? { ...t, done: !newDoneState } : t
        ))
      }
    } else {
      // If not a linked subtask, just save the parent task
      await save(false, false)
    }
  }

  function removeTodo(id: string) {
    // Показываем модальное окно подтверждения
    setTodoToDelete(id)
  }

  function confirmDeleteTodo() {
    if (todoToDelete) {
      setTodos(prev => prev.filter(t => t.id !== todoToDelete))
      setTodoToDelete(null)
    }
  }

  // Update subtask status and immediately update board (same approach as for dates)
  async function updateSubtaskStatus(newStatus: 'open' | 'closed') {
    if (!task || !(task as any)?.parent_task_id) return
    
    try {
      // Update status in database
      const { data: updatedSubtask, error } = await supabase
        .from('tasks_items')
        .update({ status: newStatus })
        .eq('id', task.id)
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
        .single()
      
      if (error) {
        logger.error('Error updating subtask status:', error)
        return
      }
      
      if (updatedSubtask) {
        const subtaskToUpdate = {
          ...updatedSubtask,
          status: newStatus,
          project_name: (updatedSubtask as any).tasks_projects?.name || null
        }
        
        // Update parent task's todos array (same as for dates)
        if (task.id) {
          try {
            const { data: currentParentTask } = await supabase
              .from('tasks_items')
              .select('*')
              .eq('id', (task as any).parent_task_id)
              .single()
            
            if (currentParentTask?.todos && Array.isArray(currentParentTask.todos)) {
              const updatedTodos = currentParentTask.todos.map((parentTodo: Todo) => {
                if (parentTodo.taskId === task.id || parentTodo.id === task.id) {
                  return {
                    ...parentTodo,
                    done: newStatus === 'closed'
                  }
                }
                return parentTodo
              })
              
              await supabase
                .from('tasks_items')
                .update({ todos: updatedTodos })
                .eq('id', (task as any).parent_task_id)
              
              setTodos(updatedTodos)
            }
          } catch (syncError) {
            logger.error('❌ Error syncing status to parent task:', syncError)
          }
        }
        
        // Notify parent component to update UI (same as for dates)
        if (onUpdated) {
          console.log('📢 updateSubtaskStatus calling onUpdated:', {
            subtaskId: subtaskToUpdate.id,
            status: subtaskToUpdate.status,
            date: subtaskToUpdate.date
          })
          onUpdated(subtaskToUpdate as any, false)
        } else {
          console.warn('⚠️ updateSubtaskStatus: onUpdated is not available')
        }
      }
    } catch (err) {
      logger.error('Error updating subtask status:', err)
    }
  }

  async function updateTodoDate(todoId: string, newDate: string) {
    if (!task) return
    
    // Validate date if provided
    if (newDate && task.date) {
      const todoDate = parseISO(newDate)
      const parentDate = parseISO(task.date)
      
      // Check if todo date is before parent date
      if (isAfter(parentDate, todoDate) && !isEqual(parentDate, todoDate)) {
        await alert(t('tasks.subtaskDateValidation'), t('common.validationError'))
        return
      }
    }
    
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return
    
    // Update local state
    setTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, date: newDate || null } : t
    ))
    
    // If todo is already converted to task, update it in database
    if (todo.isTask && todo.taskId) {
      try {
        const { error } = await supabase
          .from('tasks_items')
          .update({ date: newDate || null })
          .eq('id', todo.taskId)
        
        if (error) {
          logger.error('Error updating subtask date:', error)
          // Revert local change on error
          setTodos(prev => prev.map(t => 
            t.id === todoId ? { ...t, date: todo.date || null } : t
          ))
          return
        }
        
        // Reload the subtask to get updated data with all necessary fields
        const { data: updatedSubtask } = await supabase
          .from('tasks_items')
          .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
          .eq('id', todo.taskId)
          .single()
        
        if (updatedSubtask) {
          // Обновляем подзадачу на доске через onUpdated
          // Это важно как при добавлении, так и при удалении даты
          // Убеждаемся, что date явно установлена в null если newDate пустая
          const subtaskToUpdate = {
            ...updatedSubtask,
            date: newDate || null,
            project_name: (updatedSubtask as any).tasks_projects?.name || null
          }
          // First, update parent task's todos array in database to sync date (same as for status)
          // This must be done BEFORE calling onUpdated to ensure parent task has latest todos
          if (task && task.id && !(task as any)?.parent_task_id) {
            try {
              // Load current parent task
              const { data: currentParentTask } = await supabase
                .from('tasks_items')
                .select('*')
                .eq('id', task.id)
                .single()
              
              if (currentParentTask?.todos && Array.isArray(currentParentTask.todos)) {
                // Update the corresponding todo item with new date
                const updatedTodos = currentParentTask.todos.map((parentTodo: Todo) => {
                  if (parentTodo.taskId === todo.taskId || parentTodo.id === todo.id) {
                    return {
                      ...parentTodo,
                      date: newDate || null
                    }
                  }
                  return parentTodo
                })
                
                // Update parent task's todos in database
                await supabase
                  .from('tasks_items')
                  .update({ todos: updatedTodos })
                  .eq('id', task.id)
                
                // Update local todos state immediately
                setTodos(updatedTodos)
              }
            } catch (syncError) {
              logger.error('❌ Error syncing date to parent task:', syncError)
            }
          }
          
          // Notify parent component to update UI (same as for status changes)
          // Use onUpdated - it will call handleSubtaskUpdate in Tasks.tsx
          if (onUpdated) {
            onUpdated(subtaskToUpdate as any, false)
          }
        } else {
          console.error('❌ Failed to reload subtask after date update')
        }
        
        // If date was added and task didn't exist, create it
        // Note: convertToTask will call onSubtaskDateChange if needed
        if (newDate && !todo.isTask) {
          await convertToTask({ ...todo, date: newDate })
        }
        // If date was removed, onSubtaskDateChange above will handle removing it from the board
      } catch (err) {
        logger.error('Error updating subtask date:', err)
        // Revert local change on error
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, date: todo.date || null } : t
        ))
      }
    } else if (newDate && !todo.isTask) {
      // If date is added to a non-converted todo, convert it to task
      const updatedTodo = { ...todo, date: newDate }
      setTodos(prev => prev.map(t => 
        t.id === todoId ? updatedTodo : t
      ))
      // Convert to task - this will create the task and notify parent via onSubtaskDateChange
      await convertToTask(updatedTodo)
    } else if (!newDate && todo.isTask && todo.taskId) {
      // Date was removed from a converted todo - need to update board
      // Reload the subtask to get updated data
      const { data: updatedSubtask } = await supabase
        .from('tasks_items')
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
        .eq('id', todo.taskId)
        .single()
      
      if (updatedSubtask) {
        const subtaskToUpdate = {
          ...updatedSubtask,
          date: null, // Explicitly set to null
          project_name: (updatedSubtask as any).tasks_projects?.name || null
        }
        
        // Update parent task's todos array (same as for status)
        if (task && task.id && (task as any)?.parent_task_id === null) {
          try {
            const { data: currentParentTask } = await supabase
              .from('tasks_items')
              .select('*')
              .eq('id', task.id)
              .single()
            
            if (currentParentTask?.todos && Array.isArray(currentParentTask.todos)) {
              const updatedTodos = currentParentTask.todos.map((parentTodo: Todo) => {
                if (parentTodo.taskId === todo.taskId || parentTodo.id === todo.id) {
                  return {
                    ...parentTodo,
                    date: null
                  }
                }
                return parentTodo
              })
              
              await supabase
                .from('tasks_items')
                .update({ todos: updatedTodos })
                .eq('id', task.id)
              
              setTodos(updatedTodos)
            }
          } catch (syncError) {
            logger.error('❌ Error syncing date removal to parent task:', syncError)
          }
        }
        
        // Notify parent component to update UI (same as for status changes)
        if (onUpdated) {
          onUpdated(subtaskToUpdate as any, false)
        }
      }
    }
    
    // Save parent task to persist todo changes
    await save(false, false)
  }

  async function convertToTask(todo: Todo) {
    if (!task) return
    
    try {
      // Validate date if provided
      if (todo.date && task.date) {
        const todoDate = parseISO(todo.date)
        const parentDate = parseISO(task.date)
        
        // Check if todo date is before parent date
        if (isAfter(parentDate, todoDate) && !isEqual(parentDate, todoDate)) {
          await alert(t('tasks.subtaskDateValidation'), t('common.validationError'))
          return
        }
      }
      
      // Create a new task from the subtask (with date if provided to show on board)
      const { data: newTask, error } = await supabase
        .from('tasks_items')
        .insert({
          title: todo.text,
          description: todo.description || '',
          date: todo.date || null, // Use todo date if provided, otherwise null
          project_id: projectId || null,
          priority: todo.priority || priority || 'normal',
          tag: todo.tag || '',
          status: 'open',
          parent_task_id: task.id,
          todos: []
        })
        .select()
        .single()
      
         if (error) {
           console.error('❌ Error creating task:', error)
           console.error('❌ Error details:', {
             message: error.message,
             details: error.details,
             hint: error.hint,
             code: error.code
           })
           throw error
         }
      
      logger.debug('✅ Created new task from subtask:', newTask)
      
      // Mark subtask with taskId so we know it's now a separate task
      // Update the todo item in the list to mark it as opened and save task data
      setTodos(prev => prev.map(t => 
        t.id === todo.id 
          ? { 
              ...t, 
              isTask: true, 
              taskId: newTask.id,
              description: newTask.description || null,
              tag: newTask.tag || null,
              priority: newTask.priority || null
            } 
          : t
      ))
      
      // Save immediately with skipOnUpdated to avoid triggering rerender
      await save(false, true) // skipOnUpdated = true
      
      // Reload the subtask to get all necessary fields including project_name
      const { data: reloadedSubtask } = await supabase
        .from('tasks_items')
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,parent_task_id,tasks_projects(name)')
        .eq('id', newTask.id)
        .single()
      
      if (reloadedSubtask) {
        const subtaskToUpdate = {
          ...reloadedSubtask,
          project_name: (reloadedSubtask as any).tasks_projects?.name || null
        }
        
        // Notify parent component to update UI (same as for status changes)
        // Use onUpdated - it will call handleSubtaskUpdate in Tasks.tsx
        if (onUpdated) {
          logger.debug('📢 Notifying parent about new subtask:', { id: newTask.id, date: newTask.date })
          // Convert to TaskItem format with parent_task_title
          const subtaskItem: import('@/types/shared').TaskItem & { parent_task_title?: string | null } = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description || null,
            date: newTask.date || null,
            position: newTask.position || 0,
            priority: newTask.priority || null,
            tag: newTask.tag || null,
            todos: (newTask.todos || []) as Todo[],
            status: newTask.status || 'open',
            project_id: newTask.project_id || null,
          project_name: null,
          parent_task_id: newTask.parent_task_id || null,
          parent_task_title: task?.title || null
        }
          // Call onUpdated to update the board - this will add the task to tasks state
          onUpdated(subtaskItem, false)
        }
      }
      
      // Open the new task using the callback
      if (onOpenTask) {
        logger.debug('📂 Opening new task via callback')
        onOpenTask(newTask as Task)
      } else {
        console.warn('⚠️ onOpenTask callback not provided')
        logger.warn('⚠️ onOpenTask callback not provided')
      }
      
    } catch (error) {
      logger.error('Error converting subtask to task:', error)
      console.error('Error converting subtask to task:', error)
    }
  }

  async function deleteTask() {
    if (!task) return
    try {
      const { error } = await supabase
        .from('tasks_items')
        .delete()
        .eq('id', task.id)

      if (error) throw error
      onUpdated?.(null, true) // true indicates this is a save operation
      onClose()
    } catch (error) {
      logger.error('Error deleting task:', error)
    }
  }

  const projectName = projects.find(p => p.id === projectId)?.name || t('tasks.noProject')
  const statusText = status === 'open' ? t('tasks.open') : t('tasks.closed')
  
  // Dynamic header - "Task \ Project \ Status" format
  const headerTitle = `${t('tasks.task')} \\ ${projectName} \\ ${statusText}`
  
  // Check if this is a subtask
  const isSubtask = !!(task as any)?.parent_task_id

  return (
    <div ref={modalContentRef}>
      <SideModal
        open={open}
        onClose={onCancel || handleClose}
        showCloseButton={false}
        noPadding={true}
        title={headerTitle}
        noBackdrop={noBackdrop}
        position={position}
        customZIndex={customZIndex}
        disableBackdropClick={true}
        splitView={splitView}
      rightContent={
        <div ref={menuRef}>
          <CoreMenu
            options={[
              { value: 'duplicate', label: t('tasks.duplicate') },
              { value: 'delete', label: t('actions.delete'), destructive: true },
            ]}
            onSelect={(value) => {
              if (value === 'duplicate') {
                // Minimal duplicate action: prefill title to indicate duplicate
                setTitle((prevTitle) => `${prevTitle} (${t('common.copy')})`)
              }
              if (value === 'delete') {
                deleteTask()
              }
            }}
          />
        </div>
      }
      footer={
        <ModalButton variant="secondary" onClick={onCancel || handleClose}>
          {t('actions.close')}
        </ModalButton>
      }
    >
      {isLoading ? (
        /* Loading State */
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{t('tasks.loadingTask')}</p>
          </div>
        </div>
      ) : (
      <div className="flex h-full">
        {/* Left Column */}
        <div className="w-[60%] space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('tasks.taskTitle')}</label>
            <CoreInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('tasks.description')}</label>
            <div 
              ref={descriptionResizeRef}
              className="relative border rounded-xl bg-white transition-all duration-200 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-gray-500 focus-within:ring-offset-2 overflow-hidden"
              style={{ 
                minHeight: `${descriptionMinHeight}px`,
                borderColor: '#E5E7EB'
              }}
            >
              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => applyFormat('bold')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('italic')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('strikeThrough')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('underline')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Underline"
                >
                  <UnderlineIcon className="w-4 h-4 text-gray-700" />
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => insertList('unordered')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Bullet list"
                >
                  <List className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => insertList('ordered')}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Numbered list"
                >
                  <ListOrdered className="w-4 h-4 text-gray-700" />
                </button>
              </div>
              
              {/* ContentEditable editor */}
              <div className="relative flex-1 overflow-hidden pb-6">
                <div
                  ref={descriptionEditorRef}
                  contentEditable
                  onInput={(e) => {
                    const newContent = e.currentTarget.innerHTML
                    setDescription(newContent)
                    
                    // Автоматически подстраиваем высоту под содержимое
                    const editor = e.currentTarget
                    editor.style.height = 'auto'
                    editor.style.height = `${Math.max(editor.scrollHeight, descriptionMinHeight - 40)}px`
                  }}
                  onBlur={(e) => setDescription(e.currentTarget.innerHTML)}
                  onClick={(e) => {
                    // If empty, ensure cursor is placed in the editor
                    const editor = e.currentTarget
                    if (editor.innerHTML === '' || editor.innerHTML === '<br>') {
                      editor.focus()
                      const selection = window.getSelection()
                      const range = document.createRange()
                      range.selectNodeContents(editor)
                      range.collapse(false)
                      selection?.removeAllRanges()
                      selection?.addRange(range)
                    }
                  }}
                  data-placeholder={t('tasks.taskDetails')}
                  className="w-full px-4 py-3 bg-transparent text-gray-700 outline-none overflow-y-auto note-editor"
                  style={{ 
                    minHeight: `${descriptionMinHeight - 40}px`,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    height: 'auto'
                  }}
                  suppressContentEditableWarning
                />
              </div>
              
              {/* Resize handle - фиксированное расстояние от низа (6px) */}
              <div
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-4 cursor-ns-resize flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity group z-10 pointer-events-auto"
                style={{ 
                  cursor: 'ns-resize',
                  touchAction: 'none',
                  userSelect: 'none'
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  isResizingRef.current = true
                  
                  const startY = e.clientY
                  const startMinHeight = descriptionMinHeight
                  const container = descriptionResizeRef.current
                  
                  // Используем requestAnimationFrame для плавности
                  let rafId: number | null = null
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    if (!isResizingRef.current) return
                    
                    // Отменяем предыдущий кадр, если он еще не выполнился
                    if (rafId !== null) {
                      cancelAnimationFrame(rafId)
                    }
                    
                    rafId = requestAnimationFrame(() => {
                      if (!isResizingRef.current) return
                      
                      const diff = e.clientY - startY
                      // Позволяем уменьшать размер, но не меньше минимума 144px
                      const newMinHeight = Math.max(144, startMinHeight + diff)
                      
                      // Обновляем напрямую через DOM для плавности (без setState)
                      if (container) {
                        container.style.minHeight = `${newMinHeight}px`
                      }
                      
                      // Обновляем высоту редактора
                      if (descriptionEditorRef.current) {
                        const editor = descriptionEditorRef.current
                        const newMinEditorHeight = newMinHeight - 40
                        editor.style.height = `${newMinEditorHeight}px`
                      }
                    })
                  }
                  
                  const handleMouseUp = () => {
                    isResizingRef.current = false
                    
                    // Отменяем pending animation frame
                    if (rafId !== null) {
                      cancelAnimationFrame(rafId)
                    }
                    
                    // Обновляем state только в конце для синхронизации
                    if (container) {
                      const finalHeight = parseInt(container.style.minHeight) || descriptionMinHeight
                      setDescriptionMinHeight(finalHeight)
                    }
                    
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove, { passive: true })
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              >
                <div className="w-12 h-1 bg-gray-400 rounded-full group-hover:bg-gray-500"></div>
              </div>
            </div>
          </div>

          {/* Subtasks - только если это не подзадача */}
          {!(task as any)?.parent_task_id && (
          <div className="space-y-4">
            {/* Заголовок с переключателем */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {subtaskMode === 'subtasks' ? t('tasks.subtasks') : 'To-do list'}
              </label>
              
              {/* Переключатель режимов */}
              <div className="relative rounded-xl h-8 flex p-1" style={{ backgroundColor: '#F8F8F8' }}>
                <div 
                  className={`absolute top-1 bottom-1 w-1/2 bg-black rounded-lg transition-transform duration-200 ${
                    subtaskMode === 'subtasks' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                />
                <button
                  onClick={() => {
                    setSubtaskMode('subtasks')
                    setNewTodoDate('')
                    if (task?.id) {
                      localStorage.setItem(`task_${task.id}_subtaskMode`, 'subtasks')
                    }
                  }}
                  className={`relative flex-1 py-1 text-xs font-medium rounded-lg transition-colors z-10 ${
                    subtaskMode === 'subtasks'
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {t('tasks.subtasks')}
                </button>
                <button
                  onClick={() => {
                    setSubtaskMode('todos')
                    setNewTodoDate('')
                    if (task?.id) {
                      localStorage.setItem(`task_${task.id}_subtaskMode`, 'todos')
                    }
                  }}
                  className={`relative flex-1 py-1 text-xs font-medium rounded-lg transition-colors z-10 ${
                    subtaskMode === 'todos'
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  To-do
                </button>
              </div>
            </div>
            
            {/* Input row: (Инпут) (Кнопка календаря - только для подзадач) (кнопка создать) */}
            <div className="flex gap-2">
              <CoreInput
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder={subtaskMode === 'subtasks' ? t('tasks.addSubtask') : t('tasks.addTodo')}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    if (subtaskMode === 'subtasks') {
                      addTodo()
                    } else {
                      addSimpleTodo()
                    }
                  }
                }}
              />
              {subtaskMode === 'subtasks' && task?.date && (
                <CustomDatePicker
                  value={newTodoDate}
                  onChange={setNewTodoDate}
                  placeholder={t('tasks.subtaskDateOptional')}
                  minDate={task.date}
                  iconOnly={true}
                  buttonClassName="!w-10 !h-10 !p-0 !rounded-xl"
                />
              )}
              <button
                onClick={subtaskMode === 'subtasks' ? addTodo : addSimpleTodo}
                disabled={!newTodo.trim()}
                className="w-10 h-10 flex-shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Список: подзадачи или простые todo */}
            {(() => {
              // Фильтруем todos в зависимости от режима
              const filteredTodos = subtaskMode === 'subtasks' 
                ? todos.filter(todo => !todo.isSimpleTodo) // Подзадачи: все, кроме простых todo
                : todos.filter(todo => todo.isSimpleTodo === true) // Простые todo: только с флагом isSimpleTodo
              
              if (filteredTodos.length === 0) return null
              
              return (
                <div className="space-y-2">
                  {filteredTodos.map((todo) => {
                  const isAnimating = animatingTodos.has(todo.id)
                  const wasDoneBefore = wasDoneBeforeAnimationRef.current.get(todo.id) ?? todo.done
                  const isFilling = !wasDoneBefore && todo.done // Filling: was not done, now done
                  const isUnfilling = wasDoneBefore && !todo.done // Unfilling: was done, now not done
                  return (
                    <div 
                      key={todo.id} 
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-all relative overflow-hidden cursor-pointer"
                      style={{
                        backgroundColor: todo.done ? '#F3F4F6' : 'transparent',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                      onMouseDown={(e) => {
                        // Always prevent backdrop click when clicking on todo card
                        e.stopPropagation()
                        e.preventDefault()
                        if (e.nativeEvent) {
                          e.nativeEvent.stopImmediatePropagation()
                        }
                      }}
                      onClick={async (e) => {
                        // Don't open subtask if clicking on interactive elements (checkbox, date picker, delete button)
                        const target = e.target as HTMLElement
                        const isInteractiveElement = target.closest('button, [role="button"], input, .custom-date-picker, .w-5.h-5, .rounded-full')
                        if (isInteractiveElement) {
                          e.stopPropagation()
                          e.preventDefault()
                          return
                        }
                        
                        // В режиме "todos" - редактируем текст при клике
                        if (subtaskMode === 'todos') {
                          if (!todo.done) {
                            startEditingTodo(todo.id, todo.text)
                          }
                          return
                        }
                        
                        // В режиме "subtasks" - конвертируем в задачу или открываем
                        if (!todo.isTask) {
                          // First time - convert to task
                          convertToTask(todo)
                        } else if (todo.taskId) {
                          // Already converted - open existing task
                          try {
                            const { data, error } = await supabase
                              .from('tasks_items')
                              .select('*')
                              .eq('id', todo.taskId)
                              .single()
                            
                            if (error) {
                              console.error('❌ Error loading task:', error)
                              return
                            }
                            
                            if (data && onOpenTask) {
                              onOpenTask(data as Task)
                            }
                          } catch (err) {
                            console.error('❌ Error loading subtask:', err)
                          }
                        }
                      }}
                    >
                      {/* Анимация заполнения/опустошения карточки серым цветом */}
                      {isAnimating && (
                        <div 
                          className="absolute inset-0 bg-gray-100 rounded-xl"
                          style={{ 
                            animation: isFilling 
                              ? 'todoBackgroundFill 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                              : isUnfilling 
                                ? 'todoBackgroundUnfill 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                : 'none',
                            zIndex: 0
                          }}
                        />
                      )}
                      
                      {/* Круглый чекбокс с анимацией */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          if (subtaskMode === 'todos') {
                            toggleSimpleTodo(todo.id)
                          } else {
                            toggleTodo(todo.id)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                        className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 relative z-10"
                        style={{
                          backgroundColor: todo.done ? '#000000' : 'transparent',
                          borderColor: todo.done ? '#000000' : '#D1D5DB',
                          animation: isAnimating ? 'checkboxPress 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                        }}
                      >
                        {todo.done && (
                          <Check 
                            className="w-3 h-3 text-white" 
                            strokeWidth={3}
                            style={{
                              animation: isAnimating ? 'checkmarkBounce 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Название - редактируемое в режиме todos, обычное в режиме subtasks */}
                      <div className="flex-1 min-w-0 relative z-10">
                        {subtaskMode === 'todos' && editingTodoId === todo.id ? (
                          <input
                            type="text"
                            value={editingTodoText}
                            onChange={(e) => setEditingTodoText(e.target.value)}
                            onBlur={() => saveTodoEdit(todo.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveTodoEdit(todo.id)
                              } else if (e.key === 'Escape') {
                                cancelTodoEdit()
                              }
                            }}
                            autoFocus
                            className="text-sm bg-transparent border-none outline-none w-full"
                            style={{ 
                              textDecoration: todo.done ? 'line-through' : 'none', 
                              opacity: todo.done ? 0.6 : 1
                            }}
                          />
                        ) : (
                          <div
                            className="text-sm cursor-pointer"
                            style={{ 
                              textDecoration: todo.done ? 'line-through' : 'none', 
                              opacity: todo.done ? 0.6 : 1
                            }}
                          >
                            {todo.text}
                          </div>
                        )}
                      </div>
                      
                      {/* Справа: дата и иконка мусорника (только для подзадач) */}
                      <div className="flex items-center gap-2 relative z-10">
                        {subtaskMode === 'subtasks' && (
                          <>
                            {/* Дата - текст с датой (если есть) и иконка календаря */}
                            <div className="flex items-center gap-1.5">
                              {todo.date && (
                                <span className="text-xs text-gray-500">
                                  {format(parseISO(todo.date), 'dd.MM.yyyy')}
                                </span>
                              )}
                              <div onClick={(e) => e.stopPropagation()} className="relative">
                                <CustomDatePicker
                                  value={todo.date || ''}
                                  onChange={(newDate) => updateTodoDate(todo.id, newDate)}
                                  placeholder={t('tasks.subtaskDateOptional')}
                                  minDate={task?.date || undefined}
                                  iconOnly={true}
                                  buttonClassName="!p-1.5 hover:bg-gray-100 rounded-lg transition-colors !border-0 !bg-transparent !w-auto !h-auto !min-w-0 !min-h-0"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Иконка мусорника */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation()
                            }
                            if (subtaskMode === 'todos') {
                              removeSimpleTodo(todo.id)
                            } else {
                              removeTodo(todo.id)
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation()
                            }
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation()
                            }
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              )
            })()}
          </div>
          )}

          {/* Простой todo list для подзадач */}
          {isSubtask && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">To-do list</label>
              
              {/* Input для добавления нового todo */}
              <div className="flex gap-2">
                <CoreInput
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder={t('tasks.addTodo')}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addSimpleTodo()}
                />
                <button
                  onClick={addSimpleTodo}
                  disabled={!newTodo.trim()}
                  className="w-10 h-10 flex-shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {/* Список todos - только чекбоксы */}
              {todos.length > 0 && (
                <div className="space-y-2">
                  {todos.map((todo) => {
                    const isAnimating = animatingTodos.has(todo.id)
                    const wasDoneBefore = wasDoneBeforeAnimationRef.current.get(todo.id) ?? todo.done
                    const isFilling = !wasDoneBefore && todo.done
                    const isUnfilling = wasDoneBefore && !todo.done
                    return (
                      <div 
                        key={todo.id} 
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-all relative overflow-hidden"
                        style={{
                          backgroundColor: todo.done ? '#F3F4F6' : 'transparent'
                        }}
                      >
                        {/* Анимация заполнения/опустошения */}
                        {isAnimating && (
                          <div 
                            className="absolute inset-0 bg-gray-100 rounded-xl"
                            style={{ 
                              animation: isFilling 
                                ? 'todoBackgroundFill 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                                : isUnfilling 
                                  ? 'todoBackgroundUnfill 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                  : 'none',
                              zIndex: 0
                            }}
                          />
                        )}
                        
                        {/* Чекбокс */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSimpleTodo(todo.id)
                          }}
                          className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 relative z-10"
                          style={{
                            backgroundColor: todo.done ? '#000000' : 'transparent',
                            borderColor: todo.done ? '#000000' : '#D1D5DB',
                            animation: isAnimating ? 'checkboxPress 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                          }}
                        >
                          {todo.done && (
                            <Check 
                              className="w-3 h-3 text-white" 
                              strokeWidth={3}
                              style={{
                                animation: isAnimating ? 'checkmarkBounce 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                              }}
                            />
                          )}
                        </div>
                        
                        {/* Текст или инпут для редактирования */}
                        <div className="flex-1 min-w-0 relative z-10">
                          {editingTodoId === todo.id ? (
                            <input
                              type="text"
                              value={editingTodoText}
                              onChange={(e) => setEditingTodoText(e.target.value)}
                              onBlur={() => saveTodoEdit(todo.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveTodoEdit(todo.id)
                                } else if (e.key === 'Escape') {
                                  cancelTodoEdit()
                                }
                              }}
                              autoFocus
                              className="text-sm bg-transparent border-none outline-none w-full"
                              style={{ 
                                textDecoration: todo.done ? 'line-through' : 'none', 
                                opacity: todo.done ? 0.6 : 1
                              }}
                            />
                          ) : (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!todo.done) {
                                  startEditingTodo(todo.id, todo.text)
                                }
                              }}
                              className="text-sm cursor-text"
                              style={{ 
                                textDecoration: todo.done ? 'line-through' : 'none', 
                                opacity: todo.done ? 0.6 : 1
                              }}
                            >
                              {todo.text}
                            </div>
                          )}
                        </div>
                        
                        {/* Кнопка удаления */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeSimpleTodo(todo.id)
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative z-10"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className="w-[40%] bg-[#F8F8F8] p-0 flex flex-col space-y-4 pt-6">
          {/* Status - первый блок */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.status')}</div>
            <div className="relative rounded-xl h-10 flex p-1" style={{ backgroundColor: '#F8F8F8' }}>
              <div 
                className={`absolute top-1 bottom-1 w-1/2 bg-black rounded-lg transition-transform duration-200 ${
                  status === 'open' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                onClick={async () => {
                  const newStatus = 'open'
                  // If this is a subtask, immediately update board (same as for dates)
                  if (task && (task as any)?.parent_task_id) {
                    isUpdatingStatusRef.current = true // Set flag to prevent auto-save
                    setStatus(newStatus)
                    await updateSubtaskStatus(newStatus)
                  } else {
                    // For main tasks, just save normally
                    setStatus(newStatus)
                    await save(false, false)
                  }
                }}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  status === 'open'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.open')}
              </button>
              <button
                onClick={async () => {
                  const newStatus = 'closed'
                  // If this is a subtask, immediately update board (same as for dates)
                  if (task && (task as any)?.parent_task_id) {
                    isUpdatingStatusRef.current = true // Set flag to prevent auto-save
                    setStatus(newStatus)
                    await updateSubtaskStatus(newStatus)
                  } else {
                    // For main tasks, just save normally
                    setStatus(newStatus)
                    await save(false, false)
                  }
                }}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  status === 'closed'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.closed')}
              </button>
            </div>
          </section>

          {/* Priority - переключатель как у статуса */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.priority')}</div>
            <div className="relative rounded-xl h-10 flex p-1" style={{ backgroundColor: '#F8F8F8' }}>
              <div 
                className="absolute top-1 bottom-1 rounded-lg bg-black transition-[left] duration-200 ease-out"
                style={{
                  width: 'calc((100% - 0.5rem) / 3)',
                  left:
                    priority === 'low'
                      ? '0.25rem'
                      : priority === 'normal'
                        ? 'calc(0.25rem + (100% - 0.5rem) / 3)'
                        : 'calc(0.25rem + 2 * (100% - 0.5rem) / 3)',
                }}
              />
              <button
                onClick={() => setPriority('low')}
                className={`relative flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  priority === 'low'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.lowPriority')}
              </button>
              <button
                onClick={() => setPriority('normal')}
                className={`relative flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  priority === 'normal'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.normalPriority')}
              </button>
              <button
                onClick={() => setPriority('high')}
                className={`relative flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  priority === 'high'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.highPriority')}
              </button>
            </div>
          </section>

          {/* Parent Task Info - only show if this is a subtask */}
          {(task as any)?.parent_task_id && (() => {
            const parentTaskTitle = (task as any)?.parent_task_title || (task as any)?.parent_task?.title
            return (
            <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
              <div className="text-sm font-medium text-gray-700">{t('tasks.subtask')}</div>
              <div className="text-sm text-gray-600">
                {parentTaskTitle 
                  ? `${t('tasks.subtaskOf')}: ${parentTaskTitle}`
                  : t('tasks.subtaskHint')
                }
              </div>
            </section>
            )
          })()}
          
          {/* Project - hide for subtasks */}
          {!isSubtask && (
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.project')}</div>
            <ProjectDropdown
              value={projectId}
              projects={projects}
              onChange={setProjectId}
            />
          </section>
          )}

          {/* Date */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.date')}</div>
            <DateDropdown
              value={date}
              onChange={async (newDate) => {
                // Validate date if this is a subtask
                if (isSubtask && newDate && parentTaskDate) {
                  const subtaskDate = parseISO(newDate)
                  const parentDate = parseISO(parentTaskDate)
                  
                  // Check if subtask date is before parent date
                  if (isAfter(parentDate, subtaskDate) && !isEqual(parentDate, subtaskDate)) {
                    await alert(t('tasks.subtaskDateValidation'), t('common.validationError'))
                    return
                  }
                }
                setDate(newDate)
              }}
            />
          </section>

          {/* Tag */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.tag')}</div>
            <TagTimeInput
              tag={tag}
              onTagChange={setTag}
              scheduledTime={scheduledTime}
              onScheduledTimeChange={setScheduledTime}
              placeholder={t('tasks.tagExample')}
            />
          </section>

          {/* Recurring Task Block */}
          {task && (
            <RecurringTaskBlock 
              task={task} 
              onUpdateRecurrence={onUpdateRecurrence || (() => Promise.resolve())}
            />
          )}

        </aside>
      </div>
      )}

      {/* Модальное окно подтверждения удаления подзадачи */}
      <UnifiedModal
        size="sm"
        open={todoToDelete !== null}
        onClose={() => setTodoToDelete(null)}
        title={t('tasks.deleteSubtask')}
        variant="center"
        footer={
          <div className="flex items-center justify-end gap-3">
            <ModalButton
              variant="secondary"
              onClick={() => setTodoToDelete(null)}
            >
              {t('actions.cancel')}
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={confirmDeleteTodo}
            >
              {t('actions.delete')}
            </ModalButton>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('tasks.deleteSubtaskWarning')}
          </p>
          {todoToDelete && (() => {
            const todo = todos.find(t => t.id === todoToDelete)
            return todo ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{todo.text}</p>
              </div>
            ) : null
          })()}
        </div>
      </UnifiedModal>
    </SideModal>
    </div>
  )
}
