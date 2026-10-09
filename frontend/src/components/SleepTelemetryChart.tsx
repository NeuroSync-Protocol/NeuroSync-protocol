'use client';

import React, { useState } from 'react';
import { TelemetryEpochPoint, DateRangeFilter } from '@/types/telemetry';
import { Calendar, BarChart3, Activity } from 'lucide-react';

interface SleepTelemetryChartProps {
  data?: TelemetryEpochPoint[];
  isLoading?: boolean;
  onEpochSelect?: (point: TelemetryEpochPoint) => void;
}

export const SleepTelemetryChart: React.FC<SleepTelemetryChartProps> = ({
  data = [],
  isLoading = false,
  onEpochSelect,
}) => {
  const [activeRange, setActiveRange] = useState<DateRangeFilter['label']>('7D');
  const [selectedMetric, setSelectedMetric] = useState<'architecture' | 'hrv'>('architecture');

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Sleep Telemetry Architecture
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Multistage biometric sleep breakdown & Heart Rate Variability analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setSelectedMetric('architecture')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedMetric === 'architecture'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sleep Phases
            </button>
            <button
              onClick={() => setSelectedMetric('hrv')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                selectedMetric === 'hrv'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              HRV Overlay
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
            {(['7D', '14D', '30D'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeRange === range
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Container Shell */}
      <div className="relative w-full h-80 mt-6 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium">Loading telemetry streams...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No telemetry records found for current epoch range.</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-between gap-2 px-2">
            {/* Scaffold placeholder for bar elements */}
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Telemetry Chart Stage Ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepTelemetryChart;
