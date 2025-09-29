/* src/components/notes/NoteEditorModal.tsx */
import React, { useEffect, useState } from 'react';
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalTextarea, ModalContent, ModalSelect } from '@/components/ui/ModalForm'
import { supabase } from '@/lib/supabaseClient'
import type { Note } from '@/features/notes/types';

type Folder = {
  id: string
  name: string
  color?: string
}

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
  const [folderId, setFolderId] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { createStandardFooter, createDangerFooter } = useModalActions();

  // Load folders
  useEffect(() => {
    if (!open) return;
    
    const loadFolders = async () => {
      try {
        const { data, error } = await supabase
          .from('notes_folders')
          .select('id, name, color')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setFolders(data);
        }
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    };
    
    loadFolders();
  }, [open]);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setFolderId(note?.folder_id ?? '');
  }, [note]);

  async function handleSave() {
    setLoading(true);
    try {
      await onSave({ 
        title, 
        content, 
        folder_id: folderId || null 
      }, note?.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!note?.id || !onDelete) return;
    
    setDeleteLoading(true);
    try {
      await onDelete(note.id);
      onClose();
    } finally {
      setDeleteLoading(false);
    }
  }

  const footer = note?.id && onDelete 
    ? createDangerFooter(
        { 
          label: deleteLoading ? 'Удаляю...' : 'Удалить', 
          onClick: handleDelete,
          loading: deleteLoading
        },
        { 
          label: 'Сохранить', 
          onClick: handleSave, 
          loading, 
          disabled: !title.trim() 
        },
        { label: 'Отмена', onClick: onClose }
      )
    : createStandardFooter(
        { 
          label: 'Сохранить', 
          onClick: handleSave, 
          loading, 
          disabled: !title.trim() 
        },
        { label: 'Отмена', onClick: onClose }
      );

  return (
    <UnifiedModal
      open={open}
      onClose={onClose}
      title={note ? 'Редактировать заметку' : 'Новая заметка'}
      size="lg"
      footer={footer}
    >
      <ModalContent>
        <ModalField label="Заголовок" required>
          <ModalInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок заметки"
            autoFocus
          />
        </ModalField>

        <ModalField label="Папка">
          <ModalSelect
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">Без папки</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </ModalSelect>
        </ModalField>
        
        <ModalField label="Содержимое">
          <ModalTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Текст заметки… Поддерживается перенос строк."
            rows={12}
          />
        </ModalField>
      </ModalContent>
    </UnifiedModal>
  );
}