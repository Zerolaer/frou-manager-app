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

-- Создаем таблицу invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    total NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    folder_id UUID REFERENCES public.invoice_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1 NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS (Row Level Security)
ALTER TABLE public.invoice_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

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

-- Триггер для автоматического обновления updated_at в invoice_folders
CREATE TRIGGER update_invoice_folders_updated_at BEFORE UPDATE ON public.invoice_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

