#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = 'https://anugfsevzdpsehfzflji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdmc2V2emRwc2VoZnpmbGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTM4NDEsImV4cCI6MjA3MTM2OTg0MX0.1-UpIU59Xp8T93Gcp5TpIOXJVSm2ANdTvEm69uD1ciw'

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
