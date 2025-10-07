import React from 'react';
import BentoGrid, { BentoCard } from './BentoGrid';
import '@/home.css';

// Direct imports without lazy loading
import TasksStatsWidget from './widgets/TasksStatsWidget';
import BudgetWidget from './widgets/BudgetWidget';
import PrioritiesWidget from './widgets/PrioritiesWidget';
import TasksTodayWidget from './widgets/TasksTodayWidget';
import PlannedExpensesWidget from './widgets/PlannedExpensesWidget';
import ProductivityWidget from './widgets/ProductivityWidget';
import { DebugBanner } from './widgets/DebugBanner';

export default function HomeDashboard() {
  return (
    <div className="home-page">
      <DebugBanner />
      
      <div className="home-grid">
        {/* ПЕРВАЯ СТРОЧКА */}
        {/* Созданные задачи */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <TasksStatsWidget type="total" />
        </BentoCard>

        {/* Закрытые задачи */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <TasksStatsWidget type="completed" />
        </BentoCard>

        {/* Продуктивность */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <ProductivityWidget />
        </BentoCard>

        {/* Задачи на сегодня - растянутый блок */}
        <BentoCard colSpan={1} rowSpan={2} className="bento-card">
          <TasksTodayWidget />
        </BentoCard>

        {/* ВТОРАЯ СТРОЧКА */}
        {/* Приоритеты */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <PrioritiesWidget />
        </BentoCard>

        {/* Запланированные траты */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <PlannedExpensesWidget />
        </BentoCard>

        {/* Бюджет месяца */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <BudgetWidget />
        </BentoCard>
      </div>
    </div>
  );
}