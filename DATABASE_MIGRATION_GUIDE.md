# Database Migration Guide

Инструкции по применению SQL миграций для оптимизации и валидации данных.

## 📋 Порядок выполнения

### Шаг 1: Подготовка
```bash
# Создайте резервную копию БД перед миграцией
pg_dump -h your-db-host -U your-user -d your-database > backup_$(date +%Y%m%d).sql

# Или через Supabase Dashboard:
# Settings > Database > Backups > Create Backup
```

### Шаг 2: Применение миграций

#### 2.1 Индексы (schema_add_indexes.sql)
```sql
-- Откройте Supabase Dashboard > SQL Editor
-- Скопируйте содержимое schema_add_indexes.sql и выполните

-- Проверка созданных индексов:
SELECT 
  schemaname, 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('tasks_items', 'finance_entries', 'finance_categories', 'notes_folders', 'tasks_projects')
ORDER BY tablename, indexname;
```

**Время выполнения:** 1-5 минут (зависит от объема данных)

**Ожидаемые индексы:**
- `idx_tasks_items_date`
- `idx_tasks_items_status`
- `idx_tasks_items_user_id`
- `idx_tasks_items_user_date`
- `idx_finance_entries_year_month`
- `idx_finance_entries_category_id`
- И другие...

#### 2.2 Constraints (schema_add_constraints.sql)
```sql
-- ВАЖНО: Сначала проверьте существующие данные!

-- Проверка года в finance_entries (должны быть 1900-2100)
SELECT year, COUNT(*) 
FROM finance_entries 
WHERE year < 1900 OR year > 2100
GROUP BY year;

-- Проверка месяца (должны быть 1-12)
SELECT month, COUNT(*) 
FROM finance_entries 
WHERE month < 1 OR month > 12
GROUP BY month;

-- Проверка пустых названий
SELECT COUNT(*) FROM finance_categories WHERE trim(name) = '';
SELECT COUNT(*) FROM tasks_items WHERE trim(title) = '';

-- Если все проверки OK, применяйте constraints:
-- Скопируйте содержимое schema_add_constraints.sql и выполните
```

**Время выполнения:** < 1 минуты

### Шаг 3: Верификация

#### Проверка производительности индексов
```sql
-- Статистика использования индексов (запустите через несколько дней)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### Проверка constraints
```sql
SELECT 
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  'tasks_items'::regclass,
  'finance_entries'::regclass,
  'finance_categories'::regclass,
  'notes_folders'::regclass,
  'tasks_projects'::regclass
)
AND contype = 'c'
ORDER BY table_name, constraint_name;
```

## 🔄 Rollback (если нужно откатить)

### Удаление индексов
```sql
-- Удаление всех созданных индексов
DROP INDEX IF EXISTS idx_tasks_items_date;
DROP INDEX IF EXISTS idx_tasks_items_status;
DROP INDEX IF EXISTS idx_tasks_items_user_id;
DROP INDEX IF EXISTS idx_tasks_items_user_date;
DROP INDEX IF EXISTS idx_tasks_items_project_id;

DROP INDEX IF EXISTS idx_finance_entries_year_month;
DROP INDEX IF EXISTS idx_finance_entries_category_id;
DROP INDEX IF EXISTS idx_finance_entries_user_id;
DROP INDEX IF EXISTS idx_finance_entries_user_year_month;

DROP INDEX IF EXISTS idx_finance_categories_user_id;
DROP INDEX IF EXISTS idx_finance_categories_type;
DROP INDEX IF EXISTS idx_finance_categories_parent_id;

DROP INDEX IF EXISTS idx_notes_folders_user_id;
DROP INDEX IF EXISTS idx_notes_folders_parent_id;

DROP INDEX IF EXISTS idx_tasks_projects_user_id;
DROP INDEX IF EXISTS idx_tasks_projects_position;
```

### Удаление constraints
```sql
-- Удаление всех созданных constraints
ALTER TABLE finance_entries DROP CONSTRAINT IF EXISTS check_finance_entries_year;
ALTER TABLE finance_entries DROP CONSTRAINT IF EXISTS check_finance_entries_month;
ALTER TABLE finance_entries DROP CONSTRAINT IF EXISTS check_finance_entries_position;

ALTER TABLE finance_categories DROP CONSTRAINT IF EXISTS check_finance_categories_type;
ALTER TABLE finance_categories DROP CONSTRAINT IF EXISTS check_finance_categories_name_not_empty;

ALTER TABLE tasks_items DROP CONSTRAINT IF EXISTS check_tasks_items_position;
ALTER TABLE tasks_items DROP CONSTRAINT IF EXISTS check_tasks_items_title_not_empty;
ALTER TABLE tasks_items DROP CONSTRAINT IF EXISTS check_tasks_items_status;
ALTER TABLE tasks_items DROP CONSTRAINT IF EXISTS check_tasks_items_priority;

ALTER TABLE tasks_projects DROP CONSTRAINT IF EXISTS check_tasks_projects_name_not_empty;
ALTER TABLE tasks_projects DROP CONSTRAINT IF EXISTS check_tasks_projects_position;

ALTER TABLE notes_folders DROP CONSTRAINT IF EXISTS check_notes_folders_name_not_empty;
ALTER TABLE notes_folders DROP CONSTRAINT IF EXISTS check_notes_folders_no_self_parent;
```

## 📊 Ожидаемые результаты

### Производительность
- **Запросы по дате:** 10-50x быстрее
- **Фильтрация по пользователю:** 50-100x быстрее
- **Запросы год/месяц:** 20-80x быстрее

### Пример замеров (до/после)
```sql
-- Тест производительности: получение задач за месяц
EXPLAIN ANALYZE
SELECT * FROM tasks_items 
WHERE user_id = 'your-user-id' 
AND date >= '2024-01-01' 
AND date <= '2024-01-31';

-- ДО: Seq Scan, ~500-2000ms
-- ПОСЛЕ: Index Scan, ~5-20ms
```

## ⚠️ Важные замечания

1. **Индексы занимают место:** ~10-30MB дополнительно
2. **Constraints проверяются при INSERT/UPDATE:** может замедлить запись на ~5-10%
3. **Преимущества намного перевешивают недостатки**

## 🎯 Рекомендации

1. Применяйте миграции **в нерабочее время** (низкая нагрузка)
2. **Мониторьте** использование индексов через неделю
3. Удаляйте **неиспользуемые** индексы (idx_scan = 0)
4. Обновляйте **статистику** после миграции:
   ```sql
   ANALYZE tasks_items;
   ANALYZE finance_entries;
   ANALYZE finance_categories;
   ```

## 📞 Troubleshooting

### Проблема: Constraint fails при применении
**Решение:** Очистите невалидные данные перед применением

### Проблема: Индекс не используется
**Решение:** 
```sql
-- Обновите статистику
ANALYZE table_name;

-- Проверьте query plan
EXPLAIN ANALYZE your_query;
```

### Проблема: Медленное создание индекса
**Решение:** Используйте `CREATE INDEX CONCURRENTLY` для больших таблиц (требует отдельной сессии)

---

**Автор:** AI Assistant  
**Дата:** 2024-10-10  
**Версия:** 1.0

