import { MoreVertical } from 'lucide-react';

interface WidgetHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const WidgetHeader = ({ icon, title, subtitle, onMenuClick }: WidgetHeaderProps) => {
  return (
    <div className="px-6 pt-4 pb-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-50">
            <div className="text-black">
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight !m-0 block">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 leading-tight mt-1 !m-0 block">{subtitle}</p>
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
};

export default WidgetHeader;
