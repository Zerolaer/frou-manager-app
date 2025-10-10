# Критические исправления (Priority 1)

Эти ошибки нужно исправить немедленно, так как они блокируют TypeScript компиляцию.

## 1. Установить недостающие зависимости

```bash
npm install @radix-ui/react-icons @dnd-kit/modifiers
```

**Зачем:**
- `@radix-ui/react-icons` используется в `src/components/ui/dialog.tsx:4`
- `@dnd-kit/modifiers` используется в `src/components/tasks/WeekBoard.tsx:33`

---

## 2. Создать vite-env.d.ts

**Создать файл:** `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_MOCK_API?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Это исправит 8 ошибок в:**
- `src/lib/env.ts` (5 ошибок)
- `src/config/dashboard.config.ts` (1 ошибка)
- `src/utils/performance.ts` (1 ошибка)
- `src/lib/env.ts:13` (NODE_ENV property)

---

## 3. Исправить Finance.tsx - Cat type

**Файл:** `src/pages/Finance.tsx`

**Проблема:** Интерфейс `Cat` требует поле `type`, но оно не всегда передается.

**Найти интерфейс Cat (вероятно в начале файла):**
```typescript
interface Cat {
  id: string
  name: string
  type: 'income' | 'expense'  // это поле требуется
  parent_id?: string | null
  values: number[]
  isCollapsed?: boolean
}
```

**Исправления на строках 227-228:**
```typescript
// БЫЛО:
const fetchedIncomes = incomesData.map((row: any) => ({
  id: row.id,
  name: row.name,
  parent_id: row.parent_id,
  values: Array(12).fill(0)
}))

// СТАЛО:
const fetchedIncomes = incomesData.map((row: any) => ({
  id: row.id,
  name: row.name,
  type: 'income' as const,  // Добавить
  parent_id: row.parent_id,
  values: Array(12).fill(0)
}))
```

**Аналогично на строках 249-250, 313-317 для expenses:**
```typescript
type: 'expense' as const  // Добавить для expenses
```

**Это исправит 18 ошибок в Finance.tsx**

---

## 4. Исправить MobileTasksDay.tsx - null checks

**Файл:** `src/components/tasks/MobileTasksDay.tsx`

**Строки 108, 112-113, 116:**

```typescript
// БЫЛО (line 108):
const foundTask = allTasksInMemory.find(t => t.id === task.id)

// СТАЛО:
const foundTask = allTasksInMemory.find(t => t.id === task.id)
if (!foundTask?.project_id) return  // Добавить проверку

// БЫЛО (lines 112-113):
await supabase.from('tasks_items').update({
  project_id: foundTask.project_id,
  position: foundTask.position
})

// СТАЛО:
await supabase.from('tasks_items').update({
  project_id: foundTask.project_id ?? null,  // Добавить ?? null
  position: foundTask.position ?? 0
})
```

**Это исправит 4 ошибки в MobileTasksDay.tsx**

---

## 5. Исправить ModernTaskModal.tsx

**Файл:** `src/components/ModernTaskModal.tsx`

### 5.1 Line 328 - String() не вызывается правильно

**Найти строку 328:**
```typescript
// БЫЛО (вероятно):
const value = String(someValue)

// Проверить контекст и исправить на:
const value = String(someValue ?? '')
// или
const value = typeof someValue === 'string' ? someValue : String(someValue)
```

### 5.2 Lines 610, 613 - created_at/updated_at

**Нужно добавить эти поля в интерфейс Task:**

**Найти интерфейс Task (вероятно в src/types/shared.ts):**
```typescript
interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  project_id?: string | null
  created_at?: string  // Добавить
  updated_at?: string  // Добавить
  // ... другие поля
}
```

**Это исправит 5 ошибок в ModernTaskModal.tsx**

---

## 6. Исправить Dropdown компоненты - type mismatches

### 6.1 ProjectDropdown.tsx (line 23)

**Файл:** `src/components/ProjectDropdown.tsx`

```typescript
// БЫЛО:
onChange={(value: string) => {  // Проблема: Dropdown передает string | number
  onValueChange(value)
}}

// СТАЛО:
onChange={(value: string | number) => {
  onValueChange(String(value))  // Преобразовать в string
}}
```

### 6.2 YearDropdown.tsx (line 18)

**Файл:** `src/components/YearDropdown.tsx`

```typescript
// БЫЛО:
onChange={(newValue) => {
  onYearChange(parseInt(newValue))  // newValue может быть number
}}

// СТАЛО:
onChange={(newValue: string | number) => {
  onYearChange(typeof newValue === 'number' ? newValue : parseInt(newValue))
}}
```

### 6.3 TypeDropdown, YearDropdown - ariaLabel

**Файлы:** 
- `src/components/TypeDropdown.tsx:24`
- `src/components/YearDropdown.tsx:20`
- `src/components/TaskViewModal.tsx:339`

**Проверить интерфейс Dropdown в `src/components/ui/Dropdown.tsx`:**

**Если там есть `ariaLabel` - оставить как есть.**

**Если там `aria-label` - исправить:**
```typescript
// БЫЛО:
<Dropdown
  ariaLabel="Select type"
/>

// СТАЛО:
<Dropdown
  aria-label="Select type"
/>
```

**Это исправит 6 ошибок в Dropdown компонентах**

---

## 7. Исправить tasks/CardItem.tsx (line 131)

**Файл:** `src/components/tasks/CardItem.tsx`

```typescript
// БЫЛО (line 131, вероятно):
someFunction()

