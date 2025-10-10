# Отчет по неиспользуемому коду

## 1. Файлы для удаления

### 🔴 УДАЛИТЬ немедленно

#### src/pages/WeekBoardDemo.tsx
- **Размер:** 12 строк
- **Причина:** НЕ подключен к роутеру, демо-файл
- **Импорты:** Использует WeekBoardDemo из example.data.tsx
- **Действие:** `rm src/pages/WeekBoardDemo.tsx`

```typescript
// Весь файл можно удалить
import React from 'react'
import { WeekBoardDemo } from '@/components/tasks'
import '@/components/tasks/WeekBoard.css'

export default function WeekBoardDemoPage() {
  return <WeekBoardDemo />
}
```

---

### 🟡 УДАЛИТЬ в production (оставить для dev)

#### src/pages/Storybook.tsx
- **Размер:** 527 строк
- **Причина:** Демо-страница компонентов, используется только для разработки
- **Подключена к роутеру:** `/storybook`
- **TypeScript ошибок:** 10
- **Рекомендация:** 
  - Вариант 1: Удалить перед production build
  - Вариант 2: Исправить импорты и оставить для внутреннего использования
  - Вариант 3: Переместить в отдельный dev-only роут

**Для удаления из production:**

1. Удалить роут из `src/main.tsx`:
```typescript
// УДАЛИТЬ:
{ 
  path: 'storybook', 
  element: (
    <Suspense fallback={null}>
      <LazyPages.Storybook />
    </Suspense>
  )
},
```

2. Удалить из `src/utils/codeSplitting.ts`:
```typescript
// УДАЛИТЬ:
Storybook: lazy(() => import('@/pages/Storybook'))
```

3. Удалить переводы из локалей:
```json
// src/locales/en.json и ru.json - УДАЛИТЬ:
"storybook": "Storybook"
```

---

#### src/components/tasks/example.data.tsx
- **Размер:** 295 строк
- **Причина:** Демо-данные и примеры использования
- **Используется:** Только в WeekBoardDemo.tsx (который не используется)
- **Экспорты:**
  - `sampleDays: Day[]`
  - `mockApi` - mock API для демо
  - `WeekBoardDemo` компонент
  - `customCardRenderer`
  - `customDayHeaderRenderer`

**Рекомендация:**
- Переместить в `/src/examples/` или `/dev/`
- Или удалить, если примеры не нужны

**Для удаления:**
1. Удалить файл: `rm src/components/tasks/example.data.tsx`
2. Обновить `src/components/tasks/index.ts`:
```typescript
// УДАЛИТЬ эту строку:
export { WeekBoardDemo, sampleDays, mockApi, customCardRenderer, customDayHeaderRenderer } from './example.data'
```

---

## 2. Закомментированный код

### src/App.tsx (lines 16-22)

```typescript
// Loading component (unused, replaced by AppLoader)
// const AppLoading = () => (
//   <div className="flex items-center justify-center min-h-screen">
//     <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
//     <span className="ml-3 text-gray-600">{t('common.loading')}...</span>
//   </div>
// )
```

**Действие:** Удалить полностью, включая комментарий.

**Также удалить строку 24:**
```typescript
// Configuration is now hardcoded
```

---

## 3. Неиспользуемые конфигурации

### vite.config.ts - feature-goals

**Файл:** `vite.config.ts`
**Строки 53-55:**

```typescript
// УДАЛИТЬ - папка /components/goals/ не существует:
if (id.includes('/components/goals/')) {
  return 'feature-goals'
}
```

---

## 4. Неиспользуемые CSS (частично)

### src/components/tasks/WeekBoard.css
- **Используется только в:** WeekBoardDemo.tsx
- **WeekBoardDemo.tsx:** Не используется в production
- **Действие:** Если удаляете WeekBoardDemo.tsx, удалите и этот CSS

**Проверить, используется ли WeekBoard.css в других местах:**
```bash
grep -r "WeekBoard.css" src/
```

Если результат показывает только WeekBoardDemo.tsx и INTEGRATION.md - можно удалять.

---

## 5. Неиспользуемые типы и интерфейсы

### Найти неиспользуемые exports

Запустить для каждого файла с экспортами:

```bash
# Пример для проверки
grep -r "import.*SomeType" src/
```

**Потенциальные кандидаты (требуется проверка):**

1. `src/components/tasks/types.ts` - экспортирует много типов, возможно не все используются
2. `src/types/shared.ts` - общие типы
3. UI компоненты из `src/components/ui/index.ts`

**Нужно проверить каждый export:**

```typescript
// Пример проверки
// Для каждого экспорта в src/components/ui/index.ts:
export { Button } from './button'  // Используется ли?
export { Card } from './card'  // Используется ли?
```

---

## 6. Неиспользуемые импорты

### Проверка всех файлов

**Примеры найденных неиспользуемых импортов:**

