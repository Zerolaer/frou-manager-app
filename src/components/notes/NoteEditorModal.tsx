/* src/components/notes/NoteEditorModal.tsx */
import { logger } from '@/lib/monitoring'
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SideModal from '@/components/ui/SideModal'
import { ModalField, ModalInput, ModalTextarea, ModalContent } from '@/components/ui/ModalForm'
import Dropdown from '@/components/ui/Dropdown'
import CoreMenu from '@/components/ui/CoreMenu'
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
  onAutoSave?: (draft: Partial<Note>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function NoteEditorModal({ open, note, onClose, onSave, onAutoSave, onDelete }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [folderId, setFolderId] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Отслеживаем изначальные значения для определения изменений
  const [initialValues, setInitialValues] = useState({ title: '', content: '', folderId: '' });

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
        logger.error('Error loading folders:', error);
      }
    };
    
    loadFolders();
  }, [open]);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setFolderId(note?.folder_id ?? '');
    
    // Сохраняем изначальные значения для сравнения
    setInitialValues({
      title: note?.title ?? '',
      content: note?.content ?? '',
      folderId: note?.folder_id ?? ''
    });
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

  async function handleDuplicate() {
    if (!note) return;
    
    try {
      await onSave({
        title: `${note.title} (${t('notes.copy')})`,
        content: note.content,
        folder_id: note.folder_id,
        pinned: false
      });
      onClose();
    } catch (error) {
      logger.error('Duplicate failed:', error);
    }
  }

  // Автосохранение
  const autoSave = useCallback(async () => {
    if (!note?.id || saving) return;
    
    // Проверяем, есть ли реальные изменения
    const hasChanges = 
      title !== initialValues.title ||
      content !== initialValues.content ||
      folderId !== initialValues.folderId;
    
    if (!hasChanges) return; // Нет изменений - не сохраняем
    
    setSaving(true);
    try {
      // Используем onAutoSave если передан, иначе onSave
      const saveFunction = onAutoSave || onSave;
      await saveFunction({ 
        title, 
        content, 
        folder_id: folderId || null 
      }, note.id);
    } catch (error) {
      logger.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [note?.id, saving, title, content, folderId, onSave, onAutoSave, initialValues]);

  // Автосохранение при изменении контента
  useEffect(() => {
    if (!open || !note?.id) return;
    
    const timer = setTimeout(() => {
      autoSave();
    }, 1000); // 1 секунда задержка
    
    return () => clearTimeout(timer);
  }, [title, content, folderId, open, note?.id, autoSave]);

  // Убираем футер - кнопка закрытия в хедере (как в TaskViewModal)

  return (
    <SideModal
      open={open}
      onClose={onClose}
      title={note ? 'Редактировать заметку' : 'Новая заметка'}
      rightContent={
        note?.id && onDelete ? (
          <div ref={menuRef}>
            <CoreMenu
              options={[
                { value: 'duplicate', label: 'Дублировать' },
                { value: 'delete', label: 'Удалить', destructive: true },
              ]}
              onSelect={(value) => {
                if (value === 'duplicate') {
                  handleDuplicate();
                }
                if (value === 'delete') {
                  handleDelete();
                }
              }}
            />
          </div>
        ) : undefined
      }
    >
      <ModalContent>
        {/* Статус сохранения и информация */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div>
            {note?.updated_at && (
              <span>Обновлено: {new Date(note.updated_at).toLocaleString()}</span>
            )}
          </div>
          <div>
            {saving && (
              <span className="text-blue-500">Сохранение...</span>
            )}
          </div>
        </div>

        <ModalField label="Заголовок" required>
          <ModalInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок заметки"
            autoFocus
          />
        </ModalField>

        <ModalField label="Папка">
          <Dropdown
            options={[
              { value: '', label: 'Без папки' },
              ...folders.map(f => ({ value: f.id, label: f.name }))
            ]}
            value={folderId}
            onChange={(value) => setFolderId(String(value))}
            placeholder="Выберите папку"
            className="w-full"
            buttonClassName="w-full justify-between"
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
    </SideModal>
  );
}