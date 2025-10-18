/* src/components/notes/NoteCard.tsx */
import React, { useCallback, useMemo } from 'react';
import { Pin } from 'lucide-react';
import type { Note } from '@/features/notes/types';

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
};

const NoteCard = ({ note, onEdit, onTogglePin }: Props) => {
  // Strip HTML tags for preview
  const preview = useMemo(() => {
    const content = note.content ?? '';
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = content;
    // Get text content without HTML tags
    const text = temp.textContent || temp.innerText || '';
    return text.slice(0, 160);
  }, [note.content]);
  
  const handleEdit = useCallback(() => {
    onEdit(note);
  }, [note, onEdit]);
  
  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(note);
  }, [note, onTogglePin]);

  return (
    <div
      className="rounded-2xl shadow-sm border border-gray-200 bg-white hover:shadow-md transition p-4 flex flex-col gap-3"
      role="button"
      onClick={handleEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold line-clamp-2">{note.title || 'Без заголовка'}</h3>
        <button
          className={`p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
            note.pinned 
              ? 'bg-gray-900 text-white hover:bg-gray-800' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          onClick={handleTogglePin}
          title={note.pinned ? 'Открепить' : 'Закрепить'}
        >
          <Pin className={`w-4 h-4 transition-transform ${note.pinned ? 'rotate-45' : ''}`} />
        </button>
      </div>
      <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap">{preview}</p>
      <div className="flex justify-between items-center pt-2 border-t text-[11px] text-gray-500">
        <span>{new Date(note.updated_at).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default NoteCard;
