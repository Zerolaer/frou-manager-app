# WeekBoard - Drag & Drop Weekly Task Calendar

Полнофункциональный компонент для перетаскивания задач в недельном календаре с поддержкой accessibility, touch-устройств и оптимистичных обновлений.

## Особенности

- ✅ **Drag & Drop**: Перетаскивание между колонками и внутри колонок
- ✅ **Accessibility**: Полная поддержка клавиатуры и экранных читалок
- ✅ **Touch Support**: Отличная работа на мобильных устройствах
- ✅ **Optimistic UI**: Мгновенные обновления с откатом при ошибках
- ✅ **Customizable**: Настраиваемые рендеры карточек и заголовков
- ✅ **Performance**: Оптимизирован для больших объемов данных
- ✅ **TypeScript**: Полная типизация

## Установка

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Быстрый старт

```tsx
import { WeekBoard } from './components/tasks/WeekBoard'
import { Card, Day } from './components/tasks/types'

const days: Day[] = [
  {
    id: 'monday',
    date: '2024-01-15',
    title: 'Понедельник',
    cards: [
      {
        id: 'task-1',
        title: 'Планирование спринта',
        meta: '9:00 - 10:00',
        color: '#3B82F6'
      }
    ]
  },
  // ... другие дни
]

function App() {
  const handleMove = async (move) => {
    await api.moveTask(move)
  }

  const handleReorder = async (reorder) => {
    await api.reorderTask(reorder)
  }

  return (
    <WeekBoard
      days={days}
      onMove={handleMove}
      onReorder={handleReorder}
      getCardId={(card) => card.id}
    />
  )
}
```

## API

### WeekBoard Props

| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `days` | `Day[]` | ✅ | Массив дней с задачами |
| `onMove` | `(move: MoveOperation) => Promise<void>` | ✅ | Callback для перемещения между днями |
| `onReorder` | `(reorder: ReorderOperation) => Promise<void>` | ✅ | Callback для изменения порядка |
| `getCardId` | `(card: Card) => string` | ✅ | Функция получения ID карточки |
| `renderCard` | `(card: Card) => React.ReactNode` | ❌ | Кастомный рендер карточки |
| `renderDayHeader` | `(day: Day) => React.ReactNode` | ❌ | Кастомный рендер заголовка дня |
| `allowDrop` | `(card: Card, targetDay: Day) => boolean` | ❌ | Функция проверки разрешенности перетаскивания |
| `className` | `string` | ❌ | CSS класс для контейнера |

### Типы данных

```typescript
interface Card {
  id: string
  title: string
  meta?: string
  color?: string
  pinned?: boolean
  disabled?: boolean
}

interface Day {
  id: string
  date: string
  title?: string
  cards: Card[]
}

interface MoveOperation {
  cardId: string
  fromDay: string
  fromIndex: number
  toDay: string
  toIndex: number
}

interface ReorderOperation {
  cardId: string
  day: string
  fromIndex: number
  toIndex: number
}
```

## Accessibility

### Клавиатурная навигация

- `Tab` - Переход между карточками
- `Enter` или `Space` - Начать перетаскивание
- `Arrow Keys` - Навигация между позициями
- `Escape` - Отменить перетаскивание

### ARIA атрибуты

Компонент автоматически добавляет необходимые ARIA атрибуты:

- `role="list"` и `role="listitem"` для колонок и карточек
- `aria-grabbed` для перетаскиваемых элементов
- `aria-live` регионы для объявлений экранным читалкам
- `aria-label` и `aria-describedby` для описания элементов

## Кастомизация

### Кастомный рендер карточки

```tsx
const customCardRenderer = (card: Card) => (
  <div className="custom-card">
    <h3>{card.title}</h3>
    <p>{card.meta}</p>
    {card.color && (
      <div 
        className="color-indicator"
        style={{ backgroundColor: card.color }}
      />
    )}
  </div>
)

<WeekBoard
  // ... другие props
  renderCard={customCardRenderer}
/>
```

### Ограничения перетаскивания

