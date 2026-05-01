import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, FolderKanban, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { PageErrorBoundary } from '@/components/ErrorBoundaries'
import { CanvasBoard } from '@/components/canvas/CanvasBoard'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import * as canvasApi from '@/features/canvas/api'
import type { CanvasProjectSummary } from '@/features/canvas/api'
import type { CanvasBoardState, CanvasProjectRow } from '@/features/canvas/types'
import { normalizeBoardState } from '@/features/canvas/types'
import { logger } from '@/lib/monitoring'
import '@/canvas.css'

const PROJECTS_PANEL_STORAGE_KEY = 'frovo.canvas.projectsPanelOpen'

function readProjectsPanelOpen(): boolean {
  try {
    const v = localStorage.getItem(PROJECTS_PANEL_STORAGE_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

function CanvasProjectsShell() {
  const { t } = useSafeTranslation()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { userId } = useSupabaseAuth()

  const [summaries, setSummaries] = useState<CanvasProjectSummary[]>([])
  const [activeProject, setActiveProject] = useState<CanvasProjectRow | null>(
    null
  )
  const [loadingList, setLoadingList] = useState(true)
  const [loadingProject, setLoadingProject] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectsPanelOpen, setProjectsPanelOpen] = useState(readProjectsPanelOpen)
  const latestBoardRef = useRef<Map<string, CanvasBoardState>>(new Map())
  const persistQueueRef = useRef<
    Map<
      string,
      {
        inFlight: boolean
        pendingState: CanvasBoardState | null
      }
    >
  >(new Map())

  useEffect(() => {
    try {
      localStorage.setItem(
        PROJECTS_PANEL_STORAGE_KEY,
        projectsPanelOpen ? '1' : '0'
      )
    } catch {
      /* ignore */
    }
  }, [projectsPanelOpen])

  const refreshSummaries = useCallback(async () => {
    if (!userId) return
    setError(null)
    try {
      const list = await canvasApi.listCanvasProjectsSummary()
      setSummaries(list)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(e)
      setError(msg)
      logger.error('canvas list', e)
    } finally {
      setLoadingList(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLoadingList(false)
      return
    }
    refreshSummaries()
  }, [userId, refreshSummaries])

  useEffect(() => {
    if (!userId || !projectId) {
      setActiveProject(null)
      setLoadingProject(false)
      return
    }
    let cancelled = false
    setLoadingProject(true)
    ;(async () => {
      try {
        const row = await canvasApi.getCanvasProject(projectId)
        if (cancelled) return
        if (row) {
          const localBoard = latestBoardRef.current.get(row.id)
          setActiveProject(
            localBoard
              ? { ...row, board_state: localBoard }
              : row
          )
        } else {
          setActiveProject(null)
          navigate('/canvas', { replace: true })
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setActiveProject(null)
        }
      } finally {
        if (!cancelled) setLoadingProject(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, userId, navigate])

  useEffect(() => {
    if (loadingList) return
    if (projectId) return
    if (summaries.length === 0) return
    navigate(`/canvas/${summaries[0].id}`, { replace: true })
  }, [loadingList, projectId, summaries, navigate])

  const handleCreateProject = async () => {
    try {
      const row = await canvasApi.createCanvasProject(t('canvas.newProjectName'))
      setSummaries((prev) => [
        { id: row.id, name: row.name, updated_at: row.updated_at },
        ...prev,
      ])
      navigate(`/canvas/${row.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      logger.error('create canvas project', e)
    }
  }

  const flushPersistQueue = useCallback(async (projectId: string) => {
    const entry = persistQueueRef.current.get(projectId)
    if (!entry || entry.inFlight || !entry.pendingState) return

    const stateToSave = entry.pendingState
    entry.pendingState = null
    entry.inFlight = true

    try {
      await canvasApi.updateCanvasProjectBoard(projectId, stateToSave)
    } catch (e) {
      logger.error('canvas persist', e)
      // Не теряем последний снапшот при сетевой ошибке: оставляем его в очереди.
      if (!entry.pendingState) {
        entry.pendingState = stateToSave
      }
      window.setTimeout(() => {
        void flushPersistQueue(projectId)
      }, 1500)
    } finally {
      entry.inFlight = false
      if (entry.pendingState) {
        void flushPersistQueue(projectId)
      }
    }
  }, [])

  const handlePersistBoard = useCallback(
    (id: string, state: CanvasBoardState) => {
      latestBoardRef.current.set(id, state)
      setActiveProject((prev) =>
        prev?.id === id ? { ...prev, board_state: state } : prev
      )
      const queue = persistQueueRef.current
      const entry = queue.get(id) ?? { inFlight: false, pendingState: null }
      entry.pendingState = state
      queue.set(id, entry)
      void flushPersistQueue(id)
    },
    [flushPersistQueue]
  )

  const handleDeleteProject = async (id: string) => {
    try {
      await canvasApi.deleteCanvasProject(id)
      const next = summaries.filter((p) => p.id !== id)
      setSummaries(next)
      if (projectId === id) {
        setActiveProject(null)
        if (next.length) navigate(`/canvas/${next[0].id}`, { replace: true })
        else navigate('/canvas', { replace: true })
      }
    } catch (e) {
      logger.error('delete canvas project', e)
    }
  }

  if (!userId) {
    return (
      <div className="p-6 text-gray-600">{t('canvas.loginRequired')}</div>
    )
  }

  const empty = !loadingList && summaries.length === 0

  const projectsDock = (
    <div
      className={`canvas-projects-dock ${projectsPanelOpen ? 'is-open' : 'is-closed'}`}
      aria-label={t('canvas.projectsAria')}
    >
      {!projectsPanelOpen ? (
        <button
          type="button"
          className="canvas-projects-dock-fab"
          onClick={() => setProjectsPanelOpen(true)}
          title={t('canvas.openProjectsPanel')}
          aria-expanded={false}
        >
          <FolderKanban className="w-5 h-5" aria-hidden />
        </button>
      ) : (
        <div
          id="canvas-projects-panel"
          className="canvas-projects-dock-panel"
          role="region"
          aria-label={t('canvas.projects')}
        >
          <div className="canvas-projects-dock-header">
            <h2 className="canvas-projects-dock-title">
              {t('canvas.projects')}
            </h2>
            <div className="canvas-projects-dock-header-actions">
              <button
                type="button"
                onClick={handleCreateProject}
                className="canvas-projects-dock-icon-btn"
                title={t('canvas.newProject')}
              >
                <Plus className="w-5 h-5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="canvas-projects-dock-icon-btn"
                onClick={() => setProjectsPanelOpen(false)}
                title={t('canvas.collapseProjectsPanel')}
                aria-expanded={true}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>

          <nav className="canvas-project-list">
            {loadingList && (
              <p className="canvas-project-list-hint">
                {t('canvas.loadingProjects')}
              </p>
            )}
            {summaries.map((p) => (
              <div
                key={p.id}
                className={`canvas-project-row ${projectId === p.id ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="canvas-project-link"
                  onClick={() => navigate(`/canvas/${p.id}`)}
                >
                  <span className="truncate">{p.name}</span>
                </button>
                <button
                  type="button"
                  className="canvas-project-delete"
                  title={t('canvas.deleteProject')}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProject(p.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </nav>
          <div className="canvas-project-sidebar-footer">
            <button
              type="button"
              onClick={handleCreateProject}
              className="canvas-projects-dock-primary-btn"
            >
              <Plus className="w-4 h-4" strokeWidth={2} aria-hidden />
              {t('canvas.newProject')}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="canvas-project-layout">
      <main className="canvas-project-main canvas-project-main--bleed">
        {error && (
          <div className="canvas-project-error-banner">
            {error}
          </div>
        )}

        {empty ? (
          <div className="canvas-project-empty canvas-project-empty--fullbleed">
            <FolderOpen className="w-14 h-14 text-gray-300" aria-hidden />
            <p className="text-gray-600 text-center max-w-sm">
              {t('canvas.noProjects')}
            </p>
            <button
              type="button"
              onClick={handleCreateProject}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              {t('canvas.createFirst')}
            </button>
          </div>
        ) : projectId && loadingProject ? (
          <div className="canvas-project-loading">{t('canvas.loadingBoard')}</div>
        ) : activeProject && projectId ? (
          <div className="canvas-project-board-wrap">
            <CanvasBoard
              key={activeProject.id}
              projectId={activeProject.id}
              initialBoard={normalizeBoardState(activeProject.board_state)}
              onPersist={handlePersistBoard}
            />
          </div>
        ) : null}
      </main>

      {projectsDock}
    </div>
  )
}

export default function CanvasPage() {
  return (
    <PageErrorBoundary
      pageName="Canvas"
      onError={(error, errorInfo) => {
        logger.error('Canvas page error:', { error, errorInfo })
      }}
    >
      <CanvasProjectsShell />
    </PageErrorBoundary>
  )
}
