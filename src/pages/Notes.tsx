/* src/pages/Notes.tsx */
import React, { useEffect, useState } from 'react';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditorModal from '@/components/notes/NoteEditorModal';
import type { Note } from '@/features/notes/types';
import { createNote, deleteNote, listNotes, togglePin, updateNote, type SortKey } from '@/features/notes/api';
import { useDebounce } from '@/features/notes/useDebounce';
import { useErrorHandler } from '@/lib/errorHandler';
import { LoadingState, ListSkeleton } from '@/components/LoadingStates';

export default function NotesPage() {
  const { handleError, handleSuccess } = useErrorHandler();
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
      const data = await listNotes(debouncedSearch, sort);
      if (signal?.aborted) return;
      setNotes(data);
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

  async function handleSave(draft: Partial<Note>, id?: string) {
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
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      handleSuccess('Заметка удалена');
    } catch (error) {
      handleError(error, 'Удаление заметки');
    }
  }

  async function handleTogglePin(n: Note) {
    try {
      const updated = await togglePin(n.id, !n.pinned);
      setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      handleSuccess(n.pinned ? 'Закрепление снято' : 'Заметка закреплена');
    } catch (error) {
      handleError(error, 'Изменение закрепления');
    }
  }

  const empty = !loading && notes.length === 0 && !search;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="btn px-4 py-2 text-sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Добавить заметку
          </button>
          <input
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring focus:ring-blue-100 w-64"
            placeholder="Поиск по заголовку…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            title="Сортировка"
          >
            <option value="updated_at">По обновлению</option>
            <option value="created_at">По созданию</option>
            <option value="title">По алфавиту</option>
          </select>
        </div>
      </div>

      <LoadingState
        loading={loading}
        empty={empty}
        emptyMessage="Пока нет заметок"
        loadingComponent={<ListSkeleton count={6} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={(note) => {
                setEditing(note);
                setModalOpen(true);
              }}
              onDelete={(note) => handleDelete(note.id)}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      </LoadingState>

      <NoteEditorModal
        open={modalOpen}
        note={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={async (id) => handleDelete(id)}
      />
    </div>
  );
}
