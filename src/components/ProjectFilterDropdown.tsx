import React from 'react'
import { ChevronDown } from 'lucide-react'
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
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`subheader-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 flex-shrink-0 whitespace-nowrap ${
          disabled
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
        }`}
        aria-label={t('tasks.filterProjects')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>
          {noneSelected 
            ? t('tasks.noProjectsSelected')
            : allSelected 
            ? t('tasks.allProjectsSelected') 
            : t('tasks.projectsSelected', { count: selectedProjectIds.length })}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto p-2"
            style={{
              top: '100%',
              marginTop: '8px',
              right: '0',
              minWidth: '240px',
              width: 'auto',
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

