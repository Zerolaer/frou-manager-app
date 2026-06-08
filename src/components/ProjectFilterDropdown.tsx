import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Folder } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import type { Project } from '@/types/shared'

interface ProjectFilterDropdownProps {
  projects: Project[]
  selectedProjectIds: string[]
  onSelectionChange: (projectIds: string[]) => void
  disabled?: boolean
}

export default function ProjectFilterDropdown({
  projects,
  selectedProjectIds,
  onSelectionChange,
  disabled = false
}: ProjectFilterDropdownProps) {
  const { t } = useSafeTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Use timeout to avoid immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true)
      }, 0)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [isOpen])

  const handleToggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onSelectionChange(selectedProjectIds.filter(id => id !== projectId))
    } else {
      onSelectionChange([...selectedProjectIds, projectId])
    }
  }

  const handleSelectAll = () => {
    const allProjectIds = projects.map(p => p.id)
    onSelectionChange(allProjectIds)
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const allSelected = selectedProjectIds.length === projects.length && projects.length > 0
  const noneSelected = selectedProjectIds.length === 0

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setIsOpen(!isOpen)
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-button bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 flex-shrink-0 whitespace-nowrap`}
        aria-label={t('tasks.filterProjects')}
      >
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4" />
          <span>
            {noneSelected 
              ? t('tasks.noProjectsSelected')
              : allSelected 
              ? t('tasks.allProjectsSelected') 
              : t('tasks.projectsSelected', { count: selectedProjectIds.length })}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto p-2 w-max min-w-0 max-w-[min(320px,calc(100vw-16px))]"
            style={{
              top: '100%',
              marginTop: '8px',
              right: '0',
              width: 'max-content',
              animation: 'dropdownAppear 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: 'top'
            }}
          >
            {/* Select/Deselect all button */}
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              style={{ fontSize: '13px' }}
              className="w-full px-2 py-3 text-left transition-colors text-gray-700 hover:bg-gray-100 border-b border-gray-100 mb-1"
            >
              {allSelected ? t('common.deselectAll') : t('common.selectAll')}
            </button>

            {/* Projects list */}
            {projects.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-gray-500">
                {t('tasks.noProjects')}
              </div>
            ) : (
              projects.map((project) => {
                const isSelected = selectedProjectIds.includes(project.id)
                return (
                  <button
                    key={project.id}
                    onClick={() => handleToggleProject(project.id)}
                    style={{ fontSize: '13px' }}
                    className="w-full px-2 py-3 text-left transition-colors text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    {/* Checkbox - circular, black/white */}
                    <div
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        borderRadius: '999px',
                        backgroundColor: isSelected ? '#000000' : '#ffffff',
                        border: '2px solid #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isSelected && (
                        <svg 
                          width="8" 
                          height="8" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="white" 
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      )}
                    </div>

                    {/* Project name */}
                    <span className="flex-1 truncate">
                      {project.name}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

