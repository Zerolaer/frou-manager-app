# Отчет по дублированию кода

## 1. Модальные компоненты для задач

### Обзор

Найдено **3 модальных компонента** для работы с задачами:

| Компонент | Размер | Назначение | Использование |
|-----------|--------|------------|---------------|
| **TaskAddModal** | 279 строк | Создание новой задачи | Tasks.tsx (2 места) |
| **ModernTaskModal** | 621 строка | Редактирование задачи | Tasks.tsx (2 места) |
| **TaskViewModal** | 526 строк | Просмотр/редактирование задачи | Tasks.tsx |

**Общий размер:** ~1426 строк кода

### Анализ дублирования

#### Общая функциональность (дублируется во всех 3):

1. **State управление:**
```typescript
// Все 3 компонента имеют:
const [title, setTitle] = useState('')
const [description, setDescription] = useState('')
const [priority, setPriority] = useState(...)
const [tag, setTag] = useState('')
const [todos, setTodos] = useState<Todo[]>([])
const [projectId, setProjectId] = useState('')
```

2. **Todo управление:**
```typescript
// Добавление todo
const handleAddTodo = () => {
  if (!todoText.trim()) return
  setTodos([...todos, { id: crypto.randomUUID(), text: todoText, done: false }])
  setTodoText('')
}

// Удаление todo
const handleRemoveTodo = (id: string) => {
  setTodos(todos.filter(t => t.id !== id))
}

// Переключение todo
const handleToggleTodo = (id: string) => {
  setTodos(todos.map(t => t.id === id ? {...t, done: !t.done} : t))
}
```

3. **Supabase операции:**
```typescript
// Все компоненты работают с Supabase
await supabase.from('tasks_items').update/insert/delete
```

4. **Компоненты UI:**
- `ProjectDropdown`
- `DateDropdown`
- `CoreInput`, `CoreTextarea`
- `CoreMenu`
- Icons: `Plus`, `Trash2`, `Check`, `Calendar`, `Tag`

### Различия компонентов

#### TaskAddModal
- **UI:** Использует `UnifiedModal` (Modal system)
- **Цель:** Только создание новых задач
- **Особенности:**
  - Простой интерфейс
  - Меньше полей
  - Нет статуса (всегда 'open')

#### ModernTaskModal  
- **UI:** Использует `SideModal` (боковая панель)
- **Цель:** Редактирование существующих задач
- **Особенности:**
  - CSS анимации для checkboxes (lines 13-49)
  - Auto-save функциональность
  - Более богатый UI
  - created_at/updated_at отображение

#### TaskViewModal
- **UI:** Использует `SideModal`
- **Цель:** Просмотр и редактирование
- **Особенности:**
  - Переключение статуса (open/closed)
  - Dropdown меню для статуса
  - Удаление задачи
  - `CheckFinance` компонент

### Рекомендации

#### ❌ НЕ объединять компоненты
**Причина:** Компоненты служат разным целям и имеют разный UX.

#### ✅ Вынести общую логику

**Создать хук `useTaskForm.ts`:**

```typescript
// src/hooks/useTaskForm.ts
export function useTaskForm(initialTask?: Task) {
  const [title, setTitle] = useState(initialTask?.title || '')
  const [description, setDescription] = useState(initialTask?.description || '')
  const [priority, setPriority] = useState(initialTask?.priority || 'normal')
  const [tag, setTag] = useState(initialTask?.tag || '')
  const [todos, setTodos] = useState<Todo[]>(initialTask?.todos || [])
  const [projectId, setProjectId] = useState(initialTask?.project_id || '')
  
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('normal')
    setTag('')
    setTodos([])
    setProjectId('')
  }
  
  return {
    title, setTitle,
    description, setDescription,
    priority, setPriority,
    tag, setTag,
    todos, setTodos,
    projectId, setProjectId,
    resetForm
  }
}
```

**Создать хук `useTodoManager.ts`:**

```typescript
// src/hooks/useTodoManager.ts
export function useTodoManager(initialTodos: Todo[] = []) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [todoText, setTodoText] = useState('')
  
  const addTodo = useCallback(() => {
    if (!todoText.trim()) return
    setTodos(prev => [...prev, { 
      id: crypto.randomUUID(), 
      text: todoText, 
      done: false 
    }])
    setTodoText('')
  }, [todoText])
  
  const removeTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])
  
  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? {...t, done: !t.done} : t
    ))
  }, [])
  
  return {
    todos,
    setTodos,
    todoText,
    setTodoText,
    addTodo,
    removeTodo,
    toggleTodo
  }
}
```

**Потенциальная экономия:** ~200-300 строк кода

---

## 2. Модальные UI компоненты

### Обзор

