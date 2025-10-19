import { createClient } from '@supabase/supabase-js'

// Supabase configuration - замените на ваши данные
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

// Demo user credentials
const DEMO_USER = {
  email: 'demo@frovo.com',
  password: 'demo123456',
  name: 'Demo User'
}

// Demo data
const DEMO_PROJECTS = [
  { name: 'Веб-разработка', color: '#3B82F6', description: 'Проекты по веб-разработке' },
  { name: 'Мобильные приложения', color: '#10B981', description: 'iOS и Android приложения' },
  { name: 'Дизайн', color: '#F59E0B', description: 'UI/UX дизайн проекты' },
  { name: 'Маркетинг', color: '#EF4444', description: 'Маркетинговые кампании' }
]

const DEMO_TASKS = [
  {
    title: 'Создать главную страницу',
    description: 'Разработать дизайн и верстку главной страницы сайта',
    priority: 'high',
    project: 'Веб-разработка',
    date: '2024-01-15',
    completed: false
  },
  {
    title: 'Настроить базу данных',
    description: 'Создать схему БД и настроить подключение',
    priority: 'high',
    project: 'Веб-разработка',
    date: '2024-01-16',
    completed: true
  },
  {
    title: 'Создать логотип',
    description: 'Разработать логотип для нового бренда',
    priority: 'medium',
    project: 'Дизайн',
    date: '2024-01-17',
    completed: false
  },
  {
    title: 'Исследование конкурентов',
    description: 'Провести анализ конкурентов в нише',
    priority: 'low',
    project: 'Маркетинг',
    date: '2024-01-18',
    completed: false
  },
  {
    title: 'Тестирование приложения',
    description: 'Провести тестирование мобильного приложения',
    priority: 'medium',
    project: 'Мобильные приложения',
    date: '2024-01-19',
    completed: false
  }
]

const DEMO_FINANCE_CATEGORIES = {
  income: [
    { name: 'Зарплата', parent_id: null },
    { name: 'Фриланс', parent_id: null },
    { name: 'Инвестиции', parent_id: null },
    { name: 'Веб-разработка', parent_id: 'Фриланс' },
    { name: 'Дизайн', parent_id: 'Фриланс' },
    { name: 'Консультации', parent_id: 'Фриланс' }
  ],
  expenses: [
    { name: 'Продукты', parent_id: null },
    { name: 'Транспорт', parent_id: null },
    { name: 'Развлечения', parent_id: null },
    { name: 'Образование', parent_id: null },
    { name: 'Здоровье', parent_id: null },
    { name: 'Рестораны', parent_id: 'Развлечения' },
    { name: 'Кино', parent_id: 'Развлечения' },
    { name: 'Курсы', parent_id: 'Образование' },
    { name: 'Книги', parent_id: 'Образование' }
  ]
}

