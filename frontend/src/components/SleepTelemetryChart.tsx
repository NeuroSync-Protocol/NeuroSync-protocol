'use client';

import React, { useState } from 'react';
import { TelemetryEpochPoint, DateRangeFilter } from '@/types/telemetry';
import { Calendar, BarChart3, Activity, Info } from 'lucide-react';

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
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryEpochPoint | null>(null);

  const displayData = data.slice(0, activeRange === '7D' ? 7 : activeRange === '14D' ? 14 : 30);
  const maxHours = Math.max(...displayData.map((d) => d.totalSleepHours || 9), 9);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Sleep Telemetry Architecture
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Multistage biometric breakdown & Heart Rate Variability over epochs
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

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs font-medium text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-purple-500 shadow-sm" />
          <span>REM Sleep</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-indigo-500 shadow-sm" />
          <span>Deep Sleep</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-sky-400 shadow-sm" />
          <span>Light Sleep</span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="relative w-full h-72 mt-6">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium">Loading telemetry streams...</span>
          </div>
        ) : displayData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Calendar className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No telemetry records found for current epoch range.</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-between gap-3 pt-6 pb-2">
            {displayData.map((item) => {
              const remHeight = (item.remHours / maxHours) * 100;
              const deepHeight = (item.deepHours / maxHours) * 100;
              const lightHeight = (item.lightHours / maxHours) * 100;

              return (
                <div
                  key={item.id}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onClick={() => onEpochSelect?.(item)}
                  onMouseEnter={() => setHoveredPoint(item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Stacked bar container */}
                  <div className="w-full max-w-[48px] bg-slate-800/60 rounded-t-lg overflow-hidden flex flex-col-reverse justify-start transition-transform group-hover:scale-105 duration-200">
                    {/* Deep sleep (bottom) */}
                    <div
                      style={{ height: `${deepHeight}%` }}
                      className="w-full bg-indigo-500 hover:bg-indigo-400 transition-colors"
                    />
                    {/* Light sleep (middle) */}
                    <div
                      style={{ height: `${lightHeight}%` }}
                      className="w-full bg-sky-400 hover:bg-sky-300 transition-colors"
                    />
                    {/* REM sleep (top) */}
                    <div
                      style={{ height: `${remHeight}%` }}
                      className="w-full bg-purple-500 hover:bg-purple-400 transition-colors"
                    />
                  </div>

                  {/* Day label */}
                  <span className="text-xs font-medium text-slate-400 mt-2 truncate w-full text-center">
                    {item.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-800/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md pointer-events-none z-10 text-xs">
            <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
              <span>{hoveredPoint.date}</span>
              <span className="text-slate-400">(Epoch {hoveredPoint.epochDay})</span>
            </p>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between gap-4">
                <span className="text-purple-400">REM Sleep:</span>
                <span className="font-semibold">{hoveredPoint.remHours.toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-indigo-400">Deep Sleep:</span>
                <span className="font-semibold">{hoveredPoint.deepHours.toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-sky-400">Light Sleep:</span>
                <span className="font-semibold">{hoveredPoint.lightHours.toFixed(1)} hrs</span>
              </div>
              <div className="border-t border-slate-700/80 pt-1 mt-1 flex justify-between gap-4 font-bold text-white">
                <span>Total Sleep:</span>
                <span>{hoveredPoint.totalSleepHours.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepTelemetryChart;
