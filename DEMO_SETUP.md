# 🚀 Быстрая настройка демо-данных

## Вариант 1: Интерактивная настройка (рекомендуется)

```bash
npm run setup:demo
```

Скрипт попросит ввести:
- URL вашего Supabase проекта
- Anon key из Supabase

## Вариант 2: Полная настройка с редактированием

1. Откройте `scripts/seed-demo-data.mjs`
2. Замените строки 3-4 на ваши данные Supabase:
   ```javascript
   const supabaseUrl = 'https://your-project.supabase.co'
   const supabaseKey = 'your-anon-key'
   ```
3. Запустите:
   ```bash
   npm run seed:demo
   ```

## Что создается

### 👤 Демо-аккаунт
- **Email**: `demo@frovo.com`
- **Password**: `demo123456`

### 📊 Данные
- **4 проекта** с разными цветами
- **5 задач** с разными приоритетами и статусами
- **3 папки** для заметок
- **2 заметки** с HTML-контентом
- **4 финансовые категории** (доходы и расходы)

## Вход в приложение

1. Запустите приложение: `npm run dev`
2. Перейдите на страницу входа
3. Введите:
   - Email: `demo@frovo.com`
   - Password: `demo123456`

## Очистка данных

Если нужно удалить демо-данные, выполните в Supabase SQL Editor:

```sql
-- Удалить все данные демо-пользователя
DELETE FROM notes WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM folders WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM finance_categories WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM tasks WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM projects WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@frovo.com');
DELETE FROM auth.users WHERE email = 'demo@frovo.com';
```

## Структура демо-данных

### Проекты
- 🔵 Веб-разработка
- 🟢 Мобильные приложения  
- 🟠 Дизайн
- 🔴 Маркетинг

### Задачи
- ✅ Создать главную страницу (высокий приоритет)
- ✅ Настроить базу данных (выполнена)
- ⏳ Создать логотип (средний приоритет)
- ⏳ Исследование конкурентов (низкий приоритет)
- ⏳ Тестирование приложения (средний приоритет)

### Финансы
- **Доходы**: Зарплата, Фриланс
- **Расходы**: Продукты, Транспорт

### Заметки
- 📌 Идеи для нового проекта (закреплена)
- 📋 Планы на неделю

Теперь у вас есть полнофункциональный демо-аккаунт для тестирования всех возможностей приложения!
