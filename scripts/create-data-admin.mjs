import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

async function createDataAdmin() {
  try {
    console.log('🔐 Создаем демо-пользователя...')
    
    // Создаем пользователя
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'demo@frovo.com',
      password: process.env.DEMO_PASSWORD,
    })
    
    if (authError) {
      console.error('❌ Ошибка создания пользователя:', authError.message)
      return
    }
    
    console.log('✅ Пользователь создан!')
    console.log('👤 User ID:', authData.user.id)
    
    const userId = authData.user.id
    
    // Подтверждаем email через SQL
    console.log('📧 Подтверждаем email...')
    const { error: confirmError } = await supabase.rpc('confirm_user_email', {
      user_email: 'demo@frovo.com'
    })
    
    if (confirmError) {
      console.log('⚠️ Не удалось подтвердить email автоматически, но продолжаем...')
    } else {
      console.log('✅ Email подтвержден!')
    }
    
    // Создаем проекты напрямую через SQL
    console.log('📁 Создаем проекты...')
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .insert([
        {
          name: 'Веб-разработка',
          color: '#3B82F6',
          user_id: userId
        },
        {
          name: 'Мобильные приложения',
          color: '#10B981',
          user_id: userId
        },
        {
          name: 'Дизайн',
          color: '#F59E0B',
          user_id: userId
        },
        {
          name: 'Маркетинг',
          color: '#EF4444',
          user_id: userId
        }
      ])
      .select()
    
    if (projectsError) {
      console.error('❌ Ошибка создания проектов:', projectsError.message)
      console.log('🔍 Детали ошибки:', projectsError)
    } else {
      console.log('✅ Проекты созданы:', projectsData.length)
    }
    
    // Создаем папки
    console.log('📂 Создаем папки...')
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .insert([
        {
          name: 'Проекты',
          color: '#3B82F6',
          user_id: userId
        },
        {
          name: 'Планы',
          color: '#10B981',
          user_id: userId
        },
        {
          name: 'Обучение',
          color: '#F59E0B',
          user_id: userId
        },
        {
          name: 'События',
          color: '#EF4444',
          user_id: userId
        },
        {
          name: 'Личное',
          color: '#8B5CF6',
          user_id: userId
        }
      ])
      .select()
    
    if (foldersError) {
      console.error('❌ Ошибка создания папок:', foldersError.message)
      console.log('🔍 Детали ошибки:', foldersError)
    } else {
      console.log('✅ Папки созданы:', foldersData.length)
    }
    
    // Создаем задачи
    console.log('📝 Создаем задачи...')
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert([
        {
          title: 'Изучить React Hooks',
          description: 'Изучить основные хуки React: useState, useEffect, useContext',
          completed: false,
          priority: 'high',
          project_id: projectsData[0].id,
          date: '2024-01-15',
          user_id: userId
        },
        {
          title: 'Создать компонент навигации',
          description: 'Создать адаптивный компонент навигации для мобильных устройств',
          completed: false,
          priority: 'medium',
          project_id: projectsData[0].id,
          date: '2024-01-16',
          user_id: userId
        },
        {
          title: 'Настроить TypeScript',
          description: 'Настроить TypeScript конфигурацию для проекта',
          completed: true,
          priority: 'low',
          project_id: projectsData[0].id,
          date: '2024-01-14',
          user_id: userId
        }
      ])
      .select()
    
    if (tasksError) {
      console.error('❌ Ошибка создания задач:', tasksError.message)
      console.log('🔍 Детали ошибки:', tasksError)
    } else {
      console.log('✅ Задачи созданы:', tasksData.length)
    }
    
    // Создаем финансовые категории
    console.log('💰 Создаем финансовые категории...')
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('finance_categories')
      .insert([
        {
          name: 'Зарплата',
          type: 'income',
          user_id: userId
        },
        {
          name: 'Фриланс',
          type: 'income',
          user_id: userId
        },
        {
          name: 'Продукты',
          type: 'expense',
          user_id: userId
        },
        {
          name: 'Транспорт',
          type: 'expense',
          user_id: userId
        },
        {
          name: 'Развлечения',
          type: 'expense',
          user_id: userId
        }
      ])
      .select()
    
    if (categoriesError) {
      console.error('❌ Ошибка создания категорий:', categoriesError.message)
      console.log('🔍 Детали ошибки:', categoriesError)
    } else {
      console.log('✅ Категории созданы:', categoriesData.length)
    }
    
    // Создаем финансовые данные
    console.log('📊 Создаем финансовые данные...')
    const { data: financeDataResult, error: financeError } = await supabase
      .from('finance_data')
      .insert([
        {
          category_id: categoriesData[0].id,
          values: [1000, 1200, 800, 1500, 900],
          user_id: userId
        }
      ])
      .select()
    
    if (financeError) {
      console.error('❌ Ошибка создания финансовых данных:', financeError.message)
      console.log('🔍 Детали ошибки:', financeError)
    } else {
      console.log('✅ Финансовые данные созданы:', financeDataResult.length)
    }
    
    // Создаем заметки
    console.log('📝 Создаем заметки...')
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .insert([
        {
          title: 'Идеи для нового проекта',
          content: 'Создать приложение для управления задачами с красивым интерфейсом',
          folder_id: foldersData[0].id,
          pinned: true,
          user_id: userId
        },
        {
          title: 'Изучение новых технологий',
          content: 'Изучить Next.js 14, Tailwind CSS, и Supabase для создания современных веб-приложений',
          folder_id: foldersData[2].id,
          pinned: true,
          user_id: userId
        },
        {
          title: 'Планы на неделю',
          content: '1. Завершить проект\n2. Изучить новую технологию\n3. Встретиться с командой',
          folder_id: foldersData[1].id,
          pinned: false,
          user_id: userId
        },
        {
          title: 'Встречи и события',
          content: 'Понедельник: Встреча с клиентом\nСреда: Презентация проекта\nПятница: Командная встреча',
          folder_id: foldersData[3].id,
          pinned: false,
          user_id: userId
        }
      ])
      .select()
    
    if (notesError) {
      console.error('❌ Ошибка создания заметок:', notesError.message)
      console.log('🔍 Детали ошибки:', notesError)
    } else {
      console.log('✅ Заметки созданы:', notesData.length)
    }
    
    console.log('🎉 Все данные созданы успешно!')
    console.log('📊 Итого:')
    console.log('  📁 Проекты:', projectsData?.length || 0)
    console.log('  📂 Папки:', foldersData?.length || 0)
    console.log('  ✅ Задачи:', tasksData?.length || 0)
    console.log('  📝 Заметки:', notesData?.length || 0)
    console.log('  💰 Категории:', categoriesData?.length || 0)
    console.log('  📊 Финансовые данные:', financeDataResult?.length || 0)
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message)
  }
}

createDataAdmin()

