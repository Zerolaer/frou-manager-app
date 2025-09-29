/* src/pages/Notes.tsx */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditorModal from '@/components/notes/NoteEditorModal';
import FolderSidebar from '@/components/FolderSidebar';
import type { Note } from '@/features/notes/types';
import { createNote, deleteNote, listNotes, togglePin, updateNote } from '@/features/notes/api';
import { useErrorHandler } from '@/lib/errorHandler';
import { LoadingState, ListSkeleton } from '@/components/LoadingStates';
import { VirtualizedGrid } from '@/components/VirtualizedList';
import { PageErrorBoundary, FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { useApiWithRetry } from '@/hooks/useRetry';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import '@/notes.css';

function NotesPageContent() {
  const { handleError, handleSuccess } = useErrorHandler();
  const { executeApiCall, isLoading, retryCount } = useApiWithRetry();
  const { userId } = useSupabaseAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>('ALL');

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-note':
        setEditingNote(null);
        setModalOpen(true);
        break
      case 'search':
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Поиск"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        break
      case 'filter':
        // TODO: Implement filter functionality
        handleSuccess('Фильтр будет реализован в следующей версии')
        break
      case 'export':
        // TODO: Implement export functionality
        handleSuccess('Экспорт будет реализован в следующей версии')
        break
      default:
        console.log('Unknown action:', action)
    }
  }
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [])

  async function reload(signal?: AbortSignal) {
    setLoading(true);
    try {
      const data = await executeApiCall(() => listNotes('', 'updated_at', activeFolder));
      if (signal?.aborted) return;
      if (data) {
        setNotes(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        handleError(error, 'Загрузка заметок');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctl = new AbortController();
    reload(ctl.signal);
    return () => ctl.abort();
  }, [activeFolder]);

  // Add body class for notes layout
  useEffect(() => {
    document.body.classList.add('notes-mode');
    return () => {
      document.body.classList.remove('notes-mode');
    };
  }, []);

  const handleSave = useCallback(async (draft: Partial<Note>, id?: string) => {
    try {
      if (!id) {
        // При создании используем folder_id из draft (выбранный в модальном окне)
        const created = await createNote(draft);
        setNotes((prev) => [created, ...prev]);
        handleSuccess('Заметка создана');
      } else {
        const updated = await updateNote(id, draft);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        handleSuccess('Заметка обновлена');
      }
    } catch (error) {
      handleError(error, id ? 'Обновление заметки' : 'Создание заметки');
    }
  }, [handleError, handleSuccess]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      handleSuccess('Заметка удалена');
    } catch (error) {
      handleError(error, 'Удаление заметки');
    }
  }, [handleError, handleSuccess]);

  const handleTogglePin = useCallback(async (n: Note) => {
    try {
      const updated = await togglePin(n.id, !n.pinned);
      setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      handleSuccess(n.pinned ? 'Закрепление снято' : 'Заметка закреплена');
    } catch (error) {
      handleError(error, 'Изменение закрепления');
    }
  }, [handleError, handleSuccess]);

  const empty = !loading && notes.length === 0;

  const handleEditNote = useCallback((note: Note) => {
    setEditing(note);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Memoized grid columns based on screen size
  const gridColumns = useMemo(() => {
    // This could be enhanced with a hook to detect screen size
    return 4; // Default for 2xl screens
  }, []);

  return (
    <div className="notes-page">
      {/* Левая область: панель папок */}
      {userId && (
        <FolderSidebar 
          userId={userId} 
          activeId={activeFolder} 
          onChange={setActiveFolder} 
        />
      )}
      
      {/* Правая область: заметки */}
      <div className="notes-content">

        <LoadingState
          loading={loading}
          empty={empty}
          emptyMessage="Пока нет заметок"
          loadingComponent={<ListSkeleton count={6} />}
        >
          {notes.length > 50 ? (
            <VirtualizedGrid
              items={notes}
              columns={gridColumns}
              itemHeight={200}
              containerHeight={600}
              renderItem={(note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onTogglePin={handleTogglePin}
              />
              )}
              keyExtractor={(note) => note.id}
              gap={16}
              className="p-4"
            />
          ) : (
            <div className="notes-grid">
              {notes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  onEdit={handleEditNote}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
        </LoadingState>
      </div>

      <NoteEditorModal
        open={modalOpen}
        note={editing}
        onClose={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function NotesPage() {
  return (
    <PageErrorBoundary 
      pageName="Заметки"
      onError={(error, errorInfo) => {
        console.error('Notes page error:', error, errorInfo);
      }}
    >
      <NotesPageContent />
    </PageErrorBoundary>
  );
}
