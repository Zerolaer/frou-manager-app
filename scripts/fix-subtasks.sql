-- Полное исправление для поддержки подзадач как отдельных задач
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Разрешаем NULL значения в колонке date
ALTER TABLE public.tasks_items
ALTER COLUMN date DROP NOT NULL;

-- 2. Добавляем колонку parent_task_id
ALTER TABLE public.tasks_items 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks_items(id) ON DELETE CASCADE;

-- 3. Создаем индекс для быстрого поиска подзадач
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks_items(parent_task_id);

-- 4. Добавляем комментарии
COMMENT ON COLUMN public.tasks_items.date IS 'Дата задачи. NULL означает, что задача не отображается на доске';
COMMENT ON COLUMN public.tasks_items.parent_task_id IS 'ID родительской задачи, если эта задача является подзадачей';

-- 5. Проверяем результат
SELECT 'Subtask support enabled successfully!' as status;

