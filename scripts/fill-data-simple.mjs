#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚀 Заполняем демо-данными (упрощенная версия)...')

async function fillData() {
  try {
    // Входим как демо-пользователь
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
    
    // 1. Создаем проекты
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
    
    // 2. Создаем папки
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
    
    // 3. Создаем задачи (упрощенная версия)
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
        completed: false,
        user_id: userId
      },
      {
        title: 'Настроить базу данных',
        description: 'Создать схему БД и настроить подключение',
        priority: 'high',
        project_id: projectMap['Веб-разработка'],
        date: '2024-01-16',
        completed: true,
        user_id: userId
      },
      {
        title: 'Создать логотип',
        description: 'Разработать логотип для нового бренда',
        priority: 'medium',
        project_id: projectMap['Дизайн'],
        date: '2024-01-17',
        completed: false,
        user_id: userId
      }
    ]
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select()
    
    if (tasksError) {
      console.log('❌ Ошибка создания задач:', tasksError.message)
    } else {
      console.log('✅ Задачи созданы:', tasksData.length)
    }
    
    // 4. Создаем финансовые категории (упрощенная версия)
    console.log('\n💰 Создаем финансовые категории...')
    const financeCategories = [
      { name: 'Зарплата', type: 'income', parent_id: null, user_id: userId },
      { name: 'Фриланс', type: 'income', parent_id: null, user_id: userId },
      { name: 'Продукты', type: 'expense', parent_id: null, user_id: userId },
      { name: 'Транспорт', type: 'expense', parent_id: null, user_id: userId },
      { name: 'Развлечения', type: 'expense', parent_id: null, user_id: userId }
    ]
    
    const { data: financeCatsData, error: financeCatsError } = await supabase
      .from('finance_categories')
      .insert(financeCategories)
      .select()
    
    if (financeCatsError) {
      console.log('❌ Ошибка создания финансовых категорий:', financeCatsError.message)
    } else {
      console.log('✅ Финансовые категории созданы:', financeCatsData.length)
    }
    
    // 5. Создаем финансовые данные
    console.log('\n📊 Создаем финансовые данные...')
    const categoryMap = {}
    financeCatsData?.forEach(cat => {
      categoryMap[cat.name] = cat.id
    })
    
    const financeData = [
      { 
        category_id: categoryMap['Зарплата'], 
        values: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
        user_id: userId
      },
      { 
        category_id: categoryMap['Фриланс'], 
        values: [1200, 800, 1500, 900, 1100, 1300, 700, 1600, 1000, 1400, 800, 1200],
        user_id: userId
      },
      { 
        category_id: categoryMap['Продукты'], 
        values: [800, 750, 900, 850, 820, 880, 780, 920, 800, 860, 740, 890],
        user_id: userId
      },
      { 
        category_id: categoryMap['Транспорт'], 
        values: [200, 180, 220, 190, 210, 230, 170, 240, 200, 220, 180, 210],
        user_id: userId
      },
      { 
        category_id: categoryMap['Развлечения'], 
        values: [300, 250, 400, 350, 320, 380, 280, 420, 300, 360, 240, 390],
        user_id: userId
      }
    ]
    
    const { data: financeDataResult, error: financeDataError } = await supabase
      .from('finance_data')
      .insert(financeData)
      .select()
    
    if (financeDataError) {
      console.log('❌ Ошибка создания финансовых данных:', financeDataError.message)
    } else {
      console.log('✅ Финансовые данные созданы:', financeDataResult.length)
    }
    
    console.log('\n🎉 Демо-данные успешно заполнены!')
    console.log('\n📊 Создано:')
    console.log(`   📁 Проекты: ${projectsData?.length || 0}`)
    console.log(`   📂 Папки: ${foldersData?.length || 0}`)
    console.log(`   ✅ Задачи: ${tasksData?.length || 0}`)
    console.log(`   💰 Финансовые категории: ${financeCatsData?.length || 0}`)
    console.log(`   📊 Финансовые данные: ${financeDataResult?.length || 0}`)
    
    console.log('\n🌐 Обновите страницу в браузере: http://localhost:5174')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

fillData()

