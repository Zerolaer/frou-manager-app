/* src/components/notes/NoteEditorModal.tsx */
import React, { useEffect, useRef, useState } from 'react';
import type { Note } from '@/features/notes/types';

type Props = {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onSave: (draft: Partial<Note>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function NoteEditorModal({ open, note, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
  }, [note]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ title, content }, note?.id);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl p-0 w-[720px] max-w-[95vw] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form method="dialog" onSubmit={handleSave} className="flex flex-col">
        {/* Header without Close button */}
        <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
          <h2 className="text-lg font-semibold">
            {note ? 'Редактировать заметку' : 'Новая заметка'}
          </h2>
        </header>

        {/* Body */}
        <div className="p-6 bg-white flex flex-col gap-4">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring focus:ring-blue-100"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="min-h-[280px] w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring focus:ring-blue-100"
            placeholder="Текст заметки… Поддерживается перенос строк."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Footer with uniform button sizing */}
        <footer className="px-6 py-4 border-t bg-white flex items-center justify-between">
          {note?.id && onDelete ? (
            <button
              type="button"
              className="btn-danger px-4 py-2 text-sm rounded-lg"
              onClick={async () => {
                await onDelete(note.id);
                onClose();
              }}
            >
              Удалить
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn px-4 py-2 text-sm rounded-lg"
            >
              Сохранить
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
