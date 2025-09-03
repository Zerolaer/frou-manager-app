export const DASHBOARD = {
  TZ: 'Asia/Tbilisi',
  debug: (import.meta.env.VITE_DASHBOARD_DEBUG ?? '0') === '1',
  tasks: {
    table: 'tasks_items',
    id: 'id',
    title: 'title',
    due: 'date',
    status: 'status',
    statusDoneValue: 'done',
    priority: 'priority',
    // ВАЖНО: раньше стояло 'project_id' по умолчанию, теперь NULL,
    // чтобы не падать, если колонки нет.
    project: null as string | null,
    userId: 'user_id',
  },
  notes: {
    table: 'notes',
    id: 'id',
    title: 'title',
    updatedAt: 'updated_at',
    userId: 'user_id',
  },
  finance: {
    table: 'finance_entries',
    id: 'id',
    amount: 'amount',
    date: 'date',
    userId: 'user_id',
    /**
     * Режимы:
     * - 'type'  — строковая колонка ('income' | 'expense'), укажите finance.type = 'type'
     * - 'bool'  — булева колонка (true = income, false = expense), укажите finance.boolField = 'is_income'
     * - 'sign'  — определяем по знаку amount (>=0 — income, <0 — expense)
     * - 'auto'  — сначала пытаемся 'type', если нет — fallback на 'sign'
     */
    mode: 'auto' as 'auto' | 'type' | 'bool' | 'sign',
    type: 'type' as string | null,
    boolField: null as string | null,
  }
} as const;
