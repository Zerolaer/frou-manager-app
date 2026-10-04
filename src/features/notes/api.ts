/* src/features/notes/api.ts */
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/monitoring';
import type { Note } from './types';

/**
 * Adjust this if your project already exports a Supabase client.
 * For example: import { supabase } from '@/lib/supabaseClient'
 */
export type SortKey = 'updated_at' | 'created_at' | 'title';

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false
  return error.code === '42703' || /column .* does not exist/i.test(error.message || '')
}

export async function listNotes(query: string, sort: SortKey = 'updated_at', folderId?: string | null) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return [] as Note[]

  let req = supabase.from('notes').select('*').eq('user_id', userId)

  if (query?.trim()) {
    req = req.ilike('title', `%${query.trim()}%`)
  }

  // Sentinels: ALL = everything, UNFILED = folder_id IS NULL.
  if (folderId && folderId !== 'ALL') {
    if (folderId === 'UNFILED') {
      req = req.is('folder_id', null)
    } else {
      req = req.eq('folder_id', folderId)
    }
  }

  const withPinOrder = req
    .order('pinned', { ascending: false })
    .order(sort, { ascending: sort === 'title' })
    .limit(500)

  let { data, error } = await withPinOrder

  if (error && isMissingColumnError(error)) {
    const fallback = await req.order(sort, { ascending: sort === 'title' }).limit(500)
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    logger.error('API listNotes error:', error)
    throw error
  }

  logger.debug('listNotes fetched', { count: data?.length })
  return (data ?? []) as Note[]
}

export async function createNote(payload: Partial<Note>) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('Требуется вход в аккаунт')

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: payload.title ?? '',
      content: payload.content ?? '',
      pinned: payload.pinned ?? false,
      folder_id: payload.folder_id ?? null,
      user_id: userId,
    })
    .select()
    .single();
  
  if (error) {
    logger.error('API createNote error:', error);
    throw error;
  }
  
  logger.debug('API createNote success', { id: data.id });
  return data as Note;
}

export async function updateNote(id: string, changes: Partial<Note>) {
  const { user_id: _userId, id: _id, created_at: _created, ...safeChanges } = changes as Partial<Note> & {
    user_id?: string
    created_at?: string
  }
  const { data, error } = await supabase
    .from('notes')
    .update(safeChanges)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error('API updateNote error:', error);
    throw error;
  }
  
  logger.debug('API updateNote success', { id });
  return data as Note;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean) {
  return updateNote(id, { pinned });
}
