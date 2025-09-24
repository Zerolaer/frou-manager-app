/* src/components/notes/NoteEditorModal.tsx */
import React, { useEffect, useState } from 'react';
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalTextarea, ModalContent } from '@/components/ui/ModalForm'
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
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { createStandardFooter, createDangerFooter } = useModalActions();

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
  }, [note]);

  async function handleSave() {
    setLoading(true);
    try {
      await onSave({ title, content }, note?.id);
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