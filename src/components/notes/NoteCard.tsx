/* src/components/notes/NoteCard.tsx */
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pin, Copy, Trash2 } from 'lucide-react';
import type { Note } from '@/features/notes/types';

type Folder = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  note: Note;
  folder?: Folder | null;
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDuplicate?: (note: Note) => void;
  onDelete?: (note: Note) => void;
};

const NoteCard = ({ note, folder, onEdit, onTogglePin, onDuplicate, onDelete }: Props) => {
  // Strip HTML tags for preview
  const preview = useMemo(() => {
    const content = note.content ?? '';
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.textContent || temp.innerText || '';
    return text.slice(0, 100);
  }, [note.content]);
  
  const handleEdit = useCallback(() => {
    onEdit(note);
  }, [note, onEdit]);
  
  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(note);
  }, [note, onTogglePin]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(note);
  }, [note, onDuplicate]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить заметку?')) {
      onDelete?.(note);
    }
  }, [note, onDelete]);

  // Format date
  const formattedDate = useMemo(() => {
    const date = new Date(note.updated_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today.getTime() - noteDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    if (diffDays === 0) {
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${timeStr}`;
    } else if (diffDays < 7) {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      return `${weekday}, ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short'
      });
      return `${dateStr}, ${timeStr}`;
    }
  }, [note.updated_at]);

  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close if clicking outside menu
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    // Use capture phase to catch clicks early
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  // Adjust menu position to stay in viewport
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let adjustedX = menuPos.x;
    let adjustedY = menuPos.y;

    if (menuPos.x + rect.width > viewport.width - 8) {
      adjustedX = viewport.width - rect.width - 8;
    }
    if (adjustedX < 8) {
      adjustedX = 8;
    }
    if (menuPos.y + rect.height > viewport.height - 8) {
      adjustedY = viewport.height - rect.height - 8;
    }
    if (adjustedY < 8) {
      adjustedY = 8;
    }

    if (adjustedX !== menuPos.x || adjustedY !== menuPos.y) {
      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [menuOpen, menuPos]);

  return (
    <div
      className="task-card group cursor-pointer flex flex-col"
      style={{
        minHeight: '120px',
        height: '100%',
        position: 'relative'
      }}
      role="button"
      onClick={handleEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Three dots button - SIMPLE TEXT VERSION */}
      <button
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: isHovered ? '#f3f4f6' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1000,
          opacity: isHovered && !menuOpen ? 1 : 0,
          transition: 'opacity 0.2s, background-color 0.2s',
          fontSize: '16px',
          lineHeight: '1',
          color: '#6b7280',
          fontWeight: 'bold',
          pointerEvents: isHovered ? 'auto' : 'none'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          if (menuOpen) {
            setMenuOpen(false);
          } else {
            setMenuPos({
              x: rect.right + 4,
              y: rect.top
            });
            setMenuOpen(true);
          }
        }}
      >
        ⋮
      </button>

      <div className="space-y-2">

      {/* Context menu - portal to body */}
      {menuOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={() => setMenuOpen(false)}
            style={{ backgroundColor: 'transparent' }}
          />
          {/* Menu */}
          <div
            ref={menuRef}
            className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-[1000]"
            style={{
              position: 'fixed',
              left: menuPos.x,
              top: menuPos.y,
              minWidth: '160px'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              style={{ fontSize: '13px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(e);
                setMenuOpen(false);
              }}
            >
              <Pin size={14} className={note.pinned ? 'text-gray-900' : 'text-gray-400'} style={{ transform: note.pinned ? 'rotate(45deg)' : 'none' }} />
              <span>{note.pinned ? 'Открепить' : 'Закрепить'}</span>
            </button>
            {onDuplicate && (
              <button
                className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                style={{ fontSize: '13px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(e);
                  setMenuOpen(false);
                }}
              >
                <Copy size={14} />
                <span>Дублировать</span>
              </button>
            )}
            {onDelete && (
              <button
                className="w-full px-2 py-3 text-left transition-colors rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-2"
                style={{ fontSize: '13px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(e);
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            )}
          </div>
        </>,
        document.body
      )}

        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-medium text-sm text-black line-clamp-2 task-title">
            {note.title || 'Без заголовка'}
          </h3>

          {/* Content preview */}
          {preview && (
            <p className="text-xs text-gray-600 line-clamp-3">
              {preview}
            </p>
          )}
        </div>
      </div>

      {/* Footer - always at bottom */}
      <div 
        className="flex items-center justify-between pt-3 mt-3"
        style={{
          marginTop: 'auto',
          flexShrink: 0,
          borderTop: '1px solid #f3f4f6'
        }}
      >
        {/* Folder name */}
        {folder && (
          <span className="text-xs text-gray-500">
            {folder.name}
          </span>
        )}
        {!folder && <div />}

        {/* Time */}
        <span className="text-xs text-gray-500">
          {formattedDate}
        </span>
      </div>
    </div>
  );
};

export default NoteCard;