#### src/components/ui/dialog.tsx:4
```typescript
import { Cross2Icon } from '@radix-ui/react-icons'
```
**Проверить:** Используется ли Cross2Icon в файле? Если нет - удалить.

---

## 7. Debug код (можно удалить в production)

### src/components/dashboard/widgets/ProductivityWidget.tsx

```typescript
// Line 82:
// Debug logging

// Line 173:
// Debug for Thursday
```

**Действие:** Найти эти console.log и удалить или обернуть в:
```typescript
if (import.meta.env.DEV) {
  console.log('Debug:', data)
}
```

### src/main.tsx (lines 28-65)

```typescript
// Expose cache utilities globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__cache = {
    // Clear all caches
    clearAll: async () => { ... },
    // ... остальные методы
  }
  
  console.log('💡 Cache utilities available: __cache.clearAll(), __cache.stats(), __cache.keys()')
}
```

**Рекомендация:** 
- Оставить для development
- Обернуть в `if (import.meta.env.DEV)` для исключения из production

```typescript
// ИСПРАВИТЬ:
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__cache = { ... }
}
```

### src/components/tasks/WeekBoard.tsx:306

```typescript
// TODO: Show toast notification for error
```

Найти этот TODO и реализовать или удалить комментарий.

---

## 8. Комментарии TODO (25 найдено)

### Высокий приоритет (функциональность отсутствует)

#### src/pages/Tasks.tsx
```typescript
// Line 207: TODO: Implement filter functionality
// Line 211: TODO: Implement calendar view
// Line 215: TODO: Implement search functionality
```

#### src/pages/Finance.tsx
```typescript
// Line 144: TODO: Implement export functionality
// Line 148: TODO: Implement import functionality
```

#### src/pages/Notes.tsx
```typescript
// Line 43: TODO: Implement filter functionality
// Line 47: TODO: Implement export functionality
```

**Действие:** 
- Реализовать функциональность ИЛИ
- Удалить UI кнопки, если функциональность не планируется

### Низкий приоритет (в примерах/demo)

#### src/components/tasks/example.data.tsx
```typescript
// Line 123: TODO: Replace with actual API call
// Line 142: TODO: Replace with actual API call
// Line 219: TODO: Refresh data from server if needed
// Line 240: TODO: Refresh data from server if needed
```

**Действие:** Удалить вместе с example.data.tsx

---

## 9. Комментарии в коде (информационные)

### Auto-save комментарии

Много комментариев типа:
```typescript
// Auto-save todos when they change
// Auto-save when adding todos
// Auto-save when toggling todos
```

**Файлы:**
- `src/components/ModernTaskModal.tsx`
- `src/components/TaskViewModal.tsx`

**Действие:** Оставить - это полезные комментарии для понимания кода.

---

## 10. Проверка неиспользуемых exports

### Автоматическая проверка

Можно использовать инструмент для поиска неиспользуемых exports:

```bash
# Установить
npm install -D ts-prune

# Запустить
npx ts-prune
```

Это покажет все exports, которые нигде не импортируются.

---

## Итоговый чеклист удалений

### Немедленно удалить:

- [ ] `src/pages/WeekBoardDemo.tsx`
- [ ] Закомментированный код в `src/App.tsx` (lines 16-22, 24)
- [ ] `feature-goals` проверка в `vite.config.ts` (lines 53-55)

### Рассмотреть удаление:

- [ ] `src/pages/Storybook.tsx` + роуты (для production)
- [ ] `src/components/tasks/example.data.tsx` + экспорты
- [ ] `src/components/tasks/WeekBoard.css` (если не используется)
- [ ] Debug console.log во всех компонентах

### Обернуть в DEV-only:

- [ ] `src/main.tsx` - cache utilities (lines 28-65)
- [ ] Debug logging в ProductivityWidget.tsx

### Реализовать или удалить:

- [ ] TODO в Tasks.tsx (filter, calendar, search)
- [ ] TODO в Finance.tsx (export, import)
- [ ] TODO в Notes.tsx (filter, export)
- [ ] TODO в WeekBoard.tsx (toast notification)

---

## Скрипт для быстрого удаления

```bash
#!/bin/bash
# cleanup.sh

# Удалить неиспользуемые файлы
rm src/pages/WeekBoardDemo.tsx

# Удалить example.data.tsx (опционально)
# rm src/components/tasks/example.data.tsx
# rm src/components/tasks/WeekBoard.css

# Запустить ts-prune для поиска неиспользуемых exports
npx ts-prune > unused-exports.txt

echo "✅ Cleanup completed. Check unused-exports.txt for more details."
```

---

## Потенциальная экономия

- **WeekBoardDemo.tsx:** ~12 строк
- **Storybook.tsx:** ~527 строк
- **example.data.tsx:** ~295 строк
- **Закомментированный код:** ~10 строк
- **Итого:** ~844 строки кода можно удалить

**Bundle size:** Потенциальное уменьшение на 20-30 KB (после минификации).

