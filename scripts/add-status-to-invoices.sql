-- Добавление поля status в таблицу invoices
-- Выполните этот SQL в Supabase SQL Editor

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN status TEXT DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Paid', 'Canceled'));
    END IF;
END $$;

-- Обновляем существующие записи, у которых статус NULL
UPDATE public.invoices 
SET status = 'Waiting' 
WHERE status IS NULL;



