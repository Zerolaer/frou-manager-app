-- Создание всех демо-данных напрямую через SQL
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Создаем пользователя (если не существует)
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
) ON CONFLICT (email) DO NOTHING;

-- 2. Получаем ID пользователя
DO $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = 'demo@frovo.com';
    
    -- 3. Создаем проекты
    INSERT INTO public.projects (id, name, color, user_id, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'Веб-разработка', '#3B82F6', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Мобильные приложения', '#10B981', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Дизайн', '#F59E0B', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Маркетинг', '#EF4444', user_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- 4. Создаем папки
    INSERT INTO public.folders (id, name, color, user_id, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'Проекты', '#3B82F6', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Планы', '#10B981', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Обучение', '#F59E0B', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'События', '#EF4444', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Личное', '#8B5CF6', user_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- 5. Создаем задачи
    INSERT INTO public.tasks (id, title, description, completed, priority, project_id, date, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Изучить React Hooks',
        'Изучить основные хуки React: useState, useEffect, useContext',
        false,
        'high',
        p.id,
        '2024-01-15',
        user_id,
        NOW(),
        NOW()
    FROM public.projects p 
    WHERE p.user_id = user_id 
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.tasks (id, title, description, completed, priority, project_id, date, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Создать компонент навигации',
        'Создать адаптивный компонент навигации для мобильных устройств',
        false,
        'medium',
        p.id,
        '2024-01-16',
        user_id,
        NOW(),
        NOW()
    FROM public.projects p 
    WHERE p.user_id = user_id 
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.tasks (id, title, description, completed, priority, project_id, date, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Настроить TypeScript',
        'Настроить TypeScript конфигурацию для проекта',
        true,
        'low',
        p.id,
        '2024-01-14',
        user_id,
        NOW(),
        NOW()
    FROM public.projects p 
    WHERE p.user_id = user_id 
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- 6. Создаем финансовые категории
    INSERT INTO public.finance_categories (id, name, type, user_id, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'Зарплата', 'income', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Фриланс', 'income', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Продукты', 'expense', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Транспорт', 'expense', user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Развлечения', 'expense', user_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- 7. Создаем финансовые данные
    INSERT INTO public.finance_data (id, category_id, values, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        fc.id,
        ARRAY[1000, 1200, 800, 1500, 900],
        user_id,
        NOW(),
        NOW()
    FROM public.finance_categories fc 
    WHERE fc.user_id = user_id 
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- 8. Создаем заметки
    INSERT INTO public.notes (id, title, content, folder_id, pinned, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Идеи для нового проекта',
        'Создать приложение для управления задачами с красивым интерфейсом',
        f.id,
        true,
        user_id,
        NOW(),
        NOW()
    FROM public.folders f 
    WHERE f.user_id = user_id 
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.notes (id, title, content, folder_id, pinned, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Изучение новых технологий',
        'Изучить Next.js 14, Tailwind CSS, и Supabase для создания современных веб-приложений',
        f.id,
        true,
        user_id,
        NOW(),
        NOW()
    FROM public.folders f 
    WHERE f.user_id = user_id AND f.name = 'Обучение'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.notes (id, title, content, folder_id, pinned, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Планы на неделю',
        '1. Завершить проект\n2. Изучить новую технологию\n3. Встретиться с командой',
        f.id,
        false,
        user_id,
        NOW(),
        NOW()
    FROM public.folders f 
    WHERE f.user_id = user_id AND f.name = 'Планы'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.notes (id, title, content, folder_id, pinned, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(),
        'Встречи и события',
        'Понедельник: Встреча с клиентом\nСреда: Презентация проекта\nПятница: Командная встреча',
        f.id,
        false,
        user_id,
        NOW(),
        NOW()
    FROM public.folders f 
    WHERE f.user_id = user_id AND f.name = 'События'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Данные созданы для пользователя: %', user_id;
END $$;

-- 9. Проверяем результат
SELECT 'Данные созданы успешно!' as status;
