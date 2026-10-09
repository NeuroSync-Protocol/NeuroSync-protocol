'use client';

import React from 'react';
import { DateRangeFilter } from '@/types/telemetry';
import { Calendar, Filter, Sparkles } from 'lucide-react';

interface DateRangeFilterBarProps {
  currentFilter: DateRangeFilter['label'];
  onFilterChange: (filter: DateRangeFilter['label']) => void;
  startDate?: string;
  endDate?: string;
  totalRecordsCount?: number;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  currentFilter,
  onFilterChange,
  startDate,
  endDate,
  totalRecordsCount = 7,
}) => {
  const filterOptions: Array<{ label: DateRangeFilter['label']; title: string }> = [
    { label: '7D', title: 'Past 7 Days' },
    { label: '14D', title: 'Past 14 Days' },
    { label: '30D', title: 'Past 30 Days' },
    { label: 'ALL', title: 'All Time' },
  ];

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Calendar className="w-4 h-4 text-indigo-400" />
        <span className="font-medium">
          {startDate && endDate ? `${startDate} — ${endDate}` : 'Active Epoch Scope'}
        </span>
        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
          {totalRecordsCount} records
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
        <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
        {filterOptions.map(({ label, title }) => (
          <button
            key={label}
            onClick={() => onFilterChange(label)}
            title={title}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              currentFilter === label
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangeFilterBar;
