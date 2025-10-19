-- Исправление RLS политик для демо-пользователя
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Включаем RLS для всех таблиц
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_data ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- 3. Создаем новые политики для projects
CREATE POLICY "Enable all operations for users on their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

-- 4. Создаем политики для folders
CREATE POLICY "Enable all operations for users on their own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id);

-- 5. Создаем политики для tasks
CREATE POLICY "Enable all operations for users on their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- 6. Создаем политики для notes
CREATE POLICY "Enable all operations for users on their own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);

-- 7. Создаем политики для finance_categories
CREATE POLICY "Enable all operations for users on their own finance_categories" ON public.finance_categories
    FOR ALL USING (auth.uid() = user_id);

-- 8. Создаем политики для finance_data
CREATE POLICY "Enable all operations for users on their own finance_data" ON public.finance_data
    FOR ALL USING (auth.uid() = user_id);

-- 9. Проверяем данные демо-пользователя
SELECT 
    'projects' as table_name, 
    count(*) as count 
FROM public.projects 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com')
UNION ALL
SELECT 
    'folders' as table_name, 
    count(*) as count 
FROM public.folders 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com')
UNION ALL
SELECT 
    'tasks' as table_name, 
    count(*) as count 
FROM public.tasks 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com')
UNION ALL
SELECT 
    'notes' as table_name, 
    count(*) as count 
FROM public.notes 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com')
UNION ALL
SELECT 
    'finance_categories' as table_name, 
    count(*) as count 
FROM public.finance_categories 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com')
UNION ALL
SELECT 
    'finance_data' as table_name, 
    count(*) as count 
FROM public.finance_data 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');

