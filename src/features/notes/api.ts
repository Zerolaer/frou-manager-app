/* src/features/notes/api.ts */
import { supabase } from '@/lib/supabaseClient';
import type { Note } from './types';

/**
 * Adjust this if your project already exports a Supabase client.
 * For example: import { supabase } from '@/lib/supabaseClient'
 */
export type SortKey = 'updated_at' | 'created_at' | 'title';

export async function listNotes(query: string, sort: SortKey = 'updated_at') {
  let req = supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order(sort, { ascending: sort === 'title' }) as any;

  if (query?.trim()) {
    // Simple title search; for full-text, consider pg tsvector
    req = req.ilike('title', `%${query.trim()}%`);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data as Note[];
}

export async function createNote(payload: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: payload.title ?? '',
      content: payload.content ?? '',
      pinned: payload.pinned ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, changes: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean) {
  return updateNote(id, { pinned });
}
