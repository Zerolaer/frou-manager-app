import { TasksToday } from './widgets/TasksToday';
import { RecentNotes } from './widgets/RecentNotes';
import { FinanceMonth } from './widgets/FinanceMonth';
import { DebugBanner } from './widgets/DebugBanner';
export default function HomeDashboard() {
  return (
    <div className="p-0 md:p-8">
      <DebugBanner />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
        <div className="xl:col-span-2 space-y-6">
          <TasksToday />
          <FinanceMonth />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <RecentNotes />
        </div>
      </div>
    </div>
  );
}