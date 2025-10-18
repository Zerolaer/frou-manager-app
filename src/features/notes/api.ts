/* src/features/notes/api.ts */
import { supabase } from '@/lib/supabaseClient';
import type { Note } from './types';

/**
 * Adjust this if your project already exports a Supabase client.
 * For example: import { supabase } from '@/lib/supabaseClient'
 */
export type SortKey = 'updated_at' | 'created_at' | 'title';

export async function listNotes(query: string, sort: SortKey = 'updated_at', folderId?: string | null) {
  let req = supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order(sort, { ascending: sort === 'title' }) as any;

  if (query?.trim()) {
    // Simple title search; for full-text, consider pg tsvector
    req = req.ilike('title', `%${query.trim()}%`);
  }

  // Filter by folder
  if (folderId) {
    if (folderId === 'ALL') {
      // Show all notes (no additional filter)
    } else {
      req = req.eq('folder_id', folderId);
    }
  } else {
    // Show notes without folder (folder_id is null)
    req = req.is('folder_id', null);
  }

  const { data, error } = await req;
  if (error) throw error;
  
  console.log('📚 listNotes fetched:', { 
    count: data?.length, 
    firstNote: data?.[0] ? {
      id: data[0].id,
      title: data[0].title,
      hasContent: !!data[0].content,
      contentLength: data[0].content?.length
    } : null
  });
  
  return data as Note[];
}

export async function createNote(payload: Partial<Note>) {
  console.log('➕ API createNote called:', { 
    hasContent: !!payload.content, 
    contentLength: payload.content?.length,
    payload 
  });
  
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: payload.title ?? '',
      content: payload.content ?? '',
      pinned: payload.pinned ?? false,
      folder_id: payload.folder_id ?? null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ API createNote error:', error);
    throw error;
  }
  
  console.log('✅ API createNote success:', data.id);
  return data as Note;
}

export async function updateNote(id: string, changes: Partial<Note>) {
  console.log('🔄 API updateNote called:', { 
    id, 
    hasContent: !!changes.content, 
    contentLength: changes.content?.length,
    changes 
  });
  
  const { data, error } = await supabase
    .from('notes')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ API updateNote error:', error);
    throw error;
  }
  
  console.log('✅ API updateNote success:', { id, updatedData: data });
  return data as Note;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean) {
  return updateNote(id, { pinned });
}
