# Отчет по базе данных и SQL схемам

## 1. Обзор SQL миграций

Найдено **6 SQL миграционных файлов** в корне проекта:

| Файл | Таблица | Цель | Статус |
|------|---------|------|--------|
| `schema_finance_entries_add_currency.sql` | finance_entries | Добавить поле currency | ✅ |
| `schema_finance_entries_add_position.sql` | finance_entries | Добавить sortable position | ✅ |
| `schema_notes_folders.sql` | notes_folders | Создать таблицу папок для заметок | ✅ |
| `schema_tasks_items_add_description.sql` | tasks_items | Добавить description | ✅ |
| `schema_tasks_items_add_meta.sql` | tasks_items | Добавить priority, tag, todos | ✅ |
| `schema_tasks_items_project_id_nullable.sql` | tasks_items | Сделать project_id nullable | ✅ |

---

## 2. Детальный анализ миграций

### 2.1 Finance Entries - Currency

**Файл:** `schema_finance_entries_add_currency.sql`

```sql
ALTER TABLE finance_entries 
ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';

UPDATE finance_entries 
SET currency = 'EUR' 
WHERE currency IS NULL;

ALTER TABLE finance_entries 
ADD CONSTRAINT check_currency 
CHECK (currency IN ('EUR', 'USD', 'GEL'));

CREATE INDEX idx_finance_entries_currency ON finance_entries(currency);
```

#### Анализ:
✅ **Хорошо:**
- Правильное использование DEFAULT
- UPDATE для существующих записей
- CHECK constraint для валидации
- Индекс для производительности

⚠️ **Потенциальные проблемы:**
- Только 3 валюты поддерживается ('EUR', 'USD', 'GEL')
- Для добавления новой валюты нужно изменять constraint

**Рекомендация:**
```sql
-- Вариант 1: Расширить список валют
ALTER TABLE finance_entries 
ADD CONSTRAINT check_currency 
CHECK (currency IN ('EUR', 'USD', 'GEL', 'RUB', 'GBP'));

-- Вариант 2: Создать таблицу валют (более гибко)
CREATE TABLE currencies (
  code VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL
);

ALTER TABLE finance_entries 
ADD CONSTRAINT fk_currency 
FOREIGN KEY (currency) REFERENCES currencies(code);
```

---

### 2.2 Finance Entries - Position

**Файл:** `schema_finance_entries_add_position.sql`

```sql
alter table if exists public.finance_entries
  add column if not exists position int;

with ranked as (
  select id, row_number() over (partition by category_id, year, month order by created_at) - 1 as rn
  from public.finance_entries
)
update public.finance_entries f
set position = r.rn
from ranked r
where r.id = f.id and f.position is null;
```

#### Анализ:
✅ **Хорошо:**
- `IF NOT EXISTS` - безопасное выполнение
- Умная инициализация позиций с помощью window function
- Партиционирование по category_id, year, month

⚠️ **Потенциальные проблемы:**
- Нет индекса на position
- Нет constraint для уникальности позиции в пределах группы

**Рекомендация:**
```sql
-- Добавить индекс
CREATE INDEX idx_finance_entries_position 
ON finance_entries(category_id, year, month, position);

-- Опционально: уникальность позиции в группе
CREATE UNIQUE INDEX idx_finance_entries_unique_position
ON finance_entries(category_id, year, month, position)
WHERE position IS NOT NULL;
```

---

### 2.3 Notes Folders

**Файл:** `schema_notes_folders.sql` (58 строк)

```sql
CREATE TABLE IF NOT EXISTS notes_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  position INTEGER DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS notes_folders_user_id_idx ON notes_folders(user_id);
CREATE INDEX IF NOT EXISTS notes_folders_position_idx ON notes_folders(user_id, position);

-- Добавление folder_id в notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES notes_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);

-- RLS политики
ALTER TABLE notes_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON notes_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON notes_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON notes_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON notes_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_notes_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_folders_updated_at
  BEFORE UPDATE ON notes_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_folders_updated_at();
```

#### Анализ:
✅ **Отлично:**
- Полная RLS (Row Level Security) настройка
- Правильные индексы для производительности
- Cascade delete для user_id
- SET NULL для folder_id при удалении папки
- Триггер для автоматического обновления updated_at
- `IF NOT EXISTS` для безопасности

⚠️ **Незначительные замечания:**
- Поле `color` без валидации (может быть любая строка)

**Рекомендация:**
```sql
-- Добавить валидацию цвета (hex format)
ALTER TABLE notes_folders 
ADD CONSTRAINT check_color_format 
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
```

---

### 2.4 Tasks Items - Description

**Файл:** `schema_tasks_items_add_description.sql`

```sql
alter table public.tasks_items add column if not exists description text;
```

#### Анализ:
✅ **Хорошо:** Простая и безопасная миграция

