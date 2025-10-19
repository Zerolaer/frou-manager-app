-- Финальное создание всех демо-данных
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Удаляем старые данные (если есть)
DELETE FROM public.tasks WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.notes WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.finance_data WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.finance_categories WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.notes_folders WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM public.projects WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM auth.users WHERE email = 'demo@frovo.com';

-- 2. Создаем пользователя
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
);

-- 3. Получаем ID пользователя
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@frovo.com';
    
    -- 4. Создаем проекты
    INSERT INTO public.projects (id, name, color, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Веб-разработка', '#3B82F6', v_user_id, NOW()),
        (gen_random_uuid(), 'Мобильные приложения', '#10B981', v_user_id, NOW()),
        (gen_random_uuid(), 'Дизайн', '#F59E0B', v_user_id, NOW()),
        (gen_random_uuid(), 'Маркетинг', '#EF4444', v_user_id, NOW());
    
    -- 5. Создаем папки для заметок
    INSERT INTO public.notes_folders (id, name, color, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Проекты', '#3B82F6', v_user_id, NOW()),
        (gen_random_uuid(), 'Планы', '#10B981', v_user_id, NOW()),
        (gen_random_uuid(), 'Обучение', '#F59E0B', v_user_id, NOW()),
        (gen_random_uuid(), 'События', '#EF4444', v_user_id, NOW()),
        (gen_random_uuid(), 'Личное', '#8B5CF6', v_user_id, NOW());
    
    -- 6. Создаем задачи (без указания id - автоинкремент)
    -- priority: 1=low, 2=medium, 3=high
    INSERT INTO public.tasks (title, description, completed, priority, project_id, date, user_id, created_at)
    SELECT 
        'Изучить React Hooks',
        'Изучить основные хуки React: useState, useEffect, useContext',
        false,
        3,
        p.id,
        '2024-01-15',
        v_user_id,
        NOW()
    FROM public.projects p 
    WHERE p.user_id = v_user_id 
    LIMIT 1;
    
    INSERT INTO public.tasks (title, description, completed, priority, project_id, date, user_id, created_at)
    SELECT 
        'Создать компонент навигации',
        'Создать адаптивный компонент навигации для мобильных устройств',
        false,
        2,
        p.id,
        '2024-01-16',
        v_user_id,
        NOW()
    FROM public.projects p 
    WHERE p.user_id = v_user_id 
    LIMIT 1;
    
    INSERT INTO public.tasks (title, description, completed, priority, project_id, date, user_id, created_at)
    SELECT 
        'Настроить TypeScript',
        'Настроить TypeScript конфигурацию для проекта',
        true,
        1,
        p.id,
        '2024-01-14',
        v_user_id,
        NOW()
    FROM public.projects p 
    WHERE p.user_id = v_user_id 
    LIMIT 1;
    
    -- 7. Создаем финансовые категории
    INSERT INTO public.finance_categories (id, name, type, user_id, created_at)
    VALUES 
        (gen_random_uuid(), 'Зарплата', 'income', v_user_id, NOW()),
        (gen_random_uuid(), 'Фриланс', 'income', v_user_id, NOW()),
        (gen_random_uuid(), 'Продукты', 'expense', v_user_id, NOW()),
        (gen_random_uuid(), 'Транспорт', 'expense', v_user_id, NOW()),
        (gen_random_uuid(), 'Развлечения', 'expense', v_user_id, NOW());
    
    -- 8. Создаем финансовые данные (без указания id - автоинкремент)
    INSERT INTO public.finance_data (category_id, values, user_id)
    SELECT 
        fc.id,
        ARRAY[1000, 1200, 800, 1500, 900],
        v_user_id
    FROM public.finance_categories fc 
    WHERE fc.user_id = v_user_id 
    LIMIT 1;
    
    -- 9. Создаем заметки (без указания id - автоинкремент)
    INSERT INTO public.notes (title, content, folder_id, pinned, user_id, created_at)
    SELECT 
        'Идеи для нового проекта',
        'Создать приложение для управления задачами с красивым интерфейсом',
        f.id,
        true,
        v_user_id,
        NOW()
    FROM public.notes_folders f 
    WHERE f.user_id = v_user_id 
    LIMIT 1;
    
    INSERT INTO public.notes (title, content, folder_id, pinned, user_id, created_at)
    SELECT 
        'Изучение новых технологий',
        'Изучить Next.js 14, Tailwind CSS, и Supabase для создания современных веб-приложений',
        f.id,
        true,
        v_user_id,
        NOW()
    FROM public.notes_folders f 
    WHERE f.user_id = v_user_id AND f.name = 'Обучение'
    LIMIT 1;
    
    INSERT INTO public.notes (title, content, folder_id, pinned, user_id, created_at)
    SELECT 
        'Планы на неделю',
        '1. Завершить проект\n2. Изучить новую технологию\n3. Встретиться с командой',
        f.id,
        false,
        v_user_id,
        NOW()
    FROM public.notes_folders f 
    WHERE f.user_id = v_user_id AND f.name = 'Планы'
    LIMIT 1;
    
    INSERT INTO public.notes (title, content, folder_id, pinned, user_id, created_at)
    SELECT 
        'Встречи и события',
        'Понедельник: Встреча с клиентом\nСреда: Презентация проекта\nПятница: Командная встреча',
        f.id,
        false,
        v_user_id,
        NOW()
    FROM public.notes_folders f 
    WHERE f.user_id = v_user_id AND f.name = 'События'
    LIMIT 1;
    
    RAISE NOTICE 'Все данные созданы для пользователя: %', v_user_id;
END $$;

-- 10. Проверяем результат
SELECT 'Данные созданы успешно!' as status;
