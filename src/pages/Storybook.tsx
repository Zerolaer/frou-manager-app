import React, { useState } from 'react'
import { useToast } from '@/lib/toast'
import { Plus, Home, DollarSign, CheckSquare, FileText, Settings, Calendar, ChevronLeft, ChevronRight, MoreVertical, BarChart3, Target, Wallet, ListTodo, StickyNote, Goal } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

// UI Components
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import Dropdown from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import SideModal from '@/components/ui/SideModal'
import { UnifiedModal } from '@/components/ui/ModalSystem'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingButton from '@/components/ui/LoadingButton'
import CoreMenu from '@/components/ui/CoreMenu'

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

// Form Components
import Check from '@/components/Check'
import CheckFinance from '@/components/CheckFinance'
import VirtualizedList from '@/components/VirtualizedList'

// Modal Components
import ProjectCreateModal from '@/components/ProjectCreateModal'
import CellEditor from '@/components/CellEditor'
import AnnualStatsModal from '@/components/AnnualStatsModal'

// Notes Components
import NoteCard from '@/components/notes/NoteCard'
import NoteEditorModal from '@/components/notes/NoteEditorModal'

// Tasks Components
import CardItem from '@/components/tasks/CardItem'
import DayColumn from '@/components/tasks/DayColumn'
import WeekBoard from '@/components/tasks/WeekBoard'
import MobileTasksDay from '@/components/tasks/MobileTasksDay'

// Other Components
import Toaster from '@/components/Toaster'
import AppLoader from '@/components/AppLoader'
import AuthCard from '@/components/AuthCard'
import MobileDayNavigator from '@/components/MobileDayNavigator'
import FolderSidebar from '@/components/FolderSidebar'
import ProjectSidebar from '@/components/ProjectSidebar'

const StorybookPage = () => {
  const { t } = useSafeTranslation()
  const [activeSection, setActiveSection] = useState('ui')
  const [modalOpen, setModalOpen] = useState(false)
  const [sideModalOpen, setSideModalOpen] = useState(false)
  const [dropdownValue, setDropdownValue] = useState('EUR')
  const [inputValue, setInputValue] = useState('')
  const { push: toast } = useToast()

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
              <div className="flex gap-3">
                <button className="btn">Основная кнопка</button>
                <button className="btn btn-outline">Кнопка с обводкой</button>
                <button className="btn btn-outline btn-xs">Маленькая кнопка</button>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-primary">Черная кнопка</button>
                <button className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        },
        {
          name: 'CoreInput',
          description: 'Базовый инпут с корпоративным стилем',
          usage: t('storybook.allTextInputs'),
          demo: (
            <div className="space-y-4">
              <CoreInput 
                placeholder={t('storybook.enterText')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <CoreInput type="number" placeholder="Число" />
              <CoreInput type="email" placeholder="Email" />
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
                onChange={setDropdownValue}
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
          usage: t('storybook.projectFiltering'),
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
                year={2025}
                onChange={() => {}}
              />
            </div>
          )
        }
      ]
    },
    feedback: {
      title: 'Feedback Components',
      description: 'Компоненты обратной связи',
      components: [
        {
          name: 'Toaster',
          description: 'Система уведомлений',
          usage: 'Показ сообщений пользователю',
          demo: (
            <div className="space-y-2">
              <button className="btn" onClick={() => toast({ title: 'Успешно', message: 'Операция выполнена' })}>
                Показать уведомление
              </button>
              <button className="btn" onClick={() => toast({ title: t('common.error'), message: t('storybook.somethingWentWrong') })}>
                Показать ошибку
              </button>
              <Toaster />
            </div>
          )
        },
        {
          name: 'Check',
          description: 'Чекбокс',
          usage: 'Выбор опций, включение/выключение',
          demo: (
            <div className="space-y-2">
              <Check checked={false} onChange={() => {}} label="Не выбрано" />
              <Check checked={true} onChange={() => {}} label="Выбрано" />
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
                row={{
                  id: '1',
                  name: 'Продукты',
                  isCollapsed: false,
                  children: [],
                  data: [100, 200, 150, 300, 250, 180, 220, 190, 160, 210, 240, 280]
                }}
                onToggleCollapse={() => {}}
                onCellClick={() => {}}
                childIndex={0}
                months={['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн']}
                year={2025}
                userId="demo"
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
                data={[1000, 1200, 800, 1500, 900, 1100, 1300, 1000, 1200, 1400, 1600, 1800]}
                months={['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн']}
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
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            </div>
          )
        }
      ]
    },
    modals: {
      title: 'Modal Components',
      description: 'Модальные окна приложения',
      components: [
        {
          name: 'CellEditor',
          description: 'Редактор ячеек финансов',
          usage: 'Редактирование финансовых записей',
          demo: (
            <div>
              <button 
                className="btn" 
                onClick={() => toast({ title: 'Информация', message: 'CellEditor откроется здесь' })}
              >
                Открыть CellEditor
              </button>
            </div>
          )
        },
        {
          name: 'AnnualStatsModal',
          description: 'Статистика за год',
          usage: 'Показ годовой статистики',
          demo: (
            <div>
              <button 
                className="btn" 
                onClick={() => toast({ title: 'Информация', message: 'AnnualStatsModal откроется здесь' })}
              >
                Открыть AnnualStatsModal
              </button>
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
        },
        {
          name: 'VirtualizedList',
          description: 'Виртуализированный список',
          usage: 'Большие списки данных',
          demo: (
            <div className="border rounded-lg p-4 bg-white h-40">
              <div className="text-sm text-gray-500 mb-2">Пример виртуализированного списка:</div>
              <div className="space-y-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                    Элемент списка {i + 1}
                  </div>
                ))}
              </div>
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
