# План отката функционала повторяющихся задач

## Что будет изменено:

### 1. База данных
- **Новая таблица**: `recurring_tasks`
- **Изменение**: Добавление поля `recurring_task_id` в таблицу `tasks_items`

### 2. Файлы кода
- **Новые файлы**:
  - `src/types/recurring.ts` - типы для повторяющихся задач
  - `src/hooks/useRecurringTasks.ts` - логика работы с повторяющимися задачами
  - `src/components/RecurringTaskSettings.tsx` - компонент настройки повторений
  - `src/utils/recurringUtils.ts` - утилиты для работы с повторениями

- **Измененные файлы**:
  - `src/types/shared.ts` - добавление типов
  - `src/components/TaskAddModal.tsx` - добавление UI для повторений
  - `src/components/ModernTaskModal.tsx` - добавление UI для повторений
  - `src/components/TaskViewModal.tsx` - отображение информации о повторениях
  - `src/pages/Tasks.tsx` - логика загрузки повторяющихся задач

## Команды для отката:

### 1. Удалить новую таблицу (если создана):
```sql
DROP TABLE IF EXISTS recurring_tasks CASCADE;
```

### 2. Удалить добавленное поле (если добавлено):
```sql
ALTER TABLE tasks_items DROP COLUMN IF EXISTS recurring_task_id;
```

### 3. Откатить изменения в коде:
```bash
git checkout HEAD~1 -- src/types/shared.ts
git checkout HEAD~1 -- src/components/TaskAddModal.tsx
git checkout HEAD~1 -- src/components/ModernTaskModal.tsx
git checkout HEAD~1 -- src/components/TaskViewModal.tsx
git checkout HEAD~1 -- src/pages/Tasks.tsx
```

### 4. Удалить новые файлы:
```bash
rm -f src/types/recurring.ts
rm -f src/hooks/useRecurringTasks.ts
rm -f src/components/RecurringTaskSettings.tsx
rm -f src/utils/recurringUtils.ts
```

## Проверка после отката:
1. Убедиться, что приложение запускается без ошибок
2. Проверить создание обычных задач
3. Проверить редактирование задач
4. Убедиться, что нет ссылок на удаленные файлы

## Важные моменты:
- Все изменения делаются инкрементально
- Каждый этап можно откатить отдельно
- База данных изменяется только в конце, после тестирования UI
- Существующие задачи не затрагиваются
