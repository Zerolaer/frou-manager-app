-- Исправление структуры таблиц для FROVO Manager
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Исправляем таблицу tasks (добавляем недостающие колонки)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Исправляем таблицу finance_categories (исправляем parent_id)
ALTER TABLE public.finance_categories 
ADD COLUMN IF NOT EXISTS parent_id TEXT,
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Исправляем таблицу finance_data (исправляем структуру)
ALTER TABLE public.finance_data 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS values INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Исправляем таблицу notes (добавляем недостающие колонки)
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Включаем RLS для всех таблиц
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 6. Создаем политики RLS для tasks
CREATE POLICY IF NOT EXISTS "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Создаем политики RLS для finance_categories
CREATE POLICY IF NOT EXISTS "Users can view their own finance_categories" ON public.finance_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own finance_categories" ON public.finance_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own finance_categories" ON public.finance_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own finance_categories" ON public.finance_categories
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Создаем политики RLS для finance_data
CREATE POLICY IF NOT EXISTS "Users can view their own finance_data" ON public.finance_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own finance_data" ON public.finance_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own finance_data" ON public.finance_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own finance_data" ON public.finance_data
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Создаем политики RLS для notes
CREATE POLICY IF NOT EXISTS "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Проверяем структуру таблиц
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('tasks', 'finance_categories', 'finance_data', 'notes', 'projects', 'folders')
ORDER BY table_name, ordinal_position;
