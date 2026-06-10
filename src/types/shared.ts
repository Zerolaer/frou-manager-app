// Shared types used across multiple components

export type Project = {
  id: string;
  name: string;
  color?: string | null;
  position?: number;
}

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  // For subtasks that can be opened as separate tasks
  isTask?: boolean;
  taskId?: string;
  // Date for subtask to appear on board
  date?: string | null;
  // Additional fields for subtasks that are opened as separate tasks
  description?: string | null;
  tag?: string | null;
  priority?: string | null;
  // Flag to distinguish simple todos from subtasks
  isSimpleTodo?: boolean;
}

export type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  date: string | null;
  start_date?: string | null; // Start date for Gantt chart
  due_date?: string | null; // Due date for Gantt chart
  position: number;
  priority?: string | null;
  tag?: string | null;
  scheduled_time?: string | null;
  todos?: Todo[];
  status?: string;
  project_id?: string | null;
  project_name?: string | null;
  recurring_task_id?: string | null;
  parent_task_id?: string | null; // For subtasks opened as tasks
  created_at?: string;
  updated_at?: string;
}

export type MoneyType = 'income' | 'expense';

export type Cat = {
  id: string;
  name: string;
  type: MoneyType;
  values: number[];
  parent_id?: string | null;
  isCollapsed?: boolean;
  /** True when the category has any finance_entries rows (included or excluded). */
  hasDirectEntries?: boolean;
}

export type CtxCat = {
  id: string;
  name: string;
  type: MoneyType;
}

export type CellCtx = {
  categoryId: string;
  month: number;
}

// Finance specific types
export type FinanceCellCtx = {
  catId: string;
  type: MoneyType;
  month: number;
}

export type FinanceCurrency = 'EUR' | 'USD' | 'GEL'

export type EntryLite = {
  id: string;
  amount: number;
  month: number;
  category_id: string;
  included: boolean;
  note?: string | null;
  currency?: FinanceCurrency;
}

// API Response types
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Common form states
export type FormState = {
  loading: boolean;
  error: string | null;
}
