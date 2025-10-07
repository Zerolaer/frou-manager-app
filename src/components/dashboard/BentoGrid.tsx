import React from 'react';

interface BentoGridProps {
  children: React.ReactNode;
}

export default function BentoGrid({ children }: BentoGridProps) {
  return (
    <div className="home-grid">
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
}

export function BentoCard({ children, className = '', colSpan = 1, rowSpan = 1 }: BentoCardProps) {
  const colSpanClass = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
  }[colSpan];

  const rowSpanClass = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
  }[rowSpan];

  return (
    <div 
      className={`
        bg-white rounded-3xl
        ${colSpanClass} ${rowSpanClass} ${className}
      `}
      style={{
        border: '1px solid #E9F2F6'
      }}
    >
      {children}
    </div>
  );
}
