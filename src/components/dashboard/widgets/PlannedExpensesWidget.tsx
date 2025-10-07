import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { formatCurrencyEUR } from '@/lib/format';
import { FINANCE_TYPES } from '@/lib/constants';
import { monthRangeTZ } from '@/lib/dateUtils';
import { DASHBOARD } from '@/config/dashboard.config';
import WidgetHeader from './WidgetHeader';

interface PlannedExpense {
  id: string;
  amount: number;
  note: string | null;
  category_name: string;
  month: number;
  year: number;
}

export default function PlannedExpensesWidget() {
  const { userId } = useSupabaseAuth();
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Получаем текущий месяц с учетом timezone
  const [{ start }] = useState(() => monthRangeTZ(DASHBOARD.TZ));
  const currentYear = start.getFullYear();
  const currentMonth = start.getMonth() + 1; // getMonth() возвращает 0-11, нам нужно 1-12

  useEffect(() => {
    if (!userId) return;
    loadPlannedExpenses();
  }, [userId, currentYear, currentMonth]);

  const loadPlannedExpenses = async () => {
    try {
      setLoading(true);
      
      console.log('PlannedExpensesWidget - Loading planned expenses for userId:', userId);
      
      if (!userId) {
        setExpenses([]);
        return;
      }

      // Сначала загружаем только категории расходов
      const categoriesRes = await supabase
        .from('finance_categories')
        .select('id, name, type')
        .eq('user_id', userId)
        .eq('type', FINANCE_TYPES.EXPENSE)
        .order('created_at', { ascending: true });

      if (categoriesRes.error) {
        console.error('Error loading categories:', categoriesRes.error);
        setExpenses([]);
        return;
      }

      const categories = categoriesRes.data || [];
      
      if (categories.length === 0) {
        setExpenses([]);
        return;
      }

      // Получаем ID категорий расходов
      const expenseCategoryIds = categories.map(cat => cat.id);

      // Теперь загружаем записи только для категорий расходов
      const entriesRes = await supabase
        .from('finance_entries')
        .select('id, amount, note, category_id')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .eq('included', true)
        .in('category_id', expenseCategoryIds)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (entriesRes.error) {
        console.error('Error loading entries:', entriesRes.error);
        setExpenses([]);
        return;
      }

      const entries = entriesRes.data || [];

      // Создаем мапу категорий для быстрого поиска
      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

      // Преобразуем записи в формат PlannedExpense
      const plannedExpenses: PlannedExpense[] = entries.map(entry => ({
        id: entry.id,
        amount: Number(entry.amount) || 0,
        note: entry.note,
        category_name: categoryMap.get(entry.category_id) || 'Неизвестная категория',
        month: currentMonth,
        year: currentYear
      }));

      console.log('PlannedExpensesWidget - Loaded aggregated data:', plannedExpenses);
      
      setExpenses(plannedExpenses);
      
    } catch (error) {
      console.error('Error loading planned expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  
  // Форматируем название месяца
  const monthLabel = useMemo(() => 
    new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(start), 
    [start]
  );

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<CreditCard className="w-5 h-5 text-red-600" />}
        title="Запланированные траты"
        subtitle={`Расходы за ${monthLabel}`}
      />

      <div className="flex-1 p-6 flex flex-col min-h-0">
        {/* Список трат */}
        <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide min-h-0">
          {expenses.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Нет запланированных трат</p>
            </div>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {expense.note || expense.category_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate -mt-1">
                    {expense.category_name}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-sm font-semibold text-orange-600">
                    {formatCurrencyEUR(expense.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {expenses.length > 5 && (
          <div className="mt-2 text-center flex-shrink-0">
            <span className="text-xs text-gray-500">
              и еще {expenses.length - 5} трат
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
