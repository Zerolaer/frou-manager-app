/* src/pages/Notes.tsx */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditorModal from '@/components/notes/NoteEditorModal';
import type { Note } from '@/features/notes/types';
import { createNote, deleteNote, listNotes, togglePin, updateNote, type SortKey } from '@/features/notes/api';
import { useDebounce } from '@/features/notes/useDebounce';
import { useErrorHandler } from '@/lib/errorHandler';
import { LoadingState, ListSkeleton } from '@/components/LoadingStates';
import { VirtualizedGrid } from '@/components/VirtualizedList';
import { AccessibleInput, AccessibleButton } from '@/components/AccessibleComponents';
import { ARIA_LABELS } from '@/lib/accessibility';
import { PageErrorBoundary, FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { useApiWithRetry } from '@/hooks/useRetry';

function NotesPageContent() {
  const { handleError, handleSuccess } = useErrorHandler();
  const { executeApiCall, isLoading, retryCount } = useApiWithRetry();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('updated_at');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  async function reload(signal?: AbortSignal) {
    setLoading(true);
    try {
      const data = await executeApiCall(() => listNotes(debouncedSearch, sort));
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
  }, [sort, debouncedSearch]);

  const handleSave = useCallback(async (draft: Partial<Note>, id?: string) => {
    try {
      if (!id) {
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

  const empty = !loading && notes.length === 0 && !search;

  // Memoized event handlers
  const handleCreateNote = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value as SortKey);
  }, []);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AccessibleButton
            variant="primary"
            size="sm"
            onClick={handleCreateNote}
            ariaLabel={ARIA_LABELS.ADD + ' заметку'}
            announceOnClick="Открыто окно создания заметки"
          >
            + Добавить заметку
          </AccessibleButton>
          
          <AccessibleInput
            label="Поиск заметок"
            placeholder="Поиск по заголовку…"
            value={search}
            onChange={handleSearchChange}
            className="w-64"
            ariaLabel={ARIA_LABELS.SEARCH + ' заметок'}
          />
          
          <div className="flex flex-col">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 mb-1">
              Сортировка
            </label>
            <select
              id="sort-select"
              className="border rounded-lg px-3 py-2 text-sm"
              value={sort}
              onChange={handleSortChange}
              aria-label="Выберите способ сортировки заметок"
            >
              <option value="updated_at">По обновлению</option>
              <option value="created_at">По созданию</option>
              <option value="title">По алфавиту</option>
            </select>
          </div>
        </div>
      </div>

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
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
              />
            )}
            keyExtractor={(note) => note.id}
            gap={16}
            className="p-4"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={handleEditNote}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </LoadingState>

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
