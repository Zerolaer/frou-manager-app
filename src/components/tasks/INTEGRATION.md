# WeekBoard Integration Guide

## Быстрая интеграция в существующий проект

### 1. Установка зависимостей

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. Добавление в ваш проект

```tsx
// В вашем компоненте
import { WeekBoard } from '@/components/tasks'
import '@/components/tasks/WeekBoard.css'

// Преобразование ваших данных в формат WeekBoard
const convertToWeekBoardFormat = (yourTasks: YourTaskType[]) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  
  return days.map(dayId => ({
    id: dayId,
    date: getDateForDay(dayId), // ваша функция получения даты
    title: getDayTitle(dayId),  // ваша функция получения названия дня
    cards: yourTasks
      .filter(task => task.day === dayId)
      .map(task => ({
        id: task.id,
        title: task.title,
        meta: task.description,
        color: task.color,
        pinned: task.pinned,
        disabled: task.completed
      }))
  }))
}

// API функции для интеграции с вашим бэкендом
const handleMove = async (move: MoveOperation) => {
  // TODO: Замените на ваш API вызов
  await fetch('/api/tasks/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: move.cardId,
      fromDay: move.fromDay,
      toDay: move.toDay,
      fromIndex: move.fromIndex,
      toIndex: move.toIndex
    })
  })
}

const handleReorder = async (reorder: ReorderOperation) => {
  // TODO: Замените на ваш API вызов
  await fetch('/api/tasks/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: reorder.cardId,
      day: reorder.day,
      fromIndex: reorder.fromIndex,
      toIndex: reorder.toIndex
    })
  })
}

// Использование в компоненте
function YourTaskPage() {
  const [tasks, setTasks] = useState<YourTaskType[]>([])
  const days = convertToWeekBoardFormat(tasks)

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

### 3. Кастомизация для вашего дизайна

```tsx
// Кастомный рендер карточки
const yourCardRenderer = (card: Card) => (
  <div className="your-card-style">
    <h3>{card.title}</h3>
    <p>{card.meta}</p>
    {card.color && (
      <div 
        className="your-color-indicator"
        style={{ backgroundColor: card.color }}
      />
    )}
  </div>
)

// Кастомный рендер заголовка дня
const yourDayHeaderRenderer = (day: Day) => (
  <div className="your-day-header">
    <h2>{day.title}</h2>
    <span>{day.cards.length} задач</span>
  </div>
)

<WeekBoard
  days={days}
  onMove={handleMove}
  onReorder={handleReorder}
  getCardId={(card) => card.id}
  renderCard={yourCardRenderer}
  renderDayHeader={yourDayHeaderRenderer}
/>
```

### 4. Интеграция с вашим состоянием

```tsx
function YourTaskPage() {
  const [tasks, setTasks] = useState<YourTaskType[]>([])
  
  // Обновление состояния после успешного перемещения
  const handleMove = async (move: MoveOperation) => {
    try {
      // Оптимистичное обновление
      setTasks(prev => {
        const newTasks = [...prev]
        const taskIndex = newTasks.findIndex(t => t.id === move.cardId)
        if (taskIndex !== -1) {
          newTasks[taskIndex] = {
            ...newTasks[taskIndex],
            day: move.toDay,
            position: move.toIndex
          }
        }
        return newTasks
      })
      
      // API вызов
      await yourApi.moveTask(move)
      
      // При необходимости - обновить с сервера
      // const updatedTasks = await yourApi.getTasks()
      // setTasks(updatedTasks)
      
    } catch (error) {
      // При ошибке - откатить оптимистичное обновление
      setTasks(await yourApi.getTasks())
      throw error // WeekBoard покажет ошибку пользователю
    }
  }

  return (
    <WeekBoard
      days={convertToWeekBoardFormat(tasks)}
      onMove={handleMove}
      onReorder={handleReorder}
      getCardId={(card) => card.id}
    />
  )
}
```

### 5. Бизнес-правила и ограничения

```tsx
// Ограничения перетаскивания
const allowDrop = (card: Card, targetDay: Day) => {
  // Нельзя перемещать завершенные задачи
  if (card.disabled) return false
  
  // Нельзя перемещать в выходные
  if (targetDay.id === 'saturday' || targetDay.id === 'sunday') {
    return false
  }
  
  // Закрепленные задачи можно перемещать только в рабочие дни
  if (card.pinned && targetDay.id === 'friday') {
    return false
  }
  
  return true
}

<WeekBoard
  days={days}
  onMove={handleMove}
  onReorder={handleReorder}
  getCardId={(card) => card.id}
  allowDrop={allowDrop}
/>
```

## Архитектурные решения

### Почему @dnd-kit?

1. **Accessibility First**: Встроенная поддержка клавиатуры и экранных читалок
2. **Performance**: Оптимизирован для больших списков, минимум ре-рендеров
3. **Touch Support**: Отличная работа на мобильных устройствах
4. **TypeScript**: Полная типизация из коробки
5. **Modular**: Можно расширять плагинами и кастомизировать

### State Management

- **Optimistic Updates**: UI обновляется мгновенно для лучшего UX
- **Error Rollback**: При ошибке автоматически возвращается исходное состояние
- **External Sync**: Поддержка внешнего управления состоянием

### Performance Optimizations

- `React.memo` для предотвращения лишних ре-рендеров
- Виртуализация для больших списков (опционально)
- Debounced API вызовы
- Batch операции для множественных обновлений

## Troubleshooting

### Частые проблемы

1. **Карточки не перетаскиваются**
   - Проверьте уникальность ID в `getCardId`
   - Убедитесь, что карточки не отключены

2. **Ошибки TypeScript**
   - Убедитесь, что типы импортированы правильно
   - Проверьте соответствие ваших данных интерфейсам

3. **Проблемы со стилями**
   - Импортируйте `WeekBoard.css`
   - Проверьте конфликты с вашими CSS классами

### Отладка

```tsx
// Включить логирование для отладки
const handleMove = async (move: MoveOperation) => {
  console.log('Moving task:', move)
  try {
    await yourApi.moveTask(move)
    console.log('Move successful')
  } catch (error) {
    console.error('Move failed:', error)
    throw error
  }
}
```

## Миграция с других DnD библиотек

### С react-beautiful-dnd

```tsx
// Было
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

// Стало
import { WeekBoard } from '@/components/tasks'

// Преобразование данных
const convertFromBeautifulDnd = (result) => ({
  cardId: result.draggableId,
  fromDay: result.source.droppableId,
  fromIndex: result.source.index,
  toDay: result.destination.droppableId,
  toIndex: result.destination.index
})
```

### С HTML5 DnD

```tsx
// HTML5 DnD требует больше кода для accessibility
// WeekBoard предоставляет это из коробки
```

## Поддержка

Для вопросов и предложений:
- Создавайте issues в репозитории
- Проверьте документацию @dnd-kit
- Изучите примеры в `example.data.tsx`
