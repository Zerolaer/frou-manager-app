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
}

export type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  date: string | null;
  position: number;
  priority?: string | null;
  tag?: string | null;
  todos?: Todo[];
  status?: string;
  project_id?: string | null;
  project_name?: string | null;
  recurring_task_id?: string | null;
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

export type EntryLite = {
  id: string;
  amount: number;
  month: number;
  category_id: string;
  included: boolean;
  note?: string | null;
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
