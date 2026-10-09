'use client';

import React from 'react';

interface MetricCardPrimitiveProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'default' | 'accent' | 'warning' | 'success';
}

export const MetricCardPrimitive: React.FC<MetricCardPrimitiveProps> = ({
  label,
  value,
  subValue,
  icon,
  badge,
  variant = 'default',
}) => {
  const borderVariants = {
    default: 'border-slate-800 bg-slate-900/80',
    accent: 'border-indigo-500/30 bg-indigo-950/20',
    warning: 'border-amber-500/30 bg-amber-950/20',
    success: 'border-emerald-500/30 bg-emerald-950/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${borderVariants[variant]} flex flex-col justify-between`}>
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {badge}
      </div>
      {subValue && <span className="text-[11px] text-slate-400 mt-1">{subValue}</span>}
    </div>
  );
};

export default MetricCardPrimitive;
