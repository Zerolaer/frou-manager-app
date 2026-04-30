import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/monitoring'
import type { CanvasBoardState, CanvasProjectRow } from './types'
import { defaultBoardState, normalizeBoardState } from './types'

/** Таблица пока не в сгенерированных типах Supabase — безопасный доступ через клиент */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any

export type CanvasProjectSummary = {
  id: string
  name: string
  updated_at: string
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Требуется вход в аккаунт')
  }
  return user.id
}

export async function listCanvasProjectsSummary(): Promise<
  CanvasProjectSummary[]
> {
  const { data, error } = await db()
    .from('canvas_projects')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    logger.error('listCanvasProjectsSummary', error)
    throw error
  }

  return (data ?? []) as CanvasProjectSummary[]
}

export async function getCanvasProject(
  id: string
): Promise<CanvasProjectRow | null> {
  const { data, error } = await db()
    .from('canvas_projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logger.error('getCanvasProject', error)
    throw error
  }
  if (!data) return null

  return {
    ...data,
    board_state: normalizeBoardState(data.board_state),
  } as CanvasProjectRow
}

export async function createCanvasProject(name?: string): Promise<CanvasProjectRow> {
  const userId = await requireUserId()
  const { data, error } = await db()
    .from('canvas_projects')
    .insert({
      user_id: userId,
      name: name?.trim() || 'Без названия',
      board_state: defaultBoardState(),
    })
    .select()
    .single()

  if (error) {
    logger.error('createCanvasProject', error)
    throw error
  }

  return {
    ...data,
    board_state: normalizeBoardState(data.board_state),
  } as CanvasProjectRow
}

export async function updateCanvasProjectBoard(
  id: string,
  boardState: CanvasBoardState
): Promise<void> {
  const { error } = await db()
    .from('canvas_projects')
    .update({
      board_state: boardState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    logger.error('updateCanvasProjectBoard', error)
    throw error
  }
}

export async function updateCanvasProjectName(
  id: string,
  name: string
): Promise<void> {
  const { error } = await db()
    .from('canvas_projects')
    .update({
      name: name.trim() || 'Без названия',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    logger.error('updateCanvasProjectName', error)
    throw error
  }
}

export async function deleteCanvasProject(id: string): Promise<void> {
  const { error } = await db().from('canvas_projects').delete().eq('id', id)
  if (error) {
    logger.error('deleteCanvasProject', error)
    throw error
  }
}
