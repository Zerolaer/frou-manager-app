import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

async function createTasksAndFinance() {
  try {
    console.log('🔐 Входим как демо-пользователь...')
    
    // Входим как демо-пользователь
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: process.env.DEMO_PASSWORD,
    })
    
    if (authError) {
      console.error('❌ Ошибка входа:', authError.message)
      return
    }
    
    console.log('✅ Вход успешен!')
    console.log('👤 User ID:', authData.user.id)
    
    const userId = authData.user.id
    
    // Получаем проекты
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
    
    if (!projects || projects.length === 0) {
      console.log('❌ Нет проектов для создания задач')
      return
    }
    
    const projectId = projects[0].id
    console.log('📁 Найден проект:', projectId)
    
    // Создаем задачи
    console.log('📝 Создаем задачи...')
    const tasks = [
      {
        title: 'Изучить React Hooks',
        description: 'Изучить основные хуки React: useState, useEffect, useContext',
        completed: false,
        priority: 'high',
        project_id: projectId,
        date: '2024-01-15',
        user_id: userId
      },
      {
        title: 'Создать компонент навигации',
        description: 'Создать адаптивный компонент навигации для мобильных устройств',
        completed: false,
        priority: 'medium',
        project_id: projectId,
        date: '2024-01-16',
        user_id: userId
      },
      {
        title: 'Настроить TypeScript',
        description: 'Настроить TypeScript конфигурацию для проекта',
        completed: true,
        priority: 'low',
        project_id: projectId,
        date: '2024-01-14',
        user_id: userId
      }
    ]
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select()
    
    if (tasksError) {
      console.error('❌ Ошибка создания задач:', tasksError.message)
      console.log('🔍 Детали ошибки:', tasksError)
    } else {
      console.log('✅ Задачи созданы:', tasksData.length)
    }
    
    // Получаем финансовые категории
    const { data: categories } = await supabase
      .from('finance_categories')
      .select('id')
      .eq('user_id', userId)
    
    if (!categories || categories.length === 0) {
      console.log('❌ Нет категорий для создания финансовых данных')
      return
    }
    
    const categoryId = categories[0].id
    console.log('💰 Найдена категория:', categoryId)
    
    // Создаем финансовые данные
    console.log('📊 Создаем финансовые данные...')
    const financeData = [
      {
        category_id: categoryId,
        values: [1000, 1200, 800, 1500, 900],
        user_id: userId
      }
    ]
    
    const { data: financeDataResult, error: financeError } = await supabase
      .from('finance_data')
      .insert(financeData)
      .select()
    
    if (financeError) {
      console.error('❌ Ошибка создания финансовых данных:', financeError.message)
      console.log('🔍 Детали ошибки:', financeError)
    } else {
      console.log('✅ Финансовые данные созданы:', financeDataResult.length)
    }
    
    console.log('🎉 Данные созданы успешно!')
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message)
  }
}

createTasksAndFinance()

