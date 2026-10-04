#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚀 Заполняем демо-данными...')

async function fillDemoData() {
  try {
    // Сначала входим как демо-пользователь
    console.log('🔐 Входим как демо-пользователь...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: process.env.DEMO_PASSWORD,
    })
    
    if (signInError) {
      console.log('❌ Ошибка входа:', signInError.message)
      return
    }
    
    console.log('✅ Вход успешен!')
    const userId = signInData.user.id
    
    // Создаем проекты
    console.log('\n📁 Создаем проекты...')
    const projects = [
      { name: 'Веб-разработка', color: '#3B82F6', description: 'Проекты по веб-разработке' },
      { name: 'Мобильные приложения', color: '#10B981', description: 'iOS и Android приложения' },
      { name: 'Дизайн', color: '#F59E0B', description: 'UI/UX дизайн проекты' },
      { name: 'Маркетинг', color: '#EF4444', description: 'Маркетинговые кампании' }
    ]
    
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .insert(projects.map(p => ({ ...p, user_id: userId })))
      .select()
    
    if (projectsError) {
      console.log('❌ Ошибка создания проектов:', projectsError.message)
    } else {
      console.log('✅ Проекты созданы:', projectsData.length)
    }
    
    // Создаем папки
    console.log('\n📂 Создаем папки...')
    const folders = [
      { name: 'Проекты', color: '#3B82F6' },
      { name: 'Планы', color: '#10B981' },
      { name: 'Обучение', color: '#F59E0B' },
      { name: 'События', color: '#EF4444' },
      { name: 'Личное', color: '#8B5CF6' }
    ]
    
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .insert(folders.map(f => ({ ...f, user_id: userId })))
      .select()
    
    if (foldersError) {
      console.log('❌ Ошибка создания папок:', foldersError.message)
    } else {
      console.log('✅ Папки созданы:', foldersData.length)
    }
    
    // Создаем задачи
    console.log('\n✅ Создаем задачи...')
    const projectMap = {}
    projectsData?.forEach(project => {
      projectMap[project.name] = project.id
    })
    
    const tasks = [
      {
        title: 'Создать главную страницу',
        description: 'Разработать дизайн и верстку главной страницы сайта',
        priority: 'high',
        project_id: projectMap['Веб-разработка'],
        date: '2024-01-15',
        completed: false
      },
      {
        title: 'Настроить базу данных',
        description: 'Создать схему БД и настроить подключение',
        priority: 'high',
        project_id: projectMap['Веб-разработка'],
        date: '2024-01-16',
        completed: true
      },
      {
        title: 'Создать логотип',
        description: 'Разработать логотип для нового бренда',
        priority: 'medium',
        project_id: projectMap['Дизайн'],
        date: '2024-01-17',
        completed: false
      },
      {
        title: 'Исследование конкурентов',
        description: 'Провести анализ конкурентов в нише',
        priority: 'low',
        project_id: projectMap['Маркетинг'],
        date: '2024-01-18',
        completed: false
      },
      {
        title: 'Тестирование приложения',
        description: 'Провести тестирование мобильного приложения',
        priority: 'medium',
        project_id: projectMap['Мобильные приложения'],
        date: '2024-01-19',
        completed: false
      }
    ]
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks.map(t => ({ ...t, user_id: userId })))
      .select()
    
    if (tasksError) {
      console.log('❌ Ошибка создания задач:', tasksError.message)
    } else {
      console.log('✅ Задачи созданы:', tasksData.length)
    }
    
    // Создаем заметки
    console.log('\n📝 Создаем заметки...')
    const folderMap = {}
    foldersData?.forEach(folder => {
      folderMap[folder.name] = folder.id
    })
    
    const notes = [
      {
        title: 'Идеи для нового проекта',
        content: '<h3>Концепция мобильного приложения</h3><p>Создать приложение для управления личными финансами с фокусом на:</p><ul><li>Автоматическую категоризацию трат</li><li>Анализ привычек трат</li><li>Цели и бюджеты</li><li>Интеграцию с банками</li></ul><h4>Технологии:</h4><p>React Native, Node.js, PostgreSQL</p>',
        folder_id: folderMap['Проекты'],
        pinned: true
      },
      {
        title: 'Планы на неделю',
        content: '<h3>Понедельник</h3><p>• Встреча с клиентом в 10:00</p><p>• Работа над дизайном главной страницы</p><h3>Вторник</h3><p>• Код-ревью с командой</p><p>• Тестирование новых функций</p><h3>Среда</h3><p>• Презентация проекта</p><p>• Планирование следующего спринта</p>',
        folder_id: folderMap['Планы'],
        pinned: false
      },
      {
        title: 'Изучение новых технологий',
        content: '<h3>Next.js 14</h3><p>Изучить новые возможности:</p><ul><li>App Router</li><li>Server Components</li><li>Streaming</li></ul><h3>React Server Components</h3><p>Понять принципы работы и применения</p>',
        folder_id: folderMap['Обучение'],
        pinned: true
      },
      {
        title: 'Встречи и события',
        content: '<h3>Январь 2024</h3><p><strong>15 января</strong> - Встреча с инвестором</p><p><strong>20 января</strong> - Конференция по веб-разработке</p><p><strong>25 января</strong> - День рождения коллеги</p>',
        folder_id: folderMap['События'],
        pinned: false
      }
    ]
    
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .insert(notes.map(n => ({ ...n, user_id: userId })))
      .select()
    
    if (notesError) {
      console.log('❌ Ошибка создания заметок:', notesError.message)
    } else {
      console.log('✅ Заметки созданы:', notesData.length)
    }
    
    // Создаем финансовые категории
    console.log('\n💰 Создаем финансовые категории...')
    const financeCategories = [
      { name: 'Зарплата', type: 'income', parent_id: null },
      { name: 'Фриланс', type: 'income', parent_id: null },
      { name: 'Инвестиции', type: 'income', parent_id: null },
      { name: 'Веб-разработка', type: 'income', parent_id: 'Фриланс' },
      { name: 'Дизайн', type: 'income', parent_id: 'Фриланс' },
      { name: 'Консультации', type: 'income', parent_id: 'Фриланс' },
      { name: 'Продукты', type: 'expense', parent_id: null },
      { name: 'Транспорт', type: 'expense', parent_id: null },
      { name: 'Развлечения', type: 'expense', parent_id: null },
      { name: 'Образование', type: 'expense', parent_id: null },
      { name: 'Здоровье', type: 'expense', parent_id: null },
      { name: 'Рестораны', type: 'expense', parent_id: 'Развлечения' },
      { name: 'Кино', type: 'expense', parent_id: 'Развлечения' },
      { name: 'Курсы', type: 'expense', parent_id: 'Образование' },
      { name: 'Книги', type: 'expense', parent_id: 'Образование' }
    ]
    
    const { data: financeCatsData, error: financeCatsError } = await supabase
      .from('finance_categories')
      .insert(financeCategories.map(c => ({ ...c, user_id: userId })))
      .select()
    
    if (financeCatsError) {
      console.log('❌ Ошибка создания финансовых категорий:', financeCatsError.message)
    } else {
      console.log('✅ Финансовые категории созданы:', financeCatsData.length)
    }
    
    console.log('\n🎉 Демо-данные успешно заполнены!')
    console.log('\n📊 Создано:')
    console.log(`   📁 Проекты: ${projectsData?.length || 0}`)
    console.log(`   📂 Папки: ${foldersData?.length || 0}`)
    console.log(`   ✅ Задачи: ${tasksData?.length || 0}`)
    console.log(`   📝 Заметки: ${notesData?.length || 0}`)
    console.log(`   💰 Финансовые категории: ${financeCatsData?.length || 0}`)
    
    console.log('\n🌐 Обновите страницу в браузере: http://localhost:5174')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

fillDemoData()

