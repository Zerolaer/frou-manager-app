// @ts-nocheck — dev-only страница; намеренно отключаем TS, чтобы не ломать релизный билд.
import React, { useState } from 'react'
import { Plus, Home, DollarSign, CheckSquare, FileText, Settings, Calendar, ChevronLeft, ChevronRight, MoreVertical, BarChart3, Target, Wallet, ListTodo, StickyNote, Goal, Download, X, Edit2, Trash2, Pin, Copy, Check as CheckIcon, TrendingUp, User, Languages, LogOut, Video, Users, Moon, HelpCircle, MessageSquare, Zap } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

// UI Components
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import Dropdown from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import SideModal from '@/components/ui/SideModal'
import { UnifiedModal } from '@/components/ui/ModalSystem'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton, Spinner } from '@/components/ui/LoadingButton'
import { Skeleton, TaskCardSkeleton, FinanceRowSkeleton, WidgetSkeleton, ListItemSkeleton, PageSkeleton } from '@/components/ui/Skeleton'
import { LoadingButton as LoadingButtonStates, LoadingCard, LoadingList, LoadingGrid, LoadingPage } from '@/components/ui/LoadingStates'
import { Checkbox } from '@/components/ui/Checkbox'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import CoreMenu from '@/components/ui/CoreMenu'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import { VirtualizedGrid } from '@/components/ui/VirtualizedGrid'

// Finance Components
import CategoryRow from '@/components/finance/CategoryRow'
import SummaryRow from '@/components/finance/SummaryRow'
import YearToolbar from '@/components/finance/YearToolbar'
import SectionHeader from '@/components/finance/SectionHeader'
import MobileFinanceDay from '@/components/finance/MobileFinanceDay'

// Dashboard Components
import BentoGrid, { BentoCard } from '@/components/dashboard/BentoGrid'
import HomeDashboard from '@/components/dashboard/HomeDashboard'

// Task Components
import { TaskCard } from '@/components/TaskCard'
import TaskAddModal from '@/components/TaskAddModal'
import ModernTaskModal from '@/components/ModernTaskModal'
import TaskViewModal from '@/components/TaskViewModal'

// Navigation Components
import { ProjectDropdown, DateDropdown, YearDropdown, TypeDropdown } from '@/components/ui/UnifiedDropdown'
import YearSelector from '@/components/YearSelector'
import Sidebar from '@/components/Sidebar'
import SidebarItem from '@/components/SidebarItem'
import Header from '@/components/Header'
import WeekTimeline from '@/components/WeekTimeline'
import UserMenu from '@/components/UserMenu'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Form Components
import Check from '@/components/Check'
import CheckFinance from '@/components/CheckFinance'
import { VirtualizedList } from '@/components/VirtualizedList'

// Modal Components
import ProjectCreateModal from '@/components/ProjectCreateModal'
import CellEditor from '@/components/CellEditor'
import AnnualStatsModal from '@/components/AnnualStatsModal'

// Notes Components
import NoteCard from '@/components/notes/NoteCard'
import NoteEditorModal from '@/components/notes/NoteEditorModal'

// Habits Components
import HabitCard from '@/components/habits/HabitCard'

// Invoice Components
import InvoiceCard from '@/components/invoice/InvoiceCard'

// Other Components
import AppLoader from '@/components/AppLoader'
import AuthCard from '@/components/AuthCard'
import MobileDayNavigator from '@/components/MobileDayNavigator'
import FolderSidebar from '@/components/FolderSidebar'
import ProjectSidebar from '@/components/ProjectSidebar'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