⚠️ **Замечания:**
- Нет индекса (но для text поля обычно не нужен)
- Можно добавить full-text search индекс, если планируется поиск

**Рекомендация (опционально):**
```sql
-- Для full-text search (если нужно)
ALTER TABLE tasks_items ADD COLUMN description_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED;

CREATE INDEX idx_tasks_items_description_search 
ON tasks_items USING GIN(description_search);
```

---

### 2.5 Tasks Items - Meta Fields

**Файл:** `schema_tasks_items_add_meta.sql`

```sql
alter table public.tasks_items add column if not exists priority text;
alter table public.tasks_items add column if not exists tag text;
alter table public.tasks_items add column if not exists todos jsonb default '[]'::jsonb;
```

#### Анализ:
✅ **Хорошо:**
- `IF NOT EXISTS` безопасность
- JSONB для todos - гибкий формат
- Default значение для todos

⚠️ **Потенциальные проблемы:**
- `priority` - text без constraint (может быть любое значение)
- `tag` - text без ограничений
- Нет индексов для поиска/фильтрации

**Рекомендация:**
```sql
-- Добавить constraint для priority
ALTER TABLE tasks_items 
ADD CONSTRAINT check_priority 
CHECK (priority IS NULL OR priority IN ('low', 'normal', 'medium', 'high'));

-- Добавить индекс для priority (часто используется для фильтрации)
CREATE INDEX idx_tasks_items_priority ON tasks_items(priority)
WHERE priority IS NOT NULL;

-- Добавить индекс для tag
CREATE INDEX idx_tasks_items_tag ON tasks_items(tag)
WHERE tag IS NOT NULL;

-- Добавить GIN индекс для todos JSONB (для поиска внутри)
CREATE INDEX idx_tasks_items_todos ON tasks_items USING GIN(todos);
```

---

### 2.6 Tasks Items - Project ID Nullable

**Файл:** `schema_tasks_items_project_id_nullable.sql`

```sql
ALTER TABLE tasks_items 
ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN tasks_items.project_id IS 'Project ID (nullable) - tasks can exist without a project';
```

#### Анализ:
✅ **Отлично:**
- Правильное изменение constraint
- Комментарий для документации

⚠️ **Проверить:**
- Есть ли индекс на project_id?
- Есть ли foreign key constraint?

**Рекомендация:**
```sql
-- Проверить наличие индекса
CREATE INDEX IF NOT EXISTS idx_tasks_items_project_id 
ON tasks_items(project_id)
WHERE project_id IS NOT NULL;

-- Если нет foreign key:
ALTER TABLE tasks_items 
ADD CONSTRAINT fk_tasks_items_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
```

---

## 3. Общие проблемы и рекомендации

### 3.1 Отсутствие индексов

**Проблема:** Некоторые часто используемые колонки без индексов.

**Критичные индексы для добавления:**

```sql
-- Tasks: date для фильтрации по неделе/месяцу
CREATE INDEX idx_tasks_items_date ON tasks_items(date);

-- Tasks: status для фильтрации
CREATE INDEX idx_tasks_items_status ON tasks_items(status)
WHERE status IS NOT NULL;

-- Finance entries: year и month для быстрой выборки
CREATE INDEX idx_finance_entries_year_month 
ON finance_entries(year, month);

-- Finance entries: user_id (если есть)
CREATE INDEX idx_finance_entries_user_id 
ON finance_entries(user_id);

-- Notes: user_id для RLS
CREATE INDEX idx_notes_user_id ON notes(user_id);
```

### 3.2 Отсутствие constraints

**Проблема:** Некоторые поля без валидации.

**Добавить:**

```sql
-- Tasks priority validation
ALTER TABLE tasks_items 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('low', 'normal', 'medium', 'high', NULL));

-- Tasks status validation
ALTER TABLE tasks_items 
ADD CONSTRAINT check_status 
CHECK (status IN ('open', 'closed', NULL));

-- Notes folder color validation
ALTER TABLE notes_folders 
ADD CONSTRAINT check_color_format 
CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color IS NULL);
```

### 3.3 RLS (Row Level Security)

**Проверить:** Включен ли RLS для всех таблиц?

**Должно быть для:**
- ✅ notes_folders (есть в миграции)
- ⚠️ tasks_items (проверить)
- ⚠️ finance_entries (проверить)
- ⚠️ finance_categories (проверить)
- ⚠️ notes (проверить)
- ⚠️ projects (проверить)

**Пример RLS политик для tasks:**

```sql
ALTER TABLE tasks_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON tasks_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks" ON tasks_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks_items
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.4 Мониторинг производительности

**Создать функцию для проверки медленных запросов:**

```sql
-- Включить pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Запрос для поиска медленных запросов
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- медленнее 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 3.5 Бэкапы и миграции

**Рекомендация:** Использовать систему миграций

**Варианты:**
1. Supabase Migration System (встроенный)
2. Flyway
3. Liquibase
4. Custom migration runner

