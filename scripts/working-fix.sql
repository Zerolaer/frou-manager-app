-- Рабочий SQL для исправления структуры таблиц
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Исправляем таблицу tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Исправляем таблицу finance_data
ALTER TABLE public.finance_data 
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS values INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Включаем RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_data ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Enable all operations for users on their own projects" ON public.projects;
DROP POLICY IF EXISTS "Enable all operations for users on their own folders" ON public.folders;
DROP POLICY IF EXISTS "Enable all operations for users on their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable all operations for users on their own notes" ON public.notes;
DROP POLICY IF EXISTS "Enable all operations for users on their own finance_categories" ON public.finance_categories;
DROP POLICY IF EXISTS "Enable all operations for users on their own finance_data" ON public.finance_data;

-- 5. Создаем новые политики
CREATE POLICY "Enable all operations for users on their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enable all operations for users on their own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enable all operations for users on their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enable all operations for users on their own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enable all operations for users on their own finance_categories" ON public.finance_categories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enable all operations for users on their own finance_data" ON public.finance_data
    FOR ALL USING (auth.uid() = user_id);

-- 6. Проверяем результат
SELECT 'Tables fixed successfully' as status;

