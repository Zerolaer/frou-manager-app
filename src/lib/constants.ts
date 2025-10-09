// App constants
export const APP_NAME = 'Finance Suite'
export const CACHE_VERSION = 'v2'

// Time constants
export const MONTHS_IN_YEAR = 12
export const TOAST_DURATION = 3000
export const ERROR_TOAST_DURATION = 5000
export const DEBOUNCE_DELAY = 250

// Finance constants
export const FINANCE_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
} as const

export const FINANCE_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const

// Task constants
export const TASK_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal', 
  MEDIUM: 'medium',
  HIGH: 'high'
} as const

export const TASK_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed'
} as const

export const TASK_PROJECT_ALL = 'ALL'

// Goal constants
export const GOAL_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed'
} as const

export const GOAL_TYPES = {
  CHECKLIST: 'checklist',
  AMOUNT: 'amount'
} as const

export const GOAL_MAX_PROGRESS = 100

// UI constants
export const CONTEXT_MENU_WIDTH = 200
export const CONTEXT_MENU_HEIGHT_CATEGORY = 120
export const CONTEXT_MENU_HEIGHT_CELL = 80

// Cache keys
export const CACHE_KEYS = {
  SIDEBAR_COLLAPSED: 'app.sidebar.collapsed',
  FINANCE: (uid: string, year: number) => `finance:${CACHE_VERSION}:${uid}:${year}`
} as const

// Validation constants
export const VALIDATION = {
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 999999999
} as const
