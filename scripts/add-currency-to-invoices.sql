-- Добавление поля currency в таблицу invoices
-- Выполните этот SQL в Supabase SQL Editor

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN currency TEXT DEFAULT 'EUR';
    END IF;
END $$;



