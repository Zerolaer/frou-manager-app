/* src/components/notes/NoteEditorModal.tsx */
import { logger } from '@/lib/monitoring'
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SideModal from '@/components/ui/SideModal'
import { ModalField, ModalInput, ModalTextarea, ModalContent } from '@/components/ui/ModalForm'
import { ModalButton } from '@/components/ui/ModalSystem'
import Dropdown from '@/components/ui/Dropdown'
import CoreMenu from '@/components/ui/CoreMenu'
import { Bold, Italic, Strikethrough, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react'
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
  const textareaRef = useRef<HTMLDivElement>(null);
  
  // Отслеживаем изначальные значения для определения изменений
  const [initialValues, setInitialValues] = useState({ title: '', content: '', folderId: '' });

  // Formatting functions
  const applyFormat = (command: string, value?: string) => {
    const editor = textareaRef.current;
    if (!editor) return;
    
    editor.focus();
    document.execCommand(command, false, value);
    
    // Update content from contenteditable
    setContent(editor.innerHTML);
  };

  const insertList = (type: 'ordered' | 'unordered') => {
    const editor = textareaRef.current;
    if (!editor) return;
    
    editor.focus();
    
    // Ensure we have a selection - if not, create one at the end
    let selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    if (type === 'ordered') {
      document.execCommand('insertOrderedList', false);
    } else {
      document.execCommand('insertUnorderedList', false);
    }
    
    setContent(editor.innerHTML);
  };

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
    if (!open) return;
    
    console.log('📖 Loading note into editor:', { 
      noteId: note?.id, 
      hasContent: !!note?.content,
      contentLength: note?.content?.length,
      content: note?.content?.substring(0, 100)
    });
    
    setTitle(note?.title ?? '');
    const noteContent = note?.content ?? '';
    setContent(noteContent);
    setFolderId(note?.folder_id ?? '');
    
    // Устанавливаем контент в contenteditable элемент с небольшой задержкой
    // чтобы убедиться что DOM элемент уже существует
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.innerHTML = noteContent;
        console.log('✅ Content set to contenteditable:', { 
          refExists: !!textareaRef.current,
          innerHTML: textareaRef.current.innerHTML.substring(0, 100)
        });
      } else {
        console.warn('⚠️ textareaRef.current is null!');
      }
    }, 0);
    
    // Сохраняем изначальные значения для сравнения
    setInitialValues({
      title: note?.title ?? '',
      content: noteContent,
      folderId: note?.folder_id ?? ''
    });
  }, [note, open]);

  async function handleSave() {
    setLoading(true);
    try {
      // Получаем актуальное значение из contenteditable
      const currentContent = textareaRef.current?.innerHTML || content;
      
      console.log('💾 Saving note:', { 
        title, 
        contentLength: currentContent.length, 
        content: currentContent.substring(0, 100),
        noteId: note?.id 
      });
      
      await onSave({ 
        title, 
        content: currentContent, 
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
      // Получаем актуальное значение из contenteditable
      const currentContent = textareaRef.current?.innerHTML || content;
      
      await onSave({
        title: `${note.title} (${t('notes.copy')})`,
        content: currentContent,
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
    
    // Получаем актуальное значение из contenteditable
    const currentContent = textareaRef.current?.innerHTML || content;
    
    // Проверяем, есть ли реальные изменения
    const hasChanges = 
      title !== initialValues.title ||
      currentContent !== initialValues.content ||
      folderId !== initialValues.folderId;
    
    if (!hasChanges) return; // Нет изменений - не сохраняем
    
    setSaving(true);
    try {
      // Используем onAutoSave если передан, иначе onSave
      const saveFunction = onAutoSave || onSave;
      await saveFunction({ 
        title, 
        content: currentContent, 
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

  return (
    <SideModal
      open={open}
      onClose={onClose}
      title={note ? 'Редактировать заметку' : 'Новая заметка'}
      showCloseButton={false}
      noPadding={true}
      footer={
        <div className="flex gap-3">
          <ModalButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSave}
            loading={loading}
            disabled={!title.trim()}
            className="flex-1"
          >
            {note ? t('actions.save') : t('actions.create')}
          </ModalButton>
        </div>
      }
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
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 space-y-4 flex-shrink-0">
        {/* Статус сохранения и информация */}
          <div className="flex items-center justify-between text-sm text-gray-500">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
        
        <div className="flex-1 flex flex-col px-6 pb-4 min-h-0 overflow-hidden">
          <label className="block text-sm font-medium text-gray-700 mb-1">Содержимое</label>
          
          <div className="flex-1 flex flex-col border rounded-xl bg-white transition-all duration-200 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-gray-500 focus-within:ring-offset-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => applyFormat('bold')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Bold"
              >
                <Bold className="w-4 h-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('italic')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Italic"
              >
                <Italic className="w-4 h-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('strikeThrough')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('underline')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Underline"
              >
                <UnderlineIcon className="w-4 h-4 text-gray-700" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                type="button"
                onClick={() => insertList('unordered')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Bullet list"
              >
                <List className="w-4 h-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => insertList('ordered')}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            
            <div
              key={note?.id || 'new'}
              ref={textareaRef}
              contentEditable
              onInput={(e) => {
                const newContent = e.currentTarget.innerHTML;
                console.log('⌨️ Content changed:', { 
                  length: newContent.length, 
                  preview: newContent.substring(0, 50) 
                });
                setContent(newContent);
              }}
              onBlur={(e) => setContent(e.currentTarget.innerHTML)}
              onClick={(e) => {
                // If empty, ensure cursor is placed in the editor
                const editor = e.currentTarget;
                if (editor.innerHTML === '' || editor.innerHTML === '<br>') {
                  editor.focus();
                  const selection = window.getSelection();
                  const range = document.createRange();
                  range.selectNodeContents(editor);
                  range.collapse(false);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }}
              data-placeholder="Текст заметки… Поддерживается форматирование."
              className="flex-1 w-full px-4 py-3 bg-transparent text-gray-700 outline-none overflow-y-auto note-editor"
              style={{ 
                minHeight: '100px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>
    </SideModal>
  );
}