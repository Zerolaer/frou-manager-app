#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Supabase данные
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔄 Создание подтвержденного демо-пользователя...')

async function createConfirmedUser() {
  try {
    // Сначала удаляем существующего пользователя (если есть)
    console.log('🗑️  Удаляем существующего пользователя...')
    
    // Пытаемся войти и удалить
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: 'demo@frovo.com',
      password: process.env.DEMO_PASSWORD,
    })
    
    if (signInData?.user) {
      // Пользователь существует, но не подтвержден
      console.log('ℹ️  Пользователь существует, но не подтвержден')
    }
    
    // Создаем нового пользователя с другим email
    const newEmail = 'demo2@frovo.com'
    console.log(`👤 Создаем нового пользователя: ${newEmail}`)
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: newEmail,
      password: process.env.DEMO_PASSWORD,
      options: {
        data: {
          name: 'Demo User'
        }
      }
    })
    
    if (signUpError) {
      console.log('❌ Ошибка создания пользователя:', signUpError.message)
      return
    }
    
    console.log('✅ Новый пользователь создан:', authData.user?.email)
    
    // Проверяем, можем ли войти
    console.log('🔍 Проверяем возможность входа...')
    
    const { data: testSignIn, error: testError } = await supabase.auth.signInWithPassword({
      email: newEmail,
      password: process.env.DEMO_PASSWORD,
    })
    
    if (testError) {
      console.log('❌ Ошибка входа:', testError.message)
      console.log('\n🔧 Решения:')
      console.log('1. Подтвердите email в Supabase Dashboard')
      console.log('2. Или выполните SQL в Supabase SQL Editor:')
      console.log(`   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${newEmail}';`)
    } else {
      console.log('✅ Пользователь готов к использованию!')
      console.log('\n🔑 Новые данные для входа:')
      console.log(`   Email: ${newEmail}`)
      console.log('   Password: demo123456')
      console.log('\n🌐 Приложение доступно по адресу:')
      console.log('   http://localhost:5174')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

createConfirmedUser()

