import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://anugfsevzdpsehfzflji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdmc2V2emRwc2VoZnpmbGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTM4NDEsImV4cCI6MjA3MTM2OTg0MX0.1-UpIU59Xp8T93Gcp5TpIOXJVSm2ANdTvEm69uD1ciw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createData() {
  try {
    console.log('🔐 Входим как демо-пользователь...')
    
    // Входим как демо-пользователь
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: 'demo123'
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
    
    // Создаем финансовые данные
    console.log('💰 Создаем финансовые данные...')
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

createData()

