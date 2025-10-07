# Быстрая интеграция новой системы загрузки

## За 5 минут

### Шаг 1: Импорты

```tsx
import { ContentLoader, StaggeredChildren } from '@/components/ContentLoader'
import { NotesGridSkeleton } from '@/components/skeletons/PageSkeletons'
import { useAsyncContentLoader } from '@/hooks/useContentTransition'
```

### Шаг 2: Замените старый код

**Было:**
```tsx
const [loading, setLoading] = useState(true)
const [notes, setNotes] = useState([])

useEffect(() => {
  fetchNotes().then(data => {
    setNotes(data)
    setLoading(false)
  })
}, [])

if (loading) return <div>Загрузка...</div>
return <div>{notes.map(...)}</div>
```

**Стало:**
```tsx
const { data: notes, isLoading, error } = useAsyncContentLoader(
  () => listNotes(),
  {
    minLoadingTime: 300,
    isEmpty: (notes) => notes.length === 0
  }
)

return (
  <ContentLoader
    loading={isLoading}
    error={error}
    empty={notes?.length === 0}
    emptyMessage="Нет заметок"
    skeleton={<NotesGridSkeleton />}
    minHeight="600px"
  >
    <StaggeredChildren stagger={50}>
      {notes?.map(note => <NoteCard key={note.id} note={note} />)}
    </StaggeredChildren>
  </ContentLoader>
)
```

### Результат

✅ Плавные transitions
✅ Skeleton с правильными размерами
✅ Нет layout shift
✅ Постепенное появление карточек
✅ Красивые состояния error/empty

## Доступные Skeleton компоненты

```tsx
import {
  DashboardSkeleton,      // Для Home страницы
  TasksWeekSkeleton,      // Для Tasks недельной доски
  FinanceTableSkeleton,   // Для Finance таблицы
  NotesGridSkeleton,      // Для Notes grid
  GoalsListSkeleton,      // Для Goals списка
  CardSkeleton           // Универсальный
} from '@/components/skeletons/PageSkeletons'
```

## Мгновенное улучшение

Даже если просто обернуть текущий код в `ContentLoader` - уже будет лучше:

```tsx
<ContentLoader
  loading={loading}
  skeleton={<CardSkeleton count={5} />}
  fadeIn={true}
>
  {/* Ваш существующий код */}
  {items.map(...)}
</ContentLoader>
```

## Для длинных списков (100+ элементов)

```tsx
import { OptimizedContainer } from '@/components/ContentLoader'

<OptimizedContainer>
  {/* Будет рендериться только видимое */}
  {bigList.map(...)}
</OptimizedContainer>
```

## Поддержка браузеров

- **Chrome 111+, Edge 111+**: Полная поддержка (View Transitions API)
- **Firefox, Safari**: Работает с fallback (обычный fade-in)
- **Старые браузеры**: Graceful degradation

Все работает везде, просто по-разному плавно! 🎨


