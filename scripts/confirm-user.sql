-- Подтверждение email для демо-пользователя
-- Выполните этот SQL в Supabase SQL Editor

-- Подтверждаем email для демо-пользователя
UPDATE auth.users 
SET 
  email_confirmed_at = NOW()
WHERE email = 'demo@frovo.com';

-- Проверяем результат
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'demo@frovo.com';