```tsx
const allowDrop = (card: Card, targetDay: Day) => {
  // Нельзя перемещать отключенные задачи
  if (card.disabled) return false
  
  // Нельзя перемещать в определенные дни
  if (targetDay.id === 'weekend') return false
  
  return true
}

<WeekBoard
  // ... другие props
  allowDrop={allowDrop}
/>
```

## Интеграция с бэкендом

### API функции

```typescript
// Перемещение между днями
const moveTask = async (move: MoveOperation) => {
  await fetch('/api/tasks/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  })
}

// Изменение порядка
const reorderTask = async (reorder: ReorderOperation) => {
  await fetch('/api/tasks/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reorder)
  })
}
```

### Обработка ошибок

Компонент автоматически обрабатывает ошибки API:

1. Применяет оптимистичное обновление
2. При ошибке откатывает изменения
3. Показывает уведомление об ошибке
4. Объявляет ошибку экранным читалкам

## Производительность

### Оптимизации

- `React.memo` для предотвращения лишних ре-рендеров
- Виртуализация для больших списков (опционально)
- Debounced обновления
- Batch операции

### Виртуализация

Для больших объемов данных используйте `react-virtual`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

// В DayColumn компоненте
const virtualizer = useVirtualizer({
  count: cards.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
})
```

## Тестирование

### Unit тесты

```tsx
import { render, fireEvent, screen } from '@testing-library/react'
import { WeekBoard } from './WeekBoard'

test('should move card between days', async () => {
  const onMove = jest.fn().mockResolvedValue(undefined)
  
  render(
    <WeekBoard
      days={sampleDays}
      onMove={onMove}
      onReorder={jest.fn()}
      getCardId={(card) => card.id}
    />
  )
  
  // Симулируем перетаскивание
  const card = screen.getByText('Task 1')
  fireEvent.mouseDown(card)
  fireEvent.mouseMove(card, { clientX: 300 })
  fireEvent.mouseUp(card)
  
  expect(onMove).toHaveBeenCalledWith({
    cardId: 'task-1',
    fromDay: 'monday',
    fromIndex: 0,
    toDay: 'tuesday',
    toIndex: 0
  })
})
```

### E2E тесты

```typescript
// Playwright
test('drag and drop workflow', async ({ page }) => {
  await page.goto('/week-board')
  
  const card = page.locator('[data-testid="task-1"]')
  const targetColumn = page.locator('[data-testid="day-tuesday"]')
  
  await card.dragTo(targetColumn)
  
  await expect(page.locator('[data-testid="day-tuesday"] [data-testid="task-1"]'))
    .toBeVisible()
})
```

## Архитектурные решения

### Почему @dnd-kit?

1. **Accessibility**: Встроенная поддержка клавиатуры и экранных читалок
2. **Performance**: Оптимизирован для больших списков
3. **Touch Support**: Отличная работа на мобильных устройствах
4. **Modularity**: Можно расширять плагинами
5. **TypeScript**: Отличная типизация из коробки

### State Management

- **Optimistic Updates**: UI обновляется мгновенно
- **Rollback on Error**: При ошибке возвращается исходное состояние
- **External State Sync**: Поддержка внешнего управления состоянием

### CSS Architecture

- **Tailwind Classes**: Utility-first подход
- **CSS Variables**: Для кастомизации цветов и размеров
- **Responsive Design**: Адаптивность из коробки

## Troubleshooting

### Частые проблемы

1. **Карточки не перетаскиваются**
   - Проверьте, что `getCardId` возвращает уникальные ID
   - Убедитесь, что карточки не отключены (`disabled: true`)

2. **Ошибки accessibility**
   - Добавьте `aria-label` для кастомных рендеров
   - Проверьте, что все интерактивные элементы доступны с клавиатуры

3. **Проблемы с производительностью**
   - Используйте `React.memo` для карточек
   - Рассмотрите виртуализацию для больших списков

## Лицензия

MIT License

## Поддержка

Для вопросов и предложений создавайте issues в репозитории.