const DEMO_FINANCE_DATA = {
  income: [
    { category: 'Зарплата', values: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000] },
    { category: 'Веб-разработка', values: [1200, 800, 1500, 900, 1100, 1300, 700, 1600, 1000, 1400, 800, 1200] },
    { category: 'Дизайн', values: [600, 400, 800, 500, 700, 900, 300, 1000, 600, 800, 400, 700] },
    { category: 'Консультации', values: [300, 200, 400, 250, 350, 450, 150, 500, 300, 400, 200, 350] }
  ],
  expenses: [
    { category: 'Продукты', values: [800, 750, 900, 850, 820, 880, 780, 920, 800, 860, 740, 890] },
    { category: 'Транспорт', values: [200, 180, 220, 190, 210, 230, 170, 240, 200, 220, 180, 210] },
    { category: 'Рестораны', values: [300, 250, 400, 350, 320, 380, 280, 420, 300, 360, 240, 390] },
    { category: 'Кино', values: [50, 40, 60, 45, 55, 65, 35, 70, 50, 60, 40, 55] },
    { category: 'Курсы', values: [200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { category: 'Книги', values: [100, 50, 80, 60, 70, 90, 40, 100, 60, 80, 50, 70] },
    { category: 'Здоровье', values: [150, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  ]
}

const DEMO_NOTES = [
  {
    title: 'Идеи для нового проекта',
    content: `
      <h3>Концепция мобильного приложения</h3>
      <p>Создать приложение для управления личными финансами с фокусом на:</p>
      <ul>
        <li>Автоматическую категоризацию трат</li>
        <li>Анализ привычек трат</li>
        <li>Цели и бюджеты</li>
        <li>Интеграцию с банками</li>
      </ul>
      <h4>Технологии:</h4>
      <p>React Native, Node.js, PostgreSQL</p>
    `,
    folder: 'Проекты',
    pinned: true
  },
  {
    title: 'Планы на неделю',
    content: `
      <h3>Понедельник</h3>
      <p>• Встреча с клиентом в 10:00</p>
      <p>• Работа над дизайном главной страницы</p>
      
      <h3>Вторник</h3>
      <p>• Код-ревью с командой</p>
      <p>• Тестирование новых функций</p>
      
      <h3>Среда</h3>
      <p>• Презентация проекта</p>
      <p>• Планирование следующего спринта</p>
    `,
    folder: 'Планы',
    pinned: false
  },
  {
    title: 'Изучение новых технологий',
    content: `
      <h3>Next.js 14</h3>
      <p>Изучить новые возможности:</p>
      <ul>
        <li>App Router</li>
        <li>Server Components</li>
        <li>Streaming</li>
      </ul>
      
      <h3>React Server Components</h3>
      <p>Понять принципы работы и применения</p>
      
      <h3>Полезные ресурсы:</h3>
      <p>• <a href="https://nextjs.org/docs">Официальная документация</a></p>
      <p>• <a href="https://vercel.com/blog">Блог Vercel</a></p>
    `,
    folder: 'Обучение',
    pinned: true
  },
  {
    title: 'Встречи и события',
    content: `
      <h3>Январь 2024</h3>
      <p><strong>15 января</strong> - Встреча с инвестором</p>
      <p><strong>20 января</strong> - Конференция по веб-разработке</p>
      <p><strong>25 января</strong> - День рождения коллеги</p>
      
      <h3>Февраль 2024</h3>
      <p><strong>5 февраля</strong> - Презентация проекта</p>
      <p><strong>14 февраля</strong> - Выходной</p>
    `,
    folder: 'События',
    pinned: false
  }
]

const DEMO_FOLDERS = [
  { name: 'Проекты', color: '#3B82F6' },
  { name: 'Планы', color: '#10B981' },
  { name: 'Обучение', color: '#F59E0B' },
  { name: 'События', color: '#EF4444' },
  { name: 'Личное', color: '#8B5CF6' }
]

async function createDemoUser() {
  console.log('🔐 Creating demo user...')
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    options: {
      data: {
        name: DEMO_USER.name
      }
    }
  })
  
  if (authError) {
    console.error('❌ Error creating user:', authError.message)
    return null
  }
  
  console.log('✅ Demo user created:', authData.user?.email)
  return authData.user
}

async function createProjects(userId) {
  console.log('📁 Creating projects...')
  
  const projects = DEMO_PROJECTS.map(project => ({
    ...project,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('projects')
    .insert(projects)
    .select()
  
  if (error) {
    console.error('❌ Error creating projects:', error.message)
    return []
  }
  
  console.log('✅ Projects created:', data.length)
  return data
}

async function createTasks(userId, projects) {
  console.log('✅ Creating tasks...')
  
  const projectMap = {}
  projects.forEach(project => {
    projectMap[project.name] = project.id
  })
  
  const tasks = DEMO_TASKS.map(task => ({
    title: task.title,
    description: task.description,
    priority: task.priority,
    project_id: projectMap[task.project],
    date: task.date,
    completed: task.completed,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select()
  
  if (error) {
    console.error('❌ Error creating tasks:', error.message)
    return []
  }
  
  console.log('✅ Tasks created:', data.length)
  return data
}

async function createFinanceCategories(userId) {
  console.log('💰 Creating finance categories...')
  
  const allCategories = [
    ...DEMO_FINANCE_CATEGORIES.income.map(cat => ({
      ...cat,
      type: 'income',
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    ...DEMO_FINANCE_CATEGORIES.expenses.map(cat => ({
      ...cat,
      type: 'expense',
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  ]
  
  const { data, error } = await supabase
    .from('finance_categories')
    .insert(allCategories)
    .select()
  
  if (error) {
    console.error('❌ Error creating finance categories:', error.message)
    return []
  }
  
  console.log('✅ Finance categories created:', data.length)
  return data
}

async function createFinanceData(userId, categories) {
  console.log('📊 Creating finance data...')
  
  const categoryMap = {}
  categories.forEach(cat => {
    categoryMap[cat.name] = cat.id
  })
  
  const allData = [
    ...DEMO_FINANCE_DATA.income.map(item => ({
      category_id: categoryMap[item.category],
      values: item.values,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    ...DEMO_FINANCE_DATA.expenses.map(item => ({
      category_id: categoryMap[item.category],
      values: item.values,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  ]
  
  const { data, error } = await supabase
    .from('finance_data')
    .insert(allData)
    .select()
  
  if (error) {
    console.error('❌ Error creating finance data:', error.message)
    return []
  }
  
  console.log('✅ Finance data created:', data.length)
  return data
}

async function createFolders(userId) {
  console.log('📂 Creating folders...')
  
  const folders = DEMO_FOLDERS.map(folder => ({
    ...folder,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('folders')
    .insert(folders)
    .select()
  
  if (error) {
    console.error('❌ Error creating folders:', error.message)
    return []
  }
  
  console.log('✅ Folders created:', data.length)
  return data
}

async function createNotes(userId, folders) {
  console.log('📝 Creating notes...')
  
  const folderMap = {}
  folders.forEach(folder => {
    folderMap[folder.name] = folder.id
  })
  
  const notes = DEMO_NOTES.map(note => ({
    title: note.title,
    content: note.content,
    folder_id: folderMap[note.folder],
    pinned: note.pinned,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('notes')
    .insert(notes)
    .select()
  
  if (error) {
    console.error('❌ Error creating notes:', error.message)
    return []
  }
  
  console.log('✅ Notes created:', data.length)
  return data
}

async function seedDemoData() {
  try {
    console.log('🚀 Starting demo data seeding...')
    
    // Create demo user
    const user = await createDemoUser()
    if (!user) {
      console.error('❌ Failed to create demo user')
      return
    }
    
    // Create projects
    const projects = await createProjects(user.id)
    
    // Create tasks
    const tasks = await createTasks(user.id, projects)
    
    // Create finance categories
    const financeCategories = await createFinanceCategories(user.id)
    
    // Create finance data
    const financeData = await createFinanceData(user.id, financeCategories)
    
    // Create folders
    const folders = await createFolders(user.id)
    
    // Create notes
    const notes = await createNotes(user.id, folders)
    
    console.log('🎉 Demo data seeding completed!')
    console.log('📊 Summary:')
    console.log(`   👤 User: ${user.email}`)
    console.log(`   📁 Projects: ${projects.length}`)
    console.log(`   ✅ Tasks: ${tasks.length}`)
    console.log(`   💰 Finance Categories: ${financeCategories.length}`)
    console.log(`   📊 Finance Data: ${financeData.length}`)
    console.log(`   📂 Folders: ${folders.length}`)
    console.log(`   📝 Notes: ${notes.length}`)
    
    console.log('\n🔑 Demo credentials:')
    console.log(`   Email: ${DEMO_USER.email}`)
    console.log(`   Password: ${DEMO_USER.password}`)
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
  }
}

// Run the seeding
seedDemoData()