const StorybookPage = () => {
  const { t } = useSafeTranslation()
  const [activeSection, setActiveSection] = useState('ui')
  const [modalOpen, setModalOpen] = useState(false)
  const [sideModalOpen, setSideModalOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownValue, setDropdownValue] = useState('EUR')
  const [inputValue, setInputValue] = useState('')
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  const sections = {
    ui: {
      title: 'UI Components',
      description: 'Базовые переиспользуемые компоненты интерфейса',
      components: [
        {
          name: 'Button',
          description: 'Основная кнопка приложения',
          usage: 'Везде где нужна кнопка',
          demo: (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <button className="btn">Основная кнопка</button>
                <button className="btn btn-outline">Кнопка с обводкой</button>
                <button className="btn btn-outline btn-xs">Маленькая кнопка</button>
                <button className="btn btn-primary">Черная кнопка</button>
                <button className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button>Button Component</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="secondary">Secondary</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Plus /></Button>
              </div>
            </div>
          )
        },
        {
          name: 'Badge',
          description: 'Бейдж для меток и статусов',
          usage: 'Отображение статусов, категорий, тегов',
          demo: (
            <div className="flex gap-3 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          )
        },
        {
          name: 'CoreInput',
          description: 'Базовый инпут с корпоративным стилем',
          usage: t('storybook.allTextInputs') || 'Все текстовые поля',
          demo: (
            <div className="space-y-4 max-w-md">
              <CoreInput 
                placeholder={t('storybook.enterText') || 'Введите текст'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <CoreInput type="number" placeholder="Число" />
              <CoreInput type="email" placeholder="Email" />
              <CoreInput disabled placeholder="Disabled" />
            </div>
          )
        },
        {
          name: 'CoreTextarea',
          description: 'Текстовое поле для многострочного ввода',
          usage: 'Описания, заметки, комментарии',
          demo: (
            <div className="max-w-md">
              <CoreTextarea 
                placeholder="Введите текст..."
                rows={4}
              />
            </div>
          )
        },
        {
          name: 'Checkbox',
          description: 'Чекбокс компонент',
          usage: 'Выбор опций, включение/выключение',
          demo: (
            <div className="space-y-3">
              <Checkbox 
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                label="С меткой"
              />
              <Checkbox checked={true} />
              <Checkbox checked={false} />
              <Checkbox size="sm" label="Маленький" />
            </div>
          )
        },
        {
          name: 'Dropdown',
          description: 'Выпадающий список',
          usage: 'Выбор из списка опций',
          demo: (
            <div className="w-48">
              <Dropdown
                value={dropdownValue}
                onChange={(value) => setDropdownValue(value as string)}
                options={[
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                  { value: 'GEL', label: 'GEL' }
                ]}
                placeholder="Выберите валюту"
              />
            </div>
          )
        },
        {
          name: 'Card',
          description: 'Карточка для контента',
          usage: 'Группировка контента, виджеты',
          demo: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Заголовок карточки</CardTitle>
                  <CardDescription>Описание карточки</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Содержимое карточки</p>
                </CardContent>
                <CardFooter>
                  <Button>Действие</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p>Простая карточка без заголовка</p>
                </CardContent>
              </Card>
            </div>
          )
        },
        {
          name: 'Modal',
          description: 'Центральное модальное окно',
          usage: 'Диалоги, формы, подтверждения',
          demo: (
            <div>
              <button className="btn" onClick={() => setModalOpen(true)}>Открыть Modal</button>
              <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Пример Modal"
                footer={<button className="btn" onClick={() => setModalOpen(false)}>Закрыть</button>}
              >
                <p>Это пример центрального модального окна</p>
              </Modal>
            </div>
          )
        },
        {
          name: 'SideModal',
          description: 'Боковое модальное окно',
          usage: 'Детальная информация, настройки',
          demo: (
            <div>
              <button className="btn" onClick={() => setSideModalOpen(true)}>Открыть SideModal</button>
              <SideModal
                open={sideModalOpen}
                onClose={() => setSideModalOpen(false)}
                title="Пример SideModal"
                footer={<button className="btn" onClick={() => setSideModalOpen(false)}>Закрыть</button>}
              >
                <p>Это пример бокового модального окна</p>
                <p>Обычно используется для детальной информации</p>
              </SideModal>
            </div>
          )
        },
        {
          name: 'Dialog',
          description: 'Диалоговое окно (Radix UI)',
          usage: 'Подтверждения, уведомления',
          demo: (
            <div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Открыть Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Заголовок диалога</DialogTitle>
                    <DialogDescription>
                      Описание диалога
                    </DialogDescription>
                  </DialogHeader>
                  <p>Содержимое диалога</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                    <Button onClick={() => setDialogOpen(false)}>Подтвердить</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )
        },
        {
          name: 'Tooltip',
          description: 'Всплывающая подсказка',
          usage: 'Дополнительная информация при наведении',
          demo: (
            <TooltipProvider>
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button>Наведите на меня</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Это подсказка</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
        {
          name: 'Skeleton',
          description: 'Скелетон для состояний загрузки',
          usage: 'Плейсхолдеры при загрузке контента',
          demo: (
            <div className="space-y-4 max-w-md">
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="rectangular" height={100} />
              <TaskCardSkeleton />
            </div>
          )
        },
        {
          name: 'LoadingButton',
          description: 'Кнопка с состоянием загрузки',
          usage: 'Асинхронные действия',
          demo: (
            <div className="flex gap-3">
              <LoadingButton loading={false}>Обычная кнопка</LoadingButton>
              <LoadingButton loading={true}>Загрузка...</LoadingButton>
              <LoadingButtonStates loading={true}>Загрузка (States)</LoadingButtonStates>
            </div>
          )
        },
        {
          name: 'Spinner',
          description: 'Спиннер загрузки',
          usage: 'Индикатор загрузки',
          demo: (
            <div className="flex gap-4 items-center">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          )
        },
        {
          name: 'CoreMenu',
          description: 'Контекстное меню',
          usage: 'Меню действий, опции',
          demo: (
            <div className="w-48">
              <CoreMenu
                options={[
                  { value: 'edit', label: 'Редактировать' },
                  { value: 'delete', label: 'Удалить', destructive: true },
                  { value: 'copy', label: 'Копировать' }
                ]}
                onSelect={(value) => console.log('Selected:', value)}
              />
            </div>
          )
        },
        {
          name: 'CustomDatePicker',
          description: 'Выбор даты',
          usage: 'Выбор дат в формах',
          demo: (
            <div className="w-64">
              <CustomDatePicker
                value={new Date()}
                onChange={() => {}}
              />
            </div>
          )
        }
      ]
    },
    navigation: {
      title: 'Navigation Components',
      description: 'Компоненты навигации и селекторы',
      components: [
        {
          name: 'ProjectDropdown',
          description: 'Выбор проекта',
          usage: t('storybook.projectFiltering') || 'Фильтрация по проектам',
          demo: (
            <div className="w-48">
              <ProjectDropdown
                value="1"
                onChange={() => {}}
                projects={[
                  { id: '1', name: 'Работа' },
                  { id: '2', name: 'Личное' }
                ]}
              />
            </div>
          )
        },
        {
          name: 'DateDropdown',
          description: 'Выбор даты',
          usage: 'Установка дат выполнения',
          demo: (
            <div className="w-48">
              <DateDropdown
                value="2025-01-15"
                onChange={() => {}}
              />
            </div>
          )
        },
        {
          name: 'YearSelector',
          description: 'Выбор года',
          usage: 'Навигация по годам в финансах',
          demo: (
            <div className="w-32">
              <YearSelector
                currentYear={2025}
                onYearChange={() => {}}
              />
            </div>
          )
        },
        {
          name: 'UserMenu',
          description: 'Меню пользователя',
          usage: 'Профиль, настройки, выход',
          demo: (
            <div>
              <UserMenu />
            </div>
          )
        },
        {
          name: 'LanguageSwitcher',
          description: 'Переключатель языка',
          usage: 'Смена языка интерфейса',
          demo: (
            <div>
              <LanguageSwitcher />
            </div>
          )
        },
        {
          name: 'WeekTimeline',
          description: 'Таймлайн недели',
          usage: 'Навигация по неделям в задачах',
          demo: (
            <div className="max-w-2xl">
              <WeekTimeline
                anchor={new Date()}
                onPrev={() => {}}
                onNext={() => {}}
              />
            </div>
          )
        }
      ]
    },
    forms: {
      title: 'Form Components',
      description: 'Компоненты форм',
      components: [
        {
          name: 'Check',
          description: 'Чекбокс',
          usage: 'Выбор опций, включение/выключение',
          demo: (
            <div className="space-y-2">
              <Check checked={false} onToggle={() => {}} />
              <Check checked={true} onToggle={() => {}} />
            </div>
          )
        },
        {
          name: 'CheckFinance',
          description: 'Чекбокс для финансов',
          usage: 'Включение/исключение записей',
          demo: (
            <div className="space-y-2">
              <CheckFinance 
                checked={true}
                onToggle={() => {}}
              />
              <label className="text-sm text-gray-600">Включить в расчеты</label>
            </div>
          )
        }
      ]
    },
    finance: {
      title: 'Finance Components',
      description: 'Компоненты для работы с финансами',
      components: [
        {
          name: 'CategoryRow',
          description: 'Строка категории с данными',
          usage: 'Основная таблица финансов',
          demo: (
            <div className="border rounded-lg p-4 bg-white max-w-4xl overflow-x-auto">
              <div className="text-sm text-gray-500 mb-2">Пример строки категории:</div>
              <CategoryRow
                type="expense"
                row={{
                  id: '1',
                  name: 'Продукты',
                  isCollapsed: false,
                  parent_id: null
                }}
                values={[100, 200, 150, 300, 250, 180, 220, 190, 160, 210, 240, 280]}
                isCurrentYear={true}
                currentMonth={new Date().getMonth()}
                hasChildren={false}
                collapsed={false}
                childIndex={0}
                onToggleCollapse={() => {}}
                onNameContext={() => {}}
                onCellContext={() => {}}
                onCellEdit={() => {}}
                fmt={(n: number) => n.toFixed(2)}
                ctxCatHighlight={null}
                ctxCellHighlight={null}
              />
            </div>
          )
        },
        {
          name: 'SummaryRow',
          description: 'Строка итогов',
          usage: 'Суммы доходов и расходов',
          demo: (
            <div className="border rounded-lg p-4 bg-white max-w-4xl overflow-x-auto">
              <SummaryRow
                title="Доходы"
                values={[1000, 1200, 800, 1500, 900, 1100, 1300, 1000, 1200, 1400, 1600, 1800]}
                isCurrentYear={true}
                currentMonth={new Date().getMonth()}
                fmt={(n: number) => n.toFixed(2)}
              />
            </div>
          )
        },
        {
          name: 'YearToolbar',
          description: 'Панель инструментов года',
          usage: 'Управление категориями и статистикой',
          demo: (
            <div className="border rounded-lg p-4 bg-white">
              <YearToolbar
                year={2025}
                years={[2023, 2024, 2025]}
                onYearChange={() => {}}
                onAddCategory={() => {}}
                onShowStats={() => {}}
              />
            </div>
          )
        },
        {
          name: 'SectionHeader',
          description: 'Заголовок секции',
          usage: 'Разделы доходов и расходов',
          demo: (
            <div className="border rounded-lg p-4 bg-white">
              <SectionHeader
                title="ДОХОДЫ"
                onAdd={() => {}}
              />
            </div>
          )
        }
      ]
    },
    tasks: {
      title: 'Task Components',
      description: 'Компоненты для работы с задачами',
      components: [
        {
          name: 'TaskCard',
          description: 'Карточка задачи',
          usage: 'Отображение задач в списках',
          demo: (
            <div className="w-80">
              <TaskCard
                task={{
                  id: '1',
                  title: 'Пример задачи',
                  description: 'Описание задачи',
                  priority: 'high',
                  status: 'todo',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }}
              />
            </div>
          )
        }
      ]
    },
    notes: {
      title: 'Notes Components',
      description: 'Компоненты для работы с заметками',
      components: [
        {
          name: 'NoteCard',
          description: 'Карточка заметки',
          usage: 'Отображение заметок в сетке',
          demo: (
            <div className="w-80">
              <NoteCard
                note={{
                  id: '1',
                  title: 'Пример заметки',
                  content: 'Содержимое заметки',
                  folder_id: null,
                  pinned: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }}
                folder={null}
                onEdit={() => {}}
                onTogglePin={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
              />
            </div>
          )
        }
      ]
    },
    habits: {
      title: 'Habits Components',
      description: 'Компоненты для работы с привычками',
      components: [
        {
          name: 'HabitCard',
          description: 'Карточка привычки',
          usage: 'Отображение привычек',
          demo: (
            <div className="w-80">
              <HabitCard
                habit={{
                  id: '1',
                  title: 'Пример привычки',
                  type: 'manual',
                  start_date: new Date().toISOString(),
                  end_date: null,
                  days_count: 10,
                  completion_count: 5,
                  streak_days: 3,
                  last_completion_date: new Date().toISOString(),
                  current_value: null,
                  target_value: null,
                  progress_percentage: null
                }}
                onEdit={() => {}}
                onDelete={() => {}}
                onComplete={() => {}}
                onAddProgress={() => {}}
              />
            </div>
          )
        }
      ]
    },
    invoice: {
      title: 'Invoice Components',
      description: 'Компоненты для работы с инвойсами',
      components: [
        {
          name: 'InvoiceCard',
          description: 'Карточка инвойса',
          usage: 'Отображение инвойсов',
          demo: (
            <div className="w-80">
              <InvoiceCard
                invoice={{
                  id: '1',
                  invoice_number: 'INV-001',
                  client_name: 'Клиент',
                  client_email: 'client@example.com',
                  client_address: 'Адрес',
                  date: new Date().toISOString(),
                  due_date: new Date().toISOString(),
                  notes: '',
                  subtotal: 1000,
                  tax_rate: 0,
                  tax_amount: 0,
                  total: 1000,
                  items: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }}
                onEdit={() => {}}
                onDelete={() => {}}
                onExport={() => {}}
                onView={() => {}}
              />
            </div>
          )
        }
      ]
    },
    dashboard: {
      title: 'Dashboard Components',
      description: 'Компоненты дашборда',
      components: [
        {
          name: 'BentoGrid',
          description: 'Сетка виджетов',
          usage: 'Главная страница дашборда',
          demo: (
            <div className="border rounded-lg p-4 bg-white max-w-2xl">
              <div className="text-sm text-gray-500 mb-2">Пример BentoGrid:</div>
              <BentoGrid>
                <BentoCard colSpan={1} rowSpan={1}>
                  <div className="bg-gray-100 rounded-lg p-4 h-20 flex items-center justify-center">Виджет 1</div>
                </BentoCard>
                <BentoCard colSpan={1} rowSpan={1}>
                  <div className="bg-gray-100 rounded-lg p-4 h-20 flex items-center justify-center">Виджет 2</div>
                </BentoCard>
                <BentoCard colSpan={2} rowSpan={1}>
                  <div className="bg-gray-100 rounded-lg p-4 h-20 flex items-center justify-center">Широкий виджет</div>
                </BentoCard>
              </BentoGrid>
            </div>
          )
        }
      ]
    },
    loading: {
      title: 'Loading Components',
      description: 'Компоненты состояний загрузки',
      components: [
        {
          name: 'LoadingCard',
          description: 'Карточка с состоянием загрузки',
          usage: 'Загрузка контента карточки',
          demo: (
            <div className="max-w-md">
              <LoadingCard loading={true} />
              <LoadingCard loading={false}>
                <Card><CardContent>Загруженный контент</CardContent></Card>
              </LoadingCard>
            </div>
          )
        },
        {
          name: 'LoadingList',
          description: 'Список с состоянием загрузки',
          usage: 'Загрузка списка элементов',
          demo: (
            <div className="max-w-md">
              <LoadingList loading={true} itemCount={3} />
              <LoadingList loading={false}>
                <div className="space-y-2">
                  <div className="p-2 border rounded">Элемент 1</div>
                  <div className="p-2 border rounded">Элемент 2</div>
                </div>
              </LoadingList>
            </div>
          )
        },
        {
          name: 'LoadingGrid',
          description: 'Сетка с состоянием загрузки',
          usage: 'Загрузка сетки элементов',
          demo: (
            <div className="max-w-2xl">
              <LoadingGrid loading={true} columns={3} itemCount={6} />
            </div>
          )
        },
        {
          name: 'LoadingPage',
          description: 'Страница с состоянием загрузки',
          usage: 'Загрузка всей страницы',
          demo: (
            <div>
              <LoadingPage loading={true} />
            </div>
          )
        }
      ]
    },
    other: {
      title: 'Other Components',
      description: 'Прочие компоненты',
      components: [
        {
          name: 'AppLoader',
          description: 'Загрузчик приложения',
          usage: 'Инициализация приложения',
          demo: (
            <div>
              <AppLoader />
            </div>
          )
        },
        {
          name: 'AuthCard',
          description: 'Карточка аутентификации',
          usage: 'Форма входа/регистрации',
          demo: (
            <div className="max-w-md">
              <AuthCard title="Вход" onSubmit={() => {}} />
            </div>
          )
        },
        {
          name: 'PWAInstallPrompt',
          description: 'Промпт установки PWA',
          usage: 'Предложение установить приложение',
          demo: (
            <div>
              <PWAInstallPrompt />
            </div>
          )
        }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Storybook</h1>
          <p className="text-gray-600">
            Документация всех компонентов проекта с примерами использования
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                className={`btn ${activeSection === key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveSection(key)}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Section Content */}
        {activeSection && sections[activeSection as keyof typeof sections] && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {sections[activeSection as keyof typeof sections].title}
              </h2>
              <p className="text-gray-600">
                {sections[activeSection as keyof typeof sections].description}
              </p>
            </div>

            <div className="grid gap-8">
              {sections[activeSection as keyof typeof sections].components.map((component, index) => (
                <div key={index} className="border rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{component.name}</h3>
                    <p className="text-gray-600 mb-2">{component.description}</p>
                    <p className="text-sm text-gray-500">
                      <strong>Использование:</strong> {component.usage}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-3">Демо:</div>
                    {component.demo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StorybookPage
