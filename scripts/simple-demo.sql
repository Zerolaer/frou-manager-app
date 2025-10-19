-- Простой SQL для создания демо-данных
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Отключаем RLS временно
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_data DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые данные
DELETE FROM public.tasks WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.notes WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.finance_data WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.finance_categories WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.notes_folders WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.projects WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');

-- 3. Получаем или создаем пользователя
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Проверяем, существует ли пользователь
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@frovo.com';
    
    IF v_user_id IS NULL THEN
        -- Создаем нового пользователя
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'demo@frovo.com',
            crypt('demo123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO v_user_id;
    END IF;
    
    RAISE NOTICE 'User ID: %', v_user_id;
    
    -- 4. Создаем проекты
    INSERT INTO public.projects (id, name, color, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Веб-разработка', '#3B82F6', v_user_id, NOW()),
        (gen_random_uuid(), 'Мобильные приложения', '#10B981', v_user_id, NOW());
    
    RAISE NOTICE 'Projects created';
    
    -- 5. Создаем папки
    INSERT INTO public.notes_folders (id, name, color, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Проекты', '#3B82F6', v_user_id, NOW()),
        (gen_random_uuid(), 'Планы', '#10B981', v_user_id, NOW());
    
    RAISE NOTICE 'Folders created';
    
    -- 6. Создаем задачи
    INSERT INTO public.tasks (title, description, completed, priority, project_id, date, user_id, created_at)
    SELECT 
        'Изучить React Hooks',
        'Изучить основные хуки React',
        false,
        3,
        p.id,
        CURRENT_DATE,
        v_user_id,
        NOW()
    FROM public.projects p 
    WHERE p.user_id = v_user_id 
    LIMIT 1;
    
    RAISE NOTICE 'Tasks created';
    
    -- 7. Создаем финансовые категории
    INSERT INTO public.finance_categories (id, name, type, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Зарплата', 'income', v_user_id, NOW()),
        (gen_random_uuid(), 'Продукты', 'expense', v_user_id, NOW());
    
    RAISE NOTICE 'Finance categories created';
    
    -- 8. Создаем заметки
    INSERT INTO public.notes (title, content, folder_id, pinned, user_id, created_at)
    SELECT 
        'Тестовая заметка',
        'Это тестовая заметка',
        f.id,
        true,
        v_user_id,
        NOW()
    FROM public.notes_folders f 
    WHERE f.user_id = v_user_id 
    LIMIT 1;
    
    RAISE NOTICE 'Notes created';
    
    -- 9. Выводим итоги
    RAISE NOTICE '=== DEMO DATA CREATED ===';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Email: demo@frovo.com';
    RAISE NOTICE 'Password: demo123';
END $$;

-- 10. Включаем RLS обратно
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_data ENABLE ROW LEVEL SECURITY;

-- 11. Создаем RLS политики
DROP POLICY IF EXISTS "Enable all for users" ON public.projects;
DROP POLICY IF EXISTS "Enable all for users" ON public.notes_folders;
DROP POLICY IF EXISTS "Enable all for users" ON public.tasks;
DROP POLICY IF EXISTS "Enable all for users" ON public.notes;
DROP POLICY IF EXISTS "Enable all for users" ON public.finance_categories;
DROP POLICY IF EXISTS "Enable all for users" ON public.finance_data;

CREATE POLICY "Enable all for users" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for users" ON public.notes_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for users" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for users" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for users" ON public.finance_categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for users" ON public.finance_data FOR ALL USING (auth.uid() = user_id);

SELECT 'Demo data created successfully!' as status;

