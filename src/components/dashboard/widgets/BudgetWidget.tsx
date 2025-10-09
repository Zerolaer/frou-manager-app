import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Euro } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyEUR } from '@/lib/format';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTranslation } from 'react-i18next';
import WidgetHeader from './WidgetHeader';

interface BudgetData {
  balance: number;
  earned: number;
  spent: number;
  previousBalance: number;
  previousEarned: number;
  previousSpent: number;
  avgDailySpent: number;
  daysInMonth: number;
  daysPassed: number;
  remainingDays: number;
  projectedSpent: number;
}

const BudgetWidget = () => {
  const { userId } = useSupabaseAuth();
  const { t } = useTranslation();
  const [budget, setBudget] = useState<BudgetData>({
    balance: 0,
    earned: 0,
    spent: 0,
    previousBalance: 0,
    previousEarned: 0,
    previousSpent: 0,
    avgDailySpent: 0,
    daysInMonth: 0,
    daysPassed: 0,
    remainingDays: 0,
    projectedSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadBudgetData();
  }, [userId]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11 for array indexing
      const currentYear = now.getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Load data for current and previous year
      const [catsRes, currentEntriesRes, previousEntriesRes] = await Promise.all([
        supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at', { ascending: true }),
        supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', currentYear),
        supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', previousYear),
      ]);
      
      if (catsRes.error || currentEntriesRes.error || previousEntriesRes.error) { 
        console.error('Error loading data:', catsRes.error || currentEntriesRes.error || previousEntriesRes.error);
        setBudget({
          balance: 0, earned: 0, spent: 0,
          previousBalance: 0, previousEarned: 0, previousSpent: 0,
          avgDailySpent: 0, daysInMonth: 0, daysPassed: 0, remainingDays: 0, projectedSpent: 0
        });
        return;
      }
      
      const cats = catsRes.data || [];
      const currentEntries = currentEntriesRes.data || [];
      const previousEntries = previousEntriesRes.data || [];
      
      // Function to process data
      const processEntries = (entries: any[], year: number) => {
        const byId: Record<string, number[]> = {};
        
        // Create array for each category
        for (const c of cats) byId[c.id] = Array(12).fill(0);
        
        // Fill data from entries
        for (const e of entries) {
          if (!e.included) continue;
          const i = Math.min(11, Math.max(0, (e.month as number) - 1));
          const id = e.category_id as string;
          if (!byId[id]) byId[id] = Array(12).fill(0);
          byId[id][i] += Number(e.amount) || 0;
        }
        
        // Filter by types and create final arrays
        const income = cats.filter((c) => c.type === 'income').map((c) => ({ 
          id: c.id, 
          name: c.name, 
          parent_id: c.parent_id, 
          values: byId[c.id] || Array(12).fill(0) 
        }));
        
        const expense = cats.filter((c) => c.type === 'expense').map((c) => ({ 
          id: c.id, 
          name: c.name, 
          parent_id: c.parent_id, 
          values: byId[c.id] || Array(12).fill(0) 
        }));

        return { income, expense };
      };

      const currentData = processEntries(currentEntries, currentYear);
      const previousData = processEntries(previousEntries, previousYear);

      // Calculate totals for current month
      const totalIncome = currentData.income.reduce((s, c) => s + (c.values?.[currentMonth] ?? 0), 0);
      const totalExpense = currentData.expense.reduce((s, c) => s + (c.values?.[currentMonth] ?? 0), 0);
      const balance = totalIncome - totalExpense;

      // Calculate totals for previous month
      const previousTotalIncome = previousData.income.reduce((s, c) => s + (c.values?.[previousMonth] ?? 0), 0);
      const previousTotalExpense = previousData.expense.reduce((s, c) => s + (c.values?.[previousMonth] ?? 0), 0);
      const previousBalance = previousTotalIncome - previousTotalExpense;

      // Additional calculations
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysPassed = now.getDate();
      const remainingDays = daysInMonth - daysPassed;
      const avgDailySpent = daysPassed > 0 ? totalExpense / daysPassed : 0;
      const projectedSpent = avgDailySpent * daysInMonth;

      setBudget({
        balance,
        earned: totalIncome,
        spent: totalExpense,
        previousBalance,
        previousEarned: previousTotalIncome,
        previousSpent: previousTotalExpense,
        avgDailySpent,
        daysInMonth,
        daysPassed,
        remainingDays,
        projectedSpent
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
      setBudget({
        balance: 0, earned: 0, spent: 0,
        previousBalance: 0, previousEarned: 0, previousSpent: 0,
        avgDailySpent: 0, daysInMonth: 0, daysPassed: 0, remainingDays: 0, projectedSpent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Use formatCurrencyEUR for euros

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<Euro className="w-5 h-5" />}
        title={t('dashboard.budget')}
        subtitle={t('dashboard.budget')}
      />

      <div className="flex-1 p-6 flex flex-col min-h-0">
        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Balance */}
          <div className="bg-black rounded-lg p-3 text-center">
            <div className="text-xs text-gray-300 mb-1">{t('dashboard.balance')}</div>
            <div className="text-lg font-bold text-white">
              {formatCurrencyEUR(budget.balance)}
            </div>
            {budget.previousBalance !== 0 && (
              <div className="text-xs text-gray-300">
                {budget.balance > budget.previousBalance ? '↗' : '↘'} {Math.abs(((budget.balance - budget.previousBalance) / budget.previousBalance * 100)).toFixed(0)}%
              </div>
            )}
          </div>

          {/* Income */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{t('dashboard.earned')}</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrencyEUR(budget.earned)}
            </div>
            {budget.previousEarned !== 0 && (
              <div className="text-xs text-gray-600">
                {budget.earned > budget.previousEarned ? '↗' : '↘'} {Math.abs(((budget.earned - budget.previousEarned) / budget.previousEarned * 100)).toFixed(0)}%
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{t('dashboard.spent')}</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrencyEUR(budget.spent)}
            </div>
            {budget.previousSpent !== 0 && (
              <div className="text-xs text-gray-600">
                {budget.spent < budget.previousSpent ? '↗' : '↘'} {Math.abs(((budget.spent - budget.previousSpent) / budget.previousSpent * 100)).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Additional statistics */}
        <div className="space-y-3">
          {/* Income to expense ratio */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Income to expense ratio</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-black h-2 rounded-full"
                style={{ width: `${budget.earned > 0 ? Math.min(100, (budget.spent / budget.earned) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {budget.earned > 0 ? `${((budget.spent / budget.earned) * 100).toFixed(0)}%` : '0%'} of income spent
            </div>
          </div>

          {/* Comparison with previous month */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">Balance change</div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">To previous month</span>
              <span className="text-sm font-bold text-gray-900">
                {budget.balance > budget.previousBalance ? '+' : ''}{formatCurrencyEUR(budget.balance - budget.previousBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetWidget;
