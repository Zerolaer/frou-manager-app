/* src/components/notes/NoteCard.tsx */
import React from 'react';
import type { Note } from '@/features/notes/types';

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
};

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }: Props) {
  const preview = note.content?.slice(0, 160) ?? '';

  return (
    <div
      className="rounded-2xl shadow-sm border border-gray-200 bg-white hover:shadow-md transition p-4 flex flex-col gap-3"
      role="button"
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold line-clamp-2">{note.title || 'Без заголовка'}</h3>
        <button
          className="text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note);
          }}
          title={note.pinned ? 'Открепить' : 'Закрепить'}
        >
          {note.pinned ? '📌' : '📍'}
        </button>
      </div>
      <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap">{preview}</p>
      <div className="flex justify-between items-center pt-2 border-t text-[11px] text-gray-500">
        <span>{new Date(note.updated_at).toLocaleString()}</span>
        <button
          className="text-red-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note);
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
