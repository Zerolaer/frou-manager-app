-- Добавление поля parent_task_id для поддержки подзадач как отдельных задач
-- Выполните этот SQL в Supabase SQL Editor

-- Добавляем колонку parent_task_id
ALTER TABLE public.tasks_items 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks_items(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска подзадач
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks_items(parent_task_id);

-- Комментарий к колонке
COMMENT ON COLUMN public.tasks_items.parent_task_id IS 'ID родительской задачи, если эта задача является подзадачей';

SELECT 'parent_task_id column added successfully!' as status;
