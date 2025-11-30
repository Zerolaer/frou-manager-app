-- Создание таблиц для Invoice функционала
-- Выполните этот SQL в Supabase SQL Editor

-- Создаем таблицу invoice_folders
CREATE TABLE IF NOT EXISTS public.invoice_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу invoice_client_templates для шаблонов клиентов
CREATE TABLE IF NOT EXISTS public.invoice_client_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    -- FROM (отправитель) данные
    from_name TEXT,
    from_country TEXT,
    from_city TEXT,
    from_province TEXT,
    from_address_line1 TEXT,
    from_address_line2 TEXT,
    from_postal_code TEXT,
    from_account_number TEXT,
    from_routing_number TEXT,
    from_swift_bic TEXT,
    from_bank_name TEXT,
    from_bank_address TEXT,
    -- TO (клиент) данные
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    client_phone TEXT,
    subtotal NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    total NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем колонку folder_id, если её нет (для существующих таблиц)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN folder_id UUID REFERENCES public.invoice_folders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Создаем таблицу invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    period TEXT,
    quantity NUMERIC(10, 2) DEFAULT 1 NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    price_per_hour NUMERIC(10, 2),
    hours NUMERIC(10, 2),
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS (Row Level Security)
ALTER TABLE public.invoice_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_client_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS для invoice_client_templates
DROP POLICY IF EXISTS "Users can view their own client templates" ON public.invoice_client_templates;
DROP POLICY IF EXISTS "Users can insert their own client templates" ON public.invoice_client_templates;
DROP POLICY IF EXISTS "Users can update their own client templates" ON public.invoice_client_templates;
DROP POLICY IF EXISTS "Users can delete their own client templates" ON public.invoice_client_templates;

CREATE POLICY "Users can view their own client templates" ON public.invoice_client_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client templates" ON public.invoice_client_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client templates" ON public.invoice_client_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client templates" ON public.invoice_client_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Удаляем существующие политики, если они есть (для повторного запуска скрипта)
DROP POLICY IF EXISTS "Users can view their own invoice folders" ON public.invoice_folders;
DROP POLICY IF EXISTS "Users can insert their own invoice folders" ON public.invoice_folders;
DROP POLICY IF EXISTS "Users can update their own invoice folders" ON public.invoice_folders;
DROP POLICY IF EXISTS "Users can delete their own invoice folders" ON public.invoice_folders;

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can view invoice items for their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items for their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items for their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items for their invoices" ON public.invoice_items;

-- Создаем политики RLS для invoice_folders
CREATE POLICY "Users can view their own invoice folders" ON public.invoice_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice folders" ON public.invoice_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice folders" ON public.invoice_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice folders" ON public.invoice_folders
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики RLS для invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики RLS для invoice_items
CREATE POLICY "Users can view invoice items for their invoices" ON public.invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoice items for their invoices" ON public.invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoice items for their invoices" ON public.invoice_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete invoice items for their invoices" ON public.invoice_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_invoice_folders_user_id ON public.invoice_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_client_templates_user_id ON public.invoice_client_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_folder_id ON public.invoices(folder_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_position ON public.invoice_items(invoice_id, position);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Удаляем существующие триггеры, если они есть (для повторного запуска скрипта)
DROP TRIGGER IF EXISTS update_invoice_folders_updated_at ON public.invoice_folders;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;

-- Триггер для автоматического обновления updated_at в invoice_folders
CREATE TRIGGER update_invoice_folders_updated_at BEFORE UPDATE ON public.invoice_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в invoice_client_templates
DROP TRIGGER IF EXISTS update_invoice_client_templates_updated_at ON public.invoice_client_templates;
CREATE TRIGGER update_invoice_client_templates_updated_at BEFORE UPDATE ON public.invoice_client_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

