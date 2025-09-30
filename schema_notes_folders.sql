-- Создание таблицы папок для заметок
CREATE TABLE IF NOT EXISTS notes_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  position INTEGER DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS notes_folders_user_id_idx ON notes_folders(user_id);
CREATE INDEX IF NOT EXISTS notes_folders_position_idx ON notes_folders(user_id, position);

-- Добавляем колонку folder_id в таблицу заметок (если её нет)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES notes_folders(id) ON DELETE SET NULL;

-- Индекс для связи заметок с папками
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);

-- RLS политики
ALTER TABLE notes_folders ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои папки
CREATE POLICY "Users can view own folders" ON notes_folders
  FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут создавать папки только для себя
CREATE POLICY "Users can create own folders" ON notes_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только свои папки
CREATE POLICY "Users can update own folders" ON notes_folders
  FOR UPDATE USING (auth.uid() = user_id);

-- Пользователи могут удалять только свои папки
CREATE POLICY "Users can delete own folders" ON notes_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_notes_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_notes_folders_updated_at
  BEFORE UPDATE ON notes_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_folders_updated_at();



