import React, { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useDebounce } from '@/hooks/useDebounce'
import type { TaskItem } from '@/types/shared'

interface TaskSearchModalProps {
  open: boolean
  onClose: () => void
  tasks: Record<string, TaskItem[]>
  onTaskSelect: (task: TaskItem) => void
}

export default function TaskSearchModal({
  open,
  onClose,
  tasks,
  onTaskSelect
}: TaskSearchModalProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Flatten all tasks for search
  const allTasks = useMemo(() => {
    const result: TaskItem[] = []
    Object.values(tasks).forEach(dayTasks => {
      result.push(...dayTasks)
    })
    return result
  }, [tasks])

  // Filter tasks by search query (using debounced value)
  const filteredTasks = useMemo(() => {
    if (!debouncedQuery.trim()) return []

    const query = debouncedQuery.toLowerCase()
    
    return allTasks.filter(task => {
      // Search in title
      if (task.title.toLowerCase().includes(query)) return true
      
      // Search in description
      if (task.description?.toLowerCase().includes(query)) return true
      
      // Search in tag
      if (task.tag?.toLowerCase().includes(query)) return true
      
      // Search in todos
      if (task.todos?.some(todo => todo.text.toLowerCase().includes(query))) return true
      
      return false
    }).slice(0, 50) // Limit to 50 results
  }, [allTasks, debouncedQuery])

  const handleTaskClick = (task: TaskItem) => {
    onTaskSelect(task)
    onClose()
    setSearchQuery('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-5 h-5 text-gray-700" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tasks.searchPlaceholder') || 'Поиск задач...'}
              className="flex-1 text-lg font-medium outline-none"
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4">
          {!searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">{t('tasks.startTypingToSearch') || 'Начните печатать для поиска...'}</p>
            </div>
          )}

          {searchQuery.trim() && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">{t('tasks.noResults') || 'Ничего не найдено'}</p>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                {t('tasks.foundResults', { count: filteredTasks.length }) || `Найдено: ${filteredTasks.length}`}
              </p>
              
              {filteredTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {task.date && (
                          <span>
                            📅 {format(new Date(task.date), 'd MMM yyyy')}
                          </span>
                        )}
                        
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                        
                        {task.project_name && (
                          <span>🗂️ {task.project_name}</span>
                        )}
                        
                        {task.todos && task.todos.length > 0 && (
                          <span>
                            ✓ {task.todos.filter(t => t.done).length}/{task.todos.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

