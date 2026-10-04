#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Проверяем структуру базы данных...')

async function checkTables() {
  try {
    // Список таблиц для проверки
    const tables = [
      'projects',
      'tasks', 
      'folders',
      'notes',
      'finance_categories',
      'finance_data'
    ]
    
    console.log('📊 Проверяем доступные таблицы:')
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: доступна (${data?.length || 0} записей)`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }
    
    console.log('\n🔧 Если таблицы не существуют, нужно создать схему базы данных')
    console.log('📝 Создайте таблицы в Supabase SQL Editor или используйте миграции')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

checkTables()

