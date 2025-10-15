# Manual Testing Checklist

Используйте этот чеклист для ручного тестирования приложения перед релизом.

---

## 🔐 Security Testing

### Authentication
- [ ] Успешный логин с валидными credentials
- [ ] Ошибка при невалидных credentials
- [ ] Logout работает корректно
- [ ] Session сохраняется после обновления страницы
- [ ] Редирект на /login при отсутствии авторизации
- [ ] Protected routes недоступны без auth
- [ ] Auto-redirect на последнюю посещённую страницу

### Input Validation & XSS Protection
- [ ] Все текстовые поля экранируют HTML
- [ ] Script tags не выполняются в пользовательском вводе
- [ ] Проверка на `<script>alert('XSS')</script>` в:
  - [ ] Task title
  - [ ] Task description
  - [ ] Note title
  - [ ] Note content
  - [ ] Finance note
  - [ ] Project name
- [ ] Максимальная длина полей соблюдается
- [ ] Числовые поля принимают только числа
- [ ] Email валидация работает

### Data Access Control
- [ ] Пользователь видит только свои задачи
- [ ] Пользователь видит только свои заметки
- [ ] Пользователь видит только свои финансы
- [ ] Невозможно получить доступ к чужим данным через URL

---

## ✨ Functional Testing

### 📋 Tasks Module

#### CRUD Operations
- [ ] **Create Task:**
  - [ ] Простая задача создаётся
  - [ ] Задача с описанием создаётся
  - [ ] Задача с project создаётся
  - [ ] Задача с приоритетом создаётся
  - [ ] Валидация required полей работает
  - [ ] Задача появляется в списке сразу (optimistic update)

- [ ] **Read/View Tasks:**
  - [ ] Список задач отображается
  - [ ] Drag & drop работает
  - [ ] Weekly view отображает правильные даты
  - [ ] Task card показывает всю информацию
  - [ ] Subtasks отображаются

- [ ] **Update Task:**
  - [ ] Редактирование title работает
  - [ ] Редактирование description работает
  - [ ] Изменение status работает
  - [ ] Изменение priority работает
  - [ ] Перемещение между датами работает
  - [ ] Изменения сохраняются в БД

- [ ] **Delete Task:**
  - [ ] Удаление одиночной задачи
  - [ ] Confirmation modal показывается
  - [ ] Задача исчезает из списка
  - [ ] Recurring task deletion options

#### Advanced Features
- [ ] **Search:**
  - [ ] Поиск по title работает
  - [ ] Поиск по description работает
  - [ ] Поиск по todos работает
  - [ ] Debounce работает (не лагает)
  - [ ] Очистка поиска работает

- [ ] **Filter:**
  - [ ] Фильтр по project
  - [ ] Фильтр по status
  - [ ] Фильтр по priority
  - [ ] Фильтр по "has description"
  - [ ] Фильтр по "has todos"
  - [ ] Комбинация фильтров
  - [ ] Очистка фильтров

- [ ] **Calendar View:**
  - [ ] Calendar открывается
  - [ ] Показывает количество задач per day
  - [ ] Клик на дату переносит в weekly view
  - [ ] Текущий день выделен

- [ ] **Drag & Drop:**
  - [ ] Drag task между днями недели
  - [ ] Drag task внутри одного дня
  - [ ] Status обновляется после drop
  - [ ] Визуальная обратная связь при drag

### 💰 Finance Module

#### CRUD Operations
- [ ] **Create Entry:**
  - [ ] Income entry создаётся
  - [ ] Expense entry создаётся
  - [ ] Amount валидация (> 0)
  - [ ] Category выбирается
  - [ ] Subcategory выбирается
  - [ ] Note добавляется

- [ ] **View Entries:**
  - [ ] Monthly breakdown отображается
  - [ ] Hierarchical categories отображаются
  - [ ] Totals рассчитываются правильно
  - [ ] Grid navigation работает

- [ ] **Update Entry:**
  - [ ] Inline editing работает
  - [ ] Tab navigation работает
  - [ ] Enter сохраняет изменения
  - [ ] Escape отменяет изменения

- [ ] **Delete Entry:**
  - [ ] Delete работает
  - [ ] Totals пересчитываются

#### Advanced Features
- [ ] **Export:**
  - [ ] Export to JSON работает
  - [ ] Export to CSV работает
  - [ ] Exported data полная и корректная
  - [ ] Filename включает дату

- [ ] **Import:**
  - [ ] Import from JSON работает
  - [ ] Валидация imported data
  - [ ] Ошибки при invalid JSON
  - [ ] Confirmation перед import

- [ ] **Annual Statistics:**
  - [ ] Modal открывается
  - [ ] Статистика по месяцам
  - [ ] Charts отображаются
  - [ ] Totals правильные

- [ ] **Year Selector:**
  - [ ] Переключение года работает
  - [ ] Data обновляется
  - [ ] Year сохраняется в URL/state

- [ ] **Copy/Paste:**
  - [ ] Copy data работает
  - [ ] Paste data работает
  - [ ] Format сохраняется

### 📝 Notes Module

#### CRUD Operations
- [ ] **Create Note:**
  - [ ] Простая заметка создаётся
  - [ ] Note с content создаётся
  - [ ] Note в folder создаётся
  - [ ] Validation работает