| Компонент | Размер | Назначение |
|-----------|--------|------------|
| **Modal** | 166 строк | Базовая центральная модалка |
| **SideModal** | 113 строк | Боковая модалка |
| **dialog** | ~100 строк | Radix UI Dialog обертка |
| **ModalSystem** | ? строк | Унифицированная система модалок |

### Общая функциональность

#### Все компоненты имеют:

1. **Portal рендеринг:**
```typescript
createPortal(
  <div>...</div>,
  document.body
)
```

2. **Focus trap:**
```typescript
function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  // ... логика focus trap
}
```

3. **Keyboard handling:**
```typescript
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleEsc)
  return () => document.removeEventListener('keydown', handleEsc)
}, [onClose])
```

4. **Backdrop click:**
```typescript
const handleBackdropClick = (e: React.MouseEvent) => {
  if (closeOnOverlay && e.target === e.currentTarget) {
    onClose()
  }
}
```

5. **Анимации:**
```typescript
const [isVisible, setIsVisible] = useState(false)
const [isAnimating, setIsAnimating] = useState(false)

useEffect(() => {
  if (open) {
    setIsAnimating(true)
    setTimeout(() => setIsVisible(true), 10)
  } else {
    setIsVisible(false)
    setTimeout(() => setIsAnimating(false), 300)
  }
}, [open])
```

### Различия

| Функция | Modal | SideModal | dialog |
|---------|-------|-----------|--------|
| Расположение | Центр | Справа | Центр |
| Анимация | Fade + Scale | Slide-in | Radix |
| Размеры | 4 варианта | Full height | Auto |
| Header/Footer | Да | Да | Нет |

### Рекомендации

#### ✅ Оставить как есть
**Причина:** Компоненты служат разным UX целям:
- **Modal** - для коротких форм и подтверждений
- **SideModal** - для расширенных форм и редактирования
- **dialog** - для Radix UI интеграции

#### ⚠️ НО можно вынести общую логику

**Создать хук `useModalBehavior.ts`:**

```typescript
// src/hooks/useModalBehavior.ts
export function useModalBehavior(
  open: boolean,
  onClose: () => void,
  options: {
    closeOnEscape?: boolean
    closeOnBackdrop?: boolean
    enableFocusTrap?: boolean
  } = {}
) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Animation logic
  useEffect(() => {
    if (open) {
      setIsAnimating(true)
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])
  
  // Escape key
  useEffect(() => {
    if (!options.closeOnEscape) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose, options.closeOnEscape])
  
  // Focus trap
  useFocusTrap(options.enableFocusTrap && open, containerRef)
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (options.closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }
  
  return {
    isVisible,
    isAnimating,
    containerRef,
    handleBackdropClick
  }
}
```

**Потенциальная экономия:** ~100-150 строк кода

---

## 3. Dropdown компоненты

### Найдено несколько Dropdown компонентов:

1. **Dropdown** (`src/components/ui/Dropdown.tsx`)
2. **ProjectDropdown** (`src/components/ProjectDropdown.tsx`)
3. **TypeDropdown** (`src/components/TypeDropdown.tsx`)
4. **YearDropdown** (`src/components/YearDropdown.tsx`)
5. **DateDropdown** (`src/components/DateDropdown.tsx`)

### Анализ

**ProjectDropdown, TypeDropdown, YearDropdown** все используют базовый **Dropdown** компонент ✅

**Это правильный подход - нет дублирования.**

Пример:
```typescript
// TypeDropdown.tsx
return (
  <Dropdown
    options={typeOptions}
    value={type}
    onChange={onValueChange}
    placeholder="Type"
  />
)
```

---

## 4. Input компоненты

### Обзор

| Компонент | Размер | Назначение |
|-----------|--------|------------|
| **CoreInput** | ? | Базовый input |
| **CoreTextarea** | ? | Базовый textarea |
| **CoreMenu** | ? | Базовое меню |

**Используются во всех формах** ✅ - нет дублирования.

---

## 5. Дублирование в useEffect

### App.tsx - множественные useEffect

**Файл:** `src/App.tsx`

Найдено 4 useEffect подряд (lines 30-98):

```typescript
// useEffect #1 (lines 30-49): Redirect logic
useEffect(() => {
  const hasRedirected = sessionStorage.getItem('frovo_redirected')
  // ... 20 строк логики
}, [])

// useEffect #2 (lines 52-57): Save current page
useEffect(() => {
  const pathname = window.location.pathname
  if (pathname !== '/login') {
    localStorage.setItem('frovo_last_page', pathname)
  }
}, [])

// useEffect #3 (lines 63-71): Listen for year changes
React.useEffect(() => {
  const handleFinanceYearChanged = (event: CustomEvent) => {
    setCurrentYear(event.detail)
  }
  window.addEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
  return () => {
    window.removeEventListener('finance-year-changed', handleFinanceYearChanged as EventListener)
  }
}, [])

// useEffect #4 (lines 74-98): Apply mode classes
React.useEffect(() => {
  const pathname = window.location.pathname.toLowerCase()
  // ... 24 строки логики
}, [])
```

