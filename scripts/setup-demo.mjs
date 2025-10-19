#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

// Создаем интерфейс для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

console.log('🚀 FROVO Manager - Демо-данные')
console.log('================================\n')

async function main() {
  try {
    // Запрашиваем данные Supabase
    const supabaseUrl = await question('Введите URL вашего Supabase проекта: ')
    const supabaseKey = await question('Введите anon key: ')
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ URL и ключ обязательны!')
      process.exit(1)
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Проверяем подключение
    console.log('\n🔍 Проверяем подключение к Supabase...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('❌ Ошибка подключения:', authError.message)
      process.exit(1)
    }
    
    console.log('✅ Подключение успешно!')
    
    // Создаем демо-пользователя
    console.log('\n👤 Создаем демо-пользователя...')
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: 'demo@frovo.com',
      password: 'demo123456',
      options: {
        data: {
          name: 'Demo User'
        }
      }
    })
    
    if (signUpError) {
      console.log('❌ Ошибка создания пользователя:', signUpError.message)
      process.exit(1)
    }
    
    const demoUser = authData.user
    console.log('✅ Демо-пользователь создан:', demoUser.email)
    
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
      .insert(projects.map(p => ({ ...p, user_id: demoUser.id })))
      .select()
    
    if (projectsError) {
      console.log('❌ Ошибка создания проектов:', projectsError.message)
    } else {
      console.log('✅ Проекты созданы:', projectsData.length)
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
      }
    ]
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks.map(t => ({ ...t, user_id: demoUser.id })))
      .select()
    
    if (tasksError) {
      console.log('❌ Ошибка создания задач:', tasksError.message)
    } else {
      console.log('✅ Задачи созданы:', tasksData.length)
    }
    
    // Создаем папки для заметок
    console.log('\n📂 Создаем папки...')
    const folders = [
      { name: 'Проекты', color: '#3B82F6' },
      { name: 'Планы', color: '#10B981' },
      { name: 'Обучение', color: '#F59E0B' }
    ]
    
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .insert(folders.map(f => ({ ...f, user_id: demoUser.id })))
      .select()
    
    if (foldersError) {
      console.log('❌ Ошибка создания папок:', foldersError.message)
    } else {
      console.log('✅ Папки созданы:', foldersData.length)
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
        content: '<h3>Концепция мобильного приложения</h3><p>Создать приложение для управления личными финансами</p>',
        folder_id: folderMap['Проекты'],
        pinned: true
      },
      {
        title: 'Планы на неделю',
        content: '<h3>Понедельник</h3><p>• Встреча с клиентом в 10:00</p><p>• Работа над дизайном</p>',
        folder_id: folderMap['Планы'],
        pinned: false
      }
    ]
    
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .insert(notes.map(n => ({ ...n, user_id: demoUser.id })))
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
      { name: 'Продукты', type: 'expense', parent_id: null },
      { name: 'Транспорт', type: 'expense', parent_id: null }
    ]
    
    const { data: financeCatsData, error: financeCatsError } = await supabase
      .from('finance_categories')
      .insert(financeCategories.map(c => ({ ...c, user_id: demoUser.id })))
      .select()
    
    if (financeCatsError) {
      console.log('❌ Ошибка создания финансовых категорий:', financeCatsError.message)
    } else {
      console.log('✅ Финансовые категории созданы:', financeCatsData.length)
    }
    
    console.log('\n🎉 Демо-данные успешно созданы!')
    console.log('\n🔑 Данные для входа:')
    console.log('   Email: demo@frovo.com')
    console.log('   Password: demo123456')
    console.log('\n📊 Создано:')
    console.log(`   👤 Пользователь: 1`)
    console.log(`   📁 Проекты: ${projectsData?.length || 0}`)
    console.log(`   ✅ Задачи: ${tasksData?.length || 0}`)
    console.log(`   📂 Папки: ${foldersData?.length || 0}`)
    console.log(`   📝 Заметки: ${notesData?.length || 0}`)
    console.log(`   💰 Финансовые категории: ${financeCatsData?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    rl.close()
  }
}

main()
