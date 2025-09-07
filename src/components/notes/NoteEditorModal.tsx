/* src/components/notes/NoteEditorModal.tsx */
import React, { useEffect, useState } from 'react';
import type { Note } from '@/features/notes/types';
import Modal from '@/components/Modal';

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

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
  }, [open, note?.id]);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const draft: Partial<Note> = { title: title.trim(), content };
    await onSave(draft, note?.id);
    onClose();
  }

  const footer = (
    <div className="flex items-center justify-between w-full">
      {note?.id && onDelete ? (
        <button
          type="button"
          className="btn-danger px-4 py-2 text-sm rounded-lg"
          onClick={async () => {
            await onDelete(note.id as string);
            onClose();
          }}
        >
          Удалить
        </button>
      ) : <span />}

      <div className="flex items-center gap-2">
        <button className="btn btn-outline px-4 py-2 text-sm rounded-lg" onClick={onClose}>
          Отмена
        </button>
        <button className="btn px-4 py-2 text-sm rounded-lg" onClick={() => void handleSave()}>
          Сохранить
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={note ? 'Редактировать заметку' : 'Новая заметка'}
      size="lg"
      footer={footer}
      contentClassName="w-[880px] max-w-[95vw]"
    >
      <div className="p-6 bg-white flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Заголовок</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring focus:ring-blue-100"
            placeholder="Например: Идеи для поста"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Содержимое</label>
          <textarea
            className="border rounded-lg px-3 py-2 text-sm w-full min-h-[240px] resize-y focus:outline-none focus:ring focus:ring-blue-100"
            placeholder="Текст заметки… Поддерживается перенос строк."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
