/* src/pages/Notes.tsx */
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSafeTranslation } from '@/utils/safeTranslation';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditorModal from '@/components/notes/NoteEditorModal';
import FolderSidebar from '@/components/FolderSidebar';
import NotesFilterModal, { type NotesFilters } from '@/components/NotesFilterModal';
import type { Note } from '@/features/notes/types';
import { createNote, deleteNote, listNotes, togglePin, updateNote } from '@/features/notes/api';
import { VirtualizedGrid } from '@/components/VirtualizedList';
import { PageErrorBoundary } from '@/components/ErrorBoundaries';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { downloadNotes } from '@/lib/notesExport';
import { logger } from '@/lib/monitoring';
import { supabase } from '@/lib/supabaseClient';
import { useModalConfirm } from '@/utils/modalConfirm';
import '@/notes.css';

type Folder = {
  id: string;
  name: string;
  color?: string;
};

function NotesPageContent() {
  const { t } = useSafeTranslation();
  const { userId } = useSupabaseAuth();
  const { confirm } = useModalConfirm();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadGeneration = useRef(0);
  const [foldersCollapsed, setFoldersCollapsed] = useState(() => {
    const saved = localStorage.getItem('frovo_folders_collapsed')
    return saved === 'true'
  });
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<NotesFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    const generation = ++loadGeneration.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listNotes('', 'updated_at', activeFolder ?? 'ALL');
      if (generation !== loadGeneration.current) return;
      setNotes(data ?? []);
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err);
      const nextError = new Error(message || t('notes.loadError'));
      setError(nextError);
      logger.error('Error loading notes:', err);
    } finally {
      if (generation === loadGeneration.current) setIsLoading(false);
    }
  }, [userId, activeFolder, t]);

  // Load folders
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        // Try with position first (if column exists)
        let query = supabase
          .from('notes_folders')
          .select('id, name, color');
        
        // Try to order by position, fallback to created_at if position doesn't exist
        const { data, error } = await query
          .order('created_at', { ascending: true });
        
        if (error) {
          logger.error('Error loading folders:', error);
          return;
        }
        
        if (data) {
          setFolders(data);
        }
      } catch (err) {
        logger.error('Error in folder loading:', err);
      }
    })();
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Create folder map for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach(folder => {
      map.set(folder.id, folder);
    });
    return map;
  }, [folders]);

  // Body class is now managed in App.tsx

  const handleSave = useCallback(async (draft: Partial<Note>, id?: string) => {
    try {
      if (!id) {
        // При создании используем folder_id из draft (выбранный в модальном окне)
        const created = await createNote(draft);
        setNotes((prev) => [created, ...prev]);
        logger.debug('Note created', { id: created.id });
      } else {
        const updated = await updateNote(id, draft);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        logger.debug('Note updated', { id });
      }
    } catch (error) {
      logger.error('Error saving note:', error);
    }
  }, []);

  // Автосохранение без уведомлений
  const handleAutoSave = useCallback(async (draft: Partial<Note>, id?: string) => {
    try {
      if (!id) {
        // При создании используем folder_id из draft (выбранный в модальном окне)
        const created = await createNote(draft);
        setNotes((prev) => [created, ...prev]);
        logger.debug('Note created');
      } else {
        const updated = await updateNote(id, draft);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        // НЕ показываем уведомление при автосохранении
      }
    } catch (error) {
      // Только логируем ошибку автосохранения, не показываем пользователю
      logger.error('Auto-save failed:', error);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      logger.debug('Note deleted');
    } catch (error) {
      logger.error('Error deleting note:', error);
    }
  }, []);

  const handleDeleteNote = useCallback(async (n: Note) => {
    await handleDelete(n.id);
  }, [handleDelete]);

  const handleTogglePin = useCallback(async (n: Note) => {
    try {
      const updated = await togglePin(n.id, !n.pinned);
      setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      logger.debug(n.pinned ? 'Pin removed' : 'Note pinned');
    } catch (error) {
      logger.error('Error toggling pin:', error);
    }
  }, []);

  const handleDuplicate = useCallback(async (n: Note) => {
    try {
      const duplicated = await createNote({
        title: `${n.title} (${t('notes.copy')})`,
        content: n.content,
        folder_id: n.folder_id,
        pinned: false
      });
      setNotes((prev) => [duplicated, ...prev]);
      logger.debug('Note duplicated');
    } catch (error) {
      logger.error('Error duplicating note:', error);
    }
  }, [t]);


  const handleEditNote = useCallback((note: Note) => {
    console.log('✏️ Opening note for editing:', { 
      id: note.id, 
      title: note.title,
      hasContent: !!note.content,
      contentLength: note.content?.length,
      content: note.content?.substring(0, 100)
    });
    setEditing(note);
    setModalOpen(true);
  }, []);

  // Export functionality
  const handleExportNotes = useCallback(async () => {
    const exportFormat = await confirm(
      t('notes.exportFormat'),
      t('notes.exportTitle')
    )
    
    const notesToExport = activeFolder === 'ALL' 
      ? notes 
      : notes.filter(n => n.folder_id === activeFolder)
    
    downloadNotes(notesToExport, exportFormat ? 'json' : 'markdown')
    logger.debug('Notes exported', { format: exportFormat ? 'json' : 'markdown', count: notesToExport.length })
  }, [notes, activeFolder, t])

  // SubHeader actions handler
  const handleSubHeaderAction = useCallback((action: string) => {
    switch (action) {
      case 'add-note':
        setEditing(null);
        setModalOpen(true);
        break
      case 'search':
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        break
      case 'filter':
        setShowFilters(true)
        break
      case 'export':
        handleExportNotes()
        break
      default:
        // Unknown action
    }
  }, [handleExportNotes])

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [handleSubHeaderAction])

  // Apply filters to notes
  const applyNotesFilters = useCallback((notesList: Note[]): Note[] => {
    return notesList.filter(note => {
      // Pinned filter
      if (filters.pinned && !note.pinned) return false
      
      // Has content filter
      if (filters.hasContent && (!note.content || !note.content.trim())) return false
      
      return true
    })
  }, [filters])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Memoized grid columns based on screen size  
  const gridColumns = useMemo(() => {
    return 4; // Default for 2xl screens
  }, []);

  return (
    <div className={`notes-page ${foldersCollapsed ? 'is-collapsed' : ''}`}>
      {/* Левая область: панель папок */}
      {userId && (
        <FolderSidebar 
          userId={userId} 
          activeId={activeFolder} 
          onChange={setActiveFolder}
          collapsed={foldersCollapsed}
          onToggleCollapse={() => {
            const newState = !foldersCollapsed
            setFoldersCollapsed(newState)
            localStorage.setItem('frovo_folders_collapsed', String(newState))
          }}
        />
      )}
      
      {/* Правая область: заметки */}
      <div className="notes-content">
        {isLoading ? (
          <div className="p-4 text-gray-500">{t('notes.loading')}</div>
        ) : error ? (
          <div className="p-4 text-red-600">
            {t('notes.loadError')}
            {error.message ? <div className="mt-1 text-sm opacity-80">{error.message}</div> : null}
          </div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-gray-500">{t('notes.emptyStateDescription')}</div>
        ) : notes.length > 50 ? (
          <VirtualizedGrid
            items={applyNotesFilters(notes)}
            columns={gridColumns}
            itemHeight={200}
            containerHeight={600}
            renderItem={(note, index) => {
              const noteData = note as Note;
              const folder = noteData.folder_id ? folderMap.get(noteData.folder_id) : null;
              return (
                <NoteCard
                  key={noteData.id}
                  note={noteData}
                  folder={folder}
                  onEdit={handleEditNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteNote}
                />
              );
            }}
            keyExtractor={(note) => (note as Note).id}
            gap={16}
            className="p-4"
          />
        ) : (
          <div className="notes-grid">
            {applyNotesFilters(notes).map((n) => {
              const folder = n.folder_id ? folderMap.get(n.folder_id) : null;
              return (
                <NoteCard
                  key={n.id}
                  note={n}
                  folder={folder}
                  onEdit={handleEditNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteNote}
                />
              );
            })}
          </div>
        )}
      </div>

      <NotesFilterModal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <NoteEditorModal
        open={modalOpen}
        note={editing}
        onClose={handleCloseModal}
        onSave={handleSave}
        onAutoSave={handleAutoSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function NotesPage() {
  const { t } = useSafeTranslation()
  return (
    <PageErrorBoundary 
      pageName={t('pages.notes')}
      onError={(error, errorInfo) => {
        logger.error('Notes page error:', { error, errorInfo });
      }}
    >
      <NotesPageContent />
    </PageErrorBoundary>
  );
}