- [ ] **View Notes:**
  - [ ] Список notes отображается
  - [ ] Virtual scrolling с 50+ notes
  - [ ] Folders отображаются
  - [ ] Pinned notes показываются сверху

- [ ] **Update Note:**
  - [ ] Title editing
  - [ ] Content editing
  - [ ] Rich text editing (если есть)
  - [ ] Pin/unpin работает
  - [ ] Folder change работает

- [ ] **Delete Note:**
  - [ ] Delete работает
  - [ ] Confirmation показывается

#### Advanced Features
- [ ] **Filter:**
  - [ ] Filter pinned notes
  - [ ] Filter by content
  - [ ] Комбинация фильтров
  - [ ] Clear filters

- [ ] **Export:**
  - [ ] Export to JSON
  - [ ] Export to Markdown
  - [ ] Exported content корректный

- [ ] **Folder Organization:**
  - [ ] Create folder
  - [ ] Rename folder
  - [ ] Delete folder
  - [ ] Move note between folders

### 🏠 Dashboard

- [ ] **Widgets:**
  - [ ] Overview widget отображается
  - [ ] Stats правильные
  - [ ] Recent activities показываются

- [ ] **Navigation:**
  - [ ] Links работают
  - [ ] Quick actions работают

---

## 🎨 UI/UX Testing

### Desktop (1920x1080)
- [ ] Layout корректный
- [ ] Нет горизонтального скролла
- [ ] Модальные окна центрированы
- [ ] Tooltips работают
- [ ] Hover states работают

### Tablet (iPad Air - 820x1180)
- [ ] Responsive layout
- [ ] Touch targets достаточно большие
- [ ] Navigation работает
- [ ] Modals адаптированы

### Mobile (iPhone 12 - 390x844)
- [ ] Mobile layout активируется
- [ ] Header скрыт/адаптирован
- [ ] Touch navigation работает
- [ ] Keyboard не перекрывает inputs
- [ ] No horizontal scroll
- [ ] Modals полноэкранные (или адаптированы)

### Mobile (Android - Pixel 5)
- [ ] Всё работает как на iOS

---

## ⚡ Performance Testing

### Load Performance
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.5s
- [ ] Нет layout shifts при загрузке
- [ ] Images загружаются оптимально

### Runtime Performance
- [ ] Smooth scrolling (60 FPS)
- [ ] Клики реагируют мгновенно
- [ ] Search debounce работает
- [ ] No memory leaks при навигации
- [ ] No console errors

### Network
- [ ] Reasonable number of requests
- [ ] Resources кэшируются
- [ ] Service Worker работает

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] Tab навигация работает по всем элементам
- [ ] Enter активирует buttons/links
- [ ] Escape закрывает modals
- [ ] Focus indicator видимый
- [ ] No keyboard traps
- [ ] Skip links работают

### Screen Reader
- [ ] Meaningful page title
- [ ] Landmarks (main, nav, etc.)
- [ ] ARIA labels на interactive elements
- [ ] Form labels связаны с inputs
- [ ] Error messages announce

### Visual
- [ ] Text contrast >= 4.5:1
- [ ] UI element contrast >= 3:1
- [ ] Text readable at 200% zoom
- [ ] No information conveyed by color only

---

## 🌐 Cross-Browser Testing

### Chrome (latest)
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

### Firefox (latest)
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

### Safari (latest)
- [ ] All features work
- [ ] No console errors
- [ ] Performance acceptable

### Edge (latest)
- [ ] All features work
- [ ] No console errors

---

## 📱 PWA Testing

### Installation
- [ ] Install prompt показывается
- [ ] Установка работает
- [ ] Icon на homescreen
- [ ] Splash screen показывается

### Offline Mode
- [ ] App работает offline
- [ ] Cached pages доступны
- [ ] Proper offline message

### Service Worker
- [ ] Registration успешна
- [ ] Updates работают
- [ ] Cache invalidation работает

---

## 🌍 Internationalization

### Language Switching
- [ ] EN <-> RU переключение работает
- [ ] Все тексты переведены
- [ ] Нет missing translation keys
- [ ] Date format меняется
- [ ] Number format меняется
- [ ] Language сохраняется в localStorage

---

## 🐛 Error Handling

### Network Errors
- [ ] Offline mode обрабатывается
- [ ] Timeout показывает ошибку
- [ ] Retry mechanism работает
- [ ] User-friendly error messages

### Validation Errors
- [ ] Required fields показывают ошибки
- [ ] Inline validation работает
- [ ] Error messages понятные
- [ ] Errors очищаются при исправлении

### Auth Errors
- [ ] Session expired обрабатывается
- [ ] Auto logout и redirect
- [ ] Token refresh (если есть)

### JavaScript Errors
- [ ] Error boundary ловит ошибки
- [ ] Fallback UI показывается
- [ ] Errors логируются (в dev mode)

---

## 📊 Test Results

**Tested By:** _____________  
**Date:** _____________  
**Version:** _____________  
**Browser:** _____________  
**Device:** _____________

**Overall Status:** ⬜ Pass | ⬜ Fail

**Critical Issues Found:**
1. _________________
2. _________________
3. _________________

**Minor Issues Found:**
1. _________________
2. _________________

**Notes:**
_____________________________________________
_____________________________________________

---

## ✅ Sign-off

**QA Lead:** _____________  
**Date:** _____________

**Product Owner:** _____________  
**Date:** _____________

**Ready for Production:** ⬜ Yes | ⬜ No

