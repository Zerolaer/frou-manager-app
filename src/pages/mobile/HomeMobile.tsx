import React, { useState, useEffect } from 'react'
import { CheckCircle2, ListTodo, TrendingUp, Calendar, DollarSign, Target } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import MobileLayout from '@/components/mobile/MobileLayout'
import { TASK_STATUSES } from '@/lib/constants'

export default function HomeMobile() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    todayTasks: 0,
    productivity: 0
  })

  useEffect(() => {
    if (!userId) return

    const loadStats = async () => {
      const { data } = await supabase
        .from('tasks_items')
        .select('status,date')

      const total = data?.length || 0
      const completed = data?.filter(t => t.status === TASK_STATUSES.CLOSED).length || 0
      const today = data?.filter(t => t.date === new Date().toISOString().split('T')[0]).length || 0
      const productivity = total > 0 ? Math.round((completed / total) * 100) : 0

      setStats({ totalTasks: total, completedTasks: completed, todayTasks: today, productivity })
    }

    loadStats()
  }, [userId])

  const StatCard = ({ icon: Icon, label, value }: any) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 rounded-lg p-2">
          <Icon className="w-5 h-5 text-gray-900" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-0.5">{label}</div>
          <div className="text-xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  )

  return (
    <MobileLayout title={t('nav.home')}>
      <div className="p-4 space-y-3">
        <StatCard
          icon={ListTodo}
          label={t('dashboard.totalTasks')}
          value={stats.totalTasks}
        />
        <StatCard
          icon={CheckCircle2}
          label={t('dashboard.completed')}
          value={stats.completedTasks}
        />
        <StatCard
          icon={TrendingUp}
          label={t('dashboard.productivity')}
          value={`${stats.productivity}%`}
        />
        <StatCard
          icon={Calendar}
          label={t('dashboard.todayTasks')}
          value={stats.todayTasks}
        />
      </div>
    </MobileLayout>
  )
}

