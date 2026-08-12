import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  isError?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  iconClassName = 'w-3.5 h-3.5 text-secondary shrink-0',
  isError = false,
}) => {
  return (
    <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
      <span className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
        isError ? 'text-error' : 'text-secondary'
      }`}>
        {Icon && <Icon className={iconClassName} />}
        {label}
      </span>

      <div className="flex items-baseline gap-1.5">
        <span className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-on-surface tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="font-sans text-xs text-secondary font-semibold">{unit}</span>
        )}
      </div>
    </div>
  );
};