// СТАЛО:
someFunction?.()  // Добавить optional chaining
// или
if (someFunction) {
  someFunction()
}
```

---

## 8. Исправить tasks/DayColumn.tsx (line 42)

**Файл:** `src/components/tasks/DayColumn.tsx`

**Проблема:** 'day' referenced in its own type annotation

```typescript
// БЫЛО (вероятно):
type DayProps = {
  day: typeof day  // Проблема: циклическая ссылка
}

// СТАЛО:
type DayProps = {
  day: Day  // Использовать импортированный тип
}
```

---

## 9. Исправить pages/Tasks.tsx (line 939)

**Файл:** `src/pages/Tasks.tsx`

```typescript
// БЫЛО (line 939, вероятно):
const result = TaskItem(data)  // TaskItem не функция

// СТАЛО:
const result = new TaskItem(data)  // Если это класс
// или
const result = taskItem  // Если это просто значение
```

---

## 10. Исправить lib/dataValidation.ts (lines 308, 312)

**Файл:** `src/lib/dataValidation.ts`

### Line 308:
```typescript
// БЫЛО:
const validateField = (field) => {  // Implicit any
  return validateFieldLogic(field)
}

// СТАЛО:
const validateField = (field: unknown): ValidationResult => {
  return validateFieldLogic(field)
}
```

### Line 312:
```typescript
// БЫЛО:
const result = fields.reduce((acc, field) => {  // Implicit any, wrong args
  return {...acc, [field.name]: validateField(field)}
})

// СТАЛО:
const result = fields.reduce<Record<string, ValidationResult>>((acc, field) => {
  return {...acc, [field.name]: validateField(field)}
}, {})  // Добавить initial value
```

---

## 11. Исправить lib/validation.ts (line 150)

**Файл:** `src/lib/validation.ts`

```typescript
// БЫЛО (line 150):
const errors = fieldErrors.map(...)  // fieldErrors possibly undefined

// СТАЛО:
const errors = fieldErrors?.map(...) ?? []
// или
const errors = (fieldErrors || []).map(...)
```

---

## 12. Исправить AccessibleComponents.tsx (line 132)

**Файл:** `src/components/AccessibleComponents.tsx`

```typescript
// БЫЛО (line 132):
const callback: (() => void) | null = someFunction

// СТАЛО:
const callback: (() => void) | null = someFunction ?? null
// или проверить где callback может быть undefined и исправить там
```

---

## 13. Исправить lib/monitoring.ts

### Line 143:
```typescript
// БЫЛО:
const priority: 1 = getPriority()  // Возвращает 0 | 1 | 2 | 3

// СТАЛО:
const priority: 0 | 1 | 2 | 3 = getPriority()
// или
const priority = getPriority() as 0 | 1 | 2 | 3
```

### Lines 183-184:
```typescript
// БЫЛО:
const navTiming = performance.timing as PerformanceNavigationTiming
const startTime = navTiming.navigationStart  // Property не существует

// СТАЛО:
const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
const startTime = navTiming.startTime ?? 0
```

---

## 14. Исправить lib/animations.ts (lines 240-241)

**Файл:** `src/lib/animations.ts`

```typescript
// БЫЛО (line 240):
const animation = {
  fillMode: 'forwards',  // Type string not assignable to FillMode
  iterations: 'infinite'  // Type string not assignable to number
}

// СТАЛО:
const animation = {
  fill: 'forwards' as FillMode,  // Используй 'fill' вместо 'fillMode'
  iterations: Infinity  // Используй Infinity вместо 'infinite'
}
```

---

## 15. Исправить dashboard/widgets/TasksStatsWidget.tsx

**Файл:** `src/components/dashboard/widgets/TasksStatsWidget.tsx`

**Lines 73, 78:**
```typescript
// БЫЛО:
tasks.filter(t => t.status === 'done' && t.project_id)  // project_id не существует

// Проверить тип tasks и добавить project_id:
type TaskStat = {
  id: any
  status: any
  project_id?: string | null  // Добавить это поле
}
```

---

## Проверка после исправлений

После всех исправлений запустить:

```bash
npx tsc --noEmit
```

Должно быть 0 ошибок или значительно меньше чем 70.

---

## Итого исправлений:

✅ 1. Установить 2 пакета
✅ 2. Создать vite-env.d.ts (8 ошибок)
✅ 3. Finance.tsx - Cat type (18 ошибок)
✅ 4. MobileTasksDay.tsx - null checks (4 ошибки)
✅ 5. ModernTaskModal.tsx (5 ошибок)
✅ 6. Dropdown components (6 ошибок)
✅ 7. CardItem.tsx (1 ошибка)
✅ 8. DayColumn.tsx (1 ошибка)
✅ 9. Tasks.tsx (1 ошибка)
✅ 10. dataValidation.ts (2 ошибки)
✅ 11. validation.ts (1 ошибка)
✅ 12. AccessibleComponents.tsx (1 ошибка)
✅ 13. monitoring.ts (3 ошибки)
✅ 14. animations.ts (2 ошибки)
✅ 15. TasksStatsWidget.tsx (2 ошибки)

**Всего: ~55-60 ошибок из 70+**

Оставшиеся ошибки связаны с Storybook.tsx (10 ошибок) - можно исправить или удалить файл.

