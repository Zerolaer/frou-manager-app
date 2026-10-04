#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('📧 Подтверждение email для демо-пользователя...')

async function confirmUser() {
  try {
    // Пытаемся войти с демо-пользователем
    console.log('🔍 Проверяем статус пользователя...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: process.env.DEMO_PASSWORD,
    })
    
    if (signInError) {
      console.log('❌ Ошибка входа:', signInError.message)
      
      if (signInError.message.includes('Email not confirmed')) {
        console.log('📧 Email не подтвержден. Нужно подтвердить вручную в Supabase Dashboard.')
        console.log('\n🔧 Инструкция:')
        console.log('1. Зайдите в https://supabase.com/dashboard')
        console.log('2. Выберите ваш проект')
        console.log('3. Перейдите в Authentication > Users')
        console.log('4. Найдите demo@frovo.com')
        console.log('5. Нажмите на три точки (⋮) > Confirm user')
        console.log('6. Или нажмите на статус "Unconfirmed"')
        return
      }
    } else {
      console.log('✅ Пользователь уже подтвержден и может входить!')
      console.log('🔑 Данные для входа:')
      console.log('   Email: demo@frovo.com')
      console.log('   Password: demo123456')
      console.log('\n🌐 Приложение доступно по адресу:')
      console.log('   http://localhost:5174')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

confirmUser()

