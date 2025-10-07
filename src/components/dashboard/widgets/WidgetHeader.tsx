import React from 'react';
import { MoreVertical } from 'lucide-react';

interface WidgetHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function WidgetHeader({ icon, title, subtitle, onMenuClick }: WidgetHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#F2F7FA' }}>
            <div style={{ color: '#000000' }}>
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-0" style={{ fontSize: '16px' }}>{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0 mb-0">{subtitle}</p>
            )}
          </div>
        </div>
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Меню"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