**Структура:**
```
migrations/
  ├── 001_initial_schema.sql
  ├── 002_add_finance_currency.sql
  ├── 003_add_finance_position.sql
  ├── 004_add_notes_folders.sql
  ├── 005_add_tasks_description.sql
  ├── 006_add_tasks_meta.sql
  └── 007_tasks_project_nullable.sql
```

### 3.6 Транзакции

**Проблема:** SQL файлы не обернуты в транзакции

**Рекомендация:** Добавить в начало каждого файла:

```sql
BEGIN;

-- Migration code here

COMMIT;
```

Это гарантирует atomicity - либо все изменения применяются, либо ничего.

---

## 4. Тестирование миграций

### 4.1 Проверка выполнения

```sql
-- Проверить существование таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Проверить колонки tasks_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks_items';

-- Проверить индексы
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'finance_entries';

-- Проверить constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'finance_entries';

-- Проверить RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notes_folders';
```

### 4.2 Rollback скрипты

**Рекомендация:** Создать rollback для каждой миграции

**Пример для finance_entries_add_currency:**

```sql
-- rollback_schema_finance_entries_add_currency.sql
BEGIN;

DROP INDEX IF EXISTS idx_finance_entries_currency;

ALTER TABLE finance_entries 
DROP CONSTRAINT IF EXISTS check_currency;

ALTER TABLE finance_entries 
DROP COLUMN IF EXISTS currency;

COMMIT;
```

---

## 5. Оптимизация запросов в коде

### 5.1 Проверить использование индексов

**В Finance.tsx:**
```typescript
// Запрос должен использовать индекс year+month
const { data } = await supabase
  .from('finance_entries')
  .select('*')
  .eq('year', year)
  .eq('month', month)
  .eq('user_id', userId)
```

**Проверить EXPLAIN:**
```sql
EXPLAIN ANALYZE
SELECT * FROM finance_entries
WHERE year = 2024 AND month = 10 AND user_id = '...';
```

Должен показывать `Index Scan` а не `Seq Scan`.

### 5.2 N+1 Queries problem

**Проблема:** Загрузка связанных данных в цикле

**Плохо:**
```typescript
const tasks = await supabase.from('tasks_items').select('*')

for (const task of tasks) {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', task.project_id)
    .single()
}
```

**Хорошо:**
```typescript
const { data: tasks } = await supabase
  .from('tasks_items')
  .select('*, projects(*)')  // JOIN в одном запросе
```

### 5.3 Pagination

**Для больших наборов данных:**

```typescript
const { data, count } = await supabase
  .from('finance_entries')
  .select('*', { count: 'exact' })
  .range(0, 99)  // Первые 100 записей
```

---

## 6. Безопасность

### 6.1 SQL Injection

**Проверка:** Supabase клиент защищает от SQL injection ✅

**НО проверить нет ли raw SQL:**

```typescript
// ❌ Плохо - если где-то используется
const sql = `SELECT * FROM tasks WHERE title = '${userInput}'`

// ✅ Хорошо - Supabase автоматически экранирует
await supabase.from('tasks').select('*').eq('title', userInput)
```

### 6.2 RLS включен везде

**Проверить для всех таблиц:**

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Все должны иметь `rowsecurity = true`.

---

## 7. Итоговые рекомендации

### 🔴 Критично

1. ✅ **Добавить индексы для часто используемых колонок**
   - tasks_items: date, status, priority, project_id
   - finance_entries: year, month, user_id

2. ✅ **Добавить constraints для валидации данных**
   - priority, status, color

3. ✅ **Включить RLS для всех таблиц**
   - Проверить tasks_items, finance_entries, notes, projects

### 🟡 Важно

4. ⚠️ **Создать rollback скрипты**

5. ⚠️ **Обернуть миграции в транзакции**

6. ⚠️ **Организовать миграции в систему версионирования**

### 🟢 Желательно

7. ⚠️ **Добавить full-text search для description**

8. ⚠️ **Создать таблицу валют (вместо CHECK constraint)**

9. ⚠️ **Настроить мониторинг медленных запросов**

---

## Заключение

**Положительное:**
- ✅ Миграции написаны правильно и безопасно (`IF NOT EXISTS`)
- ✅ notes_folders имеет полную настройку RLS
- ✅ Правильное использование DEFAULT, CASCADE, SET NULL
- ✅ Есть комментарии в коде
- ✅ Использование JSONB для гибкости (todos)

**Требует внимания:**
- 🔴 Отсутствие некоторых индексов
- 🔴 Отсутствие constraints для валидации
- 🟡 RLS нужно проверить для всех таблиц
- 🟡 Миграции не в транзакциях
- 🟡 Нет rollback скриптов

**Общая оценка:** 8/10

Схема базы данных хорошо спроектирована, но нуждается в дополнительных индексах и constraints для оптимизации и валидации.

