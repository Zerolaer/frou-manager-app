#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = 'https://anugfsevzdpsehfzflji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdmc2V2emRwc2VoZnpmbGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTM4NDEsImV4cCI6MjA3MTM2OTg0MX0.1-UpIU59Xp8T93Gcp5TpIOXJVSm2ANdTvEm69uD1ciw'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Проверяем данные демо-пользователя...')

async function checkDemoData() {
  try {
    // Входим как демо-пользователь
    console.log('🔐 Входим как демо-пользователь...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: 'demo123456'
    })
    
    if (signInError) {
      console.log('❌ Ошибка входа:', signInError.message)
      return
    }
    
    console.log('✅ Вход успешен!')
    const userId = signInData.user.id
    console.log('👤 User ID:', userId)
    
    // Проверяем проекты
    console.log('\n📁 Проверяем проекты...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
    
    if (projectsError) {
      console.log('❌ Ошибка загрузки проектов:', projectsError.message)
    } else {
      console.log('✅ Проекты:', projects.length)
      projects.forEach(p => console.log(`   - ${p.name} (${p.color})`))
    }
    
    // Проверяем папки
    console.log('\n📂 Проверяем папки...')
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
    
    if (foldersError) {
      console.log('❌ Ошибка загрузки папок:', foldersError.message)
    } else {
      console.log('✅ Папки:', folders.length)
      folders.forEach(f => console.log(`   - ${f.name} (${f.color})`))
    }
    
    // Проверяем задачи
    console.log('\n✅ Проверяем задачи...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
    
    if (tasksError) {
      console.log('❌ Ошибка загрузки задач:', tasksError.message)
    } else {
      console.log('✅ Задачи:', tasks.length)
      tasks.forEach(t => console.log(`   - ${t.title} (${t.priority})`))
    }
    
    // Проверяем заметки
    console.log('\n📝 Проверяем заметки...')
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
    
    if (notesError) {
      console.log('❌ Ошибка загрузки заметок:', notesError.message)
    } else {
      console.log('✅ Заметки:', notes.length)
      notes.forEach(n => console.log(`   - ${n.title} (pinned: ${n.pinned})`))
    }
    
    // Проверяем финансовые категории
    console.log('\n💰 Проверяем финансовые категории...')
    const { data: financeCats, error: financeCatsError } = await supabase
      .from('finance_categories')
      .select('*')
    
    if (financeCatsError) {
      console.log('❌ Ошибка загрузки финансовых категорий:', financeCatsError.message)
    } else {
      console.log('✅ Финансовые категории:', financeCats.length)
      financeCats.forEach(f => console.log(`   - ${f.name} (${f.type})`))
    }
    
    // Проверяем финансовые данные
    console.log('\n📊 Проверяем финансовые данные...')
    const { data: financeData, error: financeDataError } = await supabase
      .from('finance_data')
      .select('*')
    
    if (financeDataError) {
      console.log('❌ Ошибка загрузки финансовых данных:', financeDataError.message)
    } else {
      console.log('✅ Финансовые данные:', financeData.length)
    }
    
    console.log('\n📊 Итого:')
    console.log(`   📁 Проекты: ${projects?.length || 0}`)
    console.log(`   📂 Папки: ${folders?.length || 0}`)
    console.log(`   ✅ Задачи: ${tasks?.length || 0}`)
    console.log(`   📝 Заметки: ${notes?.length || 0}`)
    console.log(`   💰 Финансовые категории: ${financeCats?.length || 0}`)
    console.log(`   📊 Финансовые данные: ${financeData?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

checkDemoData()