### Проблемы:

1. **useEffect #2 и #4** оба читают `window.location.pathname`
2. Можно объединить

### Рекомендация:

```typescript
// Объединить #2 и #4
useEffect(() => {
  const pathname = window.location.pathname
  
  // Save last page
  if (pathname !== '/login') {
    localStorage.setItem('frovo_last_page', pathname)
  }
  
  // Apply mode classes
  const lower = pathname.toLowerCase()
  document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'home-mode')
  
  if (lower.includes('tasks')) {
    document.body.classList.add('tasks-mode')
  } else if (lower.includes('finance')) {
    document.body.classList.add('finance-mode')
  } else if (lower.includes('notes')) {
    document.body.classList.add('notes-mode')
  } else if (lower === '/') {
    document.body.classList.add('home-mode')
  }
  
  return () => {
    document.body.classList.remove('tasks-mode', 'finance-mode', 'notes-mode', 'home-mode')
  }
}, [])
```

**Экономия:** ~10 строк

---

## 6. Повторяющиеся паттерны Supabase

### Паттерн запросов

**Повторяется во многих компонентах:**

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)

if (error) {
  console.error(error)
  return
}
```

### Рекомендация:

**Создать хук `useSupabaseTable.ts`:**

```typescript
export function useSupabaseTable<T>(tableName: string) {
  const getAll = async (userId: string) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
    
    if (error) throw error
    return data as T[]
  }
  
  const getById = async (id: string) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as T
  }
  
  const create = async (item: Partial<T>) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(item)
      .select()
      .single()
    
    if (error) throw error
    return data as T
  }
  
  const update = async (id: string, updates: Partial<T>) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as T
  }
  
  const remove = async (id: string) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
  
  return { getAll, getById, create, update, remove }
}
```

**Использование:**
```typescript
const tasks = useSupabaseTable<Task>('tasks_items')
const data = await tasks.getAll(userId)
await tasks.update(taskId, { title: 'New title' })
```

**Потенциальная экономия:** ~500+ строк кода

---

## 7. Повторяющиеся проверки

### User ID получение

**Повторяется в ~20+ местах:**

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return
const userId = user.id
```

### Рекомендация:

**Создать хук `useUser.ts`:**

```typescript
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { user, userId: user?.id, loading }
}
```

**Использование:**
```typescript
const { userId, loading } = useUser()
if (loading) return <Loader />
if (!userId) return null
```

---

## 8. Повторяющиеся типы

### Todo тип

**Определен в нескольких местах:**

- `src/components/TaskAddModal.tsx:9`
- `src/components/ModernTaskModal.tsx:10` (импорт из shared)
- `src/components/TaskViewModal.tsx:13` (импорт из shared)

**Хорошо:** Уже вынесен в `src/types/shared.ts` ✅

### Task тип

**Определен в нескольких местах:**

- `src/pages/Tasks.tsx`
- `src/components/TaskViewModal.tsx:15`
- Возможно в `src/types/shared.ts`

**Проверить и убедиться что Task используется из shared.ts везде.**

---

## Итоговые рекомендации

### Высокий приоритет

1. ✅ **Создать хуки для общей логики:**
   - `useTaskForm.ts` (~200 строк экономии)
   - `useTodoManager.ts` (~100 строк экономии)
   - `useUser.ts` (~50 строк экономии)
   - `useSupabaseTable.ts` (~500 строк экономии)

2. ✅ **Объединить useEffect в App.tsx** (~10 строк экономии)

3. ✅ **Убедиться что все типы в shared.ts**

### Средний приоритет

4. ⚠️ **Создать useModalBehavior** (~100 строк экономии)

### Низкий приоритет

5. ⚠️ **Рефакторинг модальных компонентов** (опционально)

---

## Потенциальная экономия

- **Хуки для форм:** ~300-400 строк
- **Хуки для Supabase:** ~500 строк
- **Хуки для модалок:** ~100-150 строк
- **Объединение useEffect:** ~10 строк
- **Итого:** ~910-1060 строк кода

**Процент сокращения:** ~15-20% от текущей кодовой базы задач/модалок.

---

## Заключение

**Положительное:**
- ✅ Dropdown компоненты правильно используют базовый Dropdown
- ✅ CoreInput/CoreTextarea используются везде
- ✅ Типы частично вынесены в shared.ts

**Требует рефакторинга:**
- 🔴 Дублирование логики в 3 модальных компонентах задач
- 🔴 Повторяющиеся Supabase паттерны
- 🟡 Множественные useEffect в App.tsx
- 🟡 User ID получение дублируется

**Общая оценка дублирования:** Умеренное (5/10)
Есть возможности для улучшения, но не критично.

