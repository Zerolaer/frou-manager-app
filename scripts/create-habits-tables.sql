-- Создание таблиц для функционала Привычки
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица привычек
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('automatic', 'manual', 'progress')),
    start_date DATE NOT NULL,
    end_date DATE,
    initial_value NUMERIC DEFAULT 0,
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица записей о выполнении привычек
CREATE TABLE IF NOT EXISTS public.habit_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    value NUMERIC, -- Для типа progress - значение которое добавляется
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, date) -- Одна запись на день для каждой привычки
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_type ON public.habits(type);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_id ON public.habit_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON public.habit_entries(date);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON public.habit_entries(habit_id, date);

-- Включаем RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

-- Политики RLS для habits
CREATE POLICY "Users can view their own habits" ON public.habits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" ON public.habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON public.habits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON public.habits
    FOR DELETE USING (auth.uid() = user_id);

-- Политики RLS для habit_entries
CREATE POLICY "Users can view entries for their habits" ON public.habit_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.habits 
            WHERE habits.id = habit_entries.habit_id 
            AND habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert entries for their habits" ON public.habit_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.habits 
            WHERE habits.id = habit_entries.habit_id 
            AND habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update entries for their habits" ON public.habit_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.habits 
            WHERE habits.id = habit_entries.habit_id 
            AND habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete entries for their habits" ON public.habit_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.habits 
            WHERE habits.id = habit_entries.habit_id 
            AND habits.user_id = auth.uid()
        )
    );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления updated_at
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
