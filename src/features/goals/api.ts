import { supabase } from '@/lib/supabaseClient'

export type GoalStatus = 'active' | 'completed'

export type Goal = {
  id: number
  user_id: string
  title: string
  description?: string | null
  progress: number
  status: GoalStatus
  target_amount?: number | null
  current_amount?: number | null
  deadline?: string | null
  created_at: string
}

export type GoalUpsert = {
  title: string
  description?: string | null
  progress?: number
  deadline?: string | null
}

const table = 'goals'

interface GoalRow {
  id: number
  user_id: string
  title: string
  notes?: string | null
  target_amount?: number | null
  current_amount?: number | null
  deadline?: string | null
  created_at: string
}

function computeProgress(row: GoalRow): number {
  const tgt = Number(row.target_amount ?? 0)
  const cur = Number(row.current_amount ?? 0)
  if (tgt > 0) return Math.max(0, Math.min(100, (cur / tgt) * 100))
  return 0
}

function mapRow(row: GoalRow): Goal {
  const p = computeProgress(row)
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.notes ?? null,
    progress: p,
    status: p >= 100 ? 'completed' : 'active',
    target_amount: row.target_amount ?? null,
    current_amount: row.current_amount ?? null,
    deadline: row.deadline ?? null,
    created_at: row.created_at,
  }
}

export async function listGoals(): Promise<Goal[]> {
  try {
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      throw new Error('Не авторизован')
    }
    
    if (!user) {
      throw new Error('Пользователь не найден')
    }
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return (data ?? []).map(mapRow)
  } catch (err) {
    console.error('API: listGoals error', err)
    throw err
  }
}

export async function createGoal(g: GoalUpsert): Promise<Goal> {
  const p = Math.max(0, Math.min(100, Math.round(g.progress ?? 0)))

  // Проверяем аутентификацию
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Не авторизован')
  }

  const payload: Omit<GoalRow, 'id' | 'created_at'> = {
    user_id: user.id,
    title: g.title,
    notes: g.description ?? null,
    target_amount: 100,
    current_amount: p,
    deadline: g.deadline ?? null,
  }

  const { data, error } = await supabase.from(table).insert(payload).select().single()
  if (error) throw error
  return mapRow(data)
}

export async function updateGoal(id: string | number, g: GoalUpsert): Promise<Goal> {
  const patch: Partial<Pick<GoalRow, 'title' | 'notes' | 'deadline' | 'current_amount' | 'target_amount'>> = {
    title: g.title,
    notes: g.description ?? null,
    deadline: g.deadline ?? null,
  }
  if (typeof g.progress === 'number') {
    patch.current_amount = Math.max(0, Math.min(100, Math.round(g.progress)))
    patch.target_amount = 100
  }
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  if (error) throw error
  return mapRow(data)
}

export async function deleteGoal(id: string | number): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function completeGoal(id: string | number): Promise<Goal> {
  const { data, error } = await supabase
    .from(table)
    .update({ current_amount: 100, target_amount: 100 })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapRow(data)
}
