import React, { useState, useEffect } from 'react'
import { LayoutGrid, List, GanttChart } from 'lucide-react'

type ViewMode = 'weekly' | 'list' | 'gantt'

interface TasksViewSelectorProps {
  currentView?: ViewMode
  onViewChange?: (view: ViewMode) => void
}

export default function TasksViewSelector({ currentView, onViewChange }: TasksViewSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(currentView || 'weekly')

  // Sync with external currentView prop
  useEffect(() => {
    if (currentView) {
      setViewMode(currentView)
    }
  }, [currentView])

  // Listen for view mode changes from Tasks page
  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent) => {
      const newMode = event.detail as ViewMode
      setViewMode(newMode)
    }
    
    window.addEventListener('tasks-view-mode-changed', handleViewModeChange as EventListener)
    return () => {
      window.removeEventListener('tasks-view-mode-changed', handleViewModeChange as EventListener)
    }
  }, [])

  const handleViewSelect = (view: ViewMode) => {
    setViewMode(view)
    if (onViewChange) {
      onViewChange(view)
    }
    // Dispatch event to Tasks page
    window.dispatchEvent(new CustomEvent('tasks-view-mode-select', { detail: view }))
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => handleViewSelect('weekly')}
        className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all ${
          viewMode === 'weekly'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-label="Weekly View"
        title="Weekly View"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleViewSelect('list')}
        className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all ${
          viewMode === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-label="Board View"
        title="Board View"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleViewSelect('gantt')}
        className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all ${
          viewMode === 'gantt'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-label="Gantt View"
        title="Gantt View"
      >
        <GanttChart className="w-4 h-4" />
      </button>
    </div>
  )
}

