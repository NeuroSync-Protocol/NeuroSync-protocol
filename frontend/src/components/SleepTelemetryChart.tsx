"use client";

import React, { useState } from "react";
import { Moon, Activity, Zap, ShieldCheck } from "lucide-react";

export interface TelemetryEpochData {
  dayLabel: string;
  remSleepHours: number;
  deepSleepHours: number;
  lightSleepHours: number;
  hrvMs: number;
  dateStr?: string;
  authenticityScore?: number;
}

interface SleepTelemetryChartProps {
  data?: TelemetryEpochData[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_EPOCH_DATA: TelemetryEpochData[] = [
  { dayLabel: "Day 1", remSleepHours: 1.8, deepSleepHours: 1.6, lightSleepHours: 4.2, hrvMs: 68, authenticityScore: 96 },
  { dayLabel: "Day 2", remSleepHours: 2.1, deepSleepHours: 1.9, lightSleepHours: 3.8, hrvMs: 74, authenticityScore: 98 },
  { dayLabel: "Day 3", remSleepHours: 1.5, deepSleepHours: 1.2, lightSleepHours: 4.5, hrvMs: 59, authenticityScore: 92 },
  { dayLabel: "Day 4", remSleepHours: 2.3, deepSleepHours: 2.0, lightSleepHours: 3.9, hrvMs: 82, authenticityScore: 99 },
  { dayLabel: "Day 5", remSleepHours: 1.9, deepSleepHours: 1.7, lightSleepHours: 4.1, hrvMs: 71, authenticityScore: 95 },
  { dayLabel: "Day 6", remSleepHours: 2.4, deepSleepHours: 2.2, lightSleepHours: 3.6, hrvMs: 88, authenticityScore: 100 },
  { dayLabel: "Day 7", remSleepHours: 2.0, deepSleepHours: 1.8, lightSleepHours: 4.0, hrvMs: 76, authenticityScore: 97 },
];

export const SleepTelemetryChart: React.FC<SleepTelemetryChartProps> = ({
  data = DEFAULT_EPOCH_DATA,
  title = "7-Day Sleep Telemetry & Architecture Epoch",
  subtitle = "Cryptographically signed sleep stage breakdown and heart-rate variability (HRV) stream"
}) => {
  const [activeMetric, setActiveMetric] = useState<"stacked" | "hrv">("stacked");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const epochs = data.length > 0 ? data : DEFAULT_EPOCH_DATA;

  // Max total duration for sleep stack scaling (e.g., 10 hrs)
  const maxSleepHours = 10;
  // Max HRV for line chart scaling
  const maxHrv = 120;
  const minHrv = 40;

  // Canvas / SVG Dimensions
  const svgWidth = 700;
  const svgHeight = 260;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const barSlotWidth = plotWidth / epochs.length;
  const barWidth = Math.min(42, barSlotWidth * 0.65);

  // SVG coordinate helpers
  const getYForHours = (hours: number) => {
    return paddingTop + plotHeight - (hours / maxSleepHours) * plotHeight;
  };

  const getYForHrv = (hrv: number) => {
    const clamped = Math.max(minHrv, Math.min(maxHrv, hrv));
    return paddingTop + plotHeight - ((clamped - minHrv) / (maxHrv - minHrv)) * plotHeight;
  };

  const getXForIndex = (index: number) => {
    return paddingLeft + index * barSlotWidth + barSlotWidth / 2;
  };

  // Generate HRV SVG path
  const hrvPoints = epochs.map((d, i) => `${getXForIndex(i)},${getYForHrv(d.hrvMs)}`).join(" ");

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveMetric("stacked")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === "stacked"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Sleep Architecture
          </button>
          <button
            onClick={() => setActiveMetric("hrv")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === "hrv"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            HRV Autonomic Stream
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-indigo-500" />
          <span>Deep Sleep (Slow-Wave)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-purple-500" />
          <span>REM Sleep (Cognitive)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-400" />
          <span>Light Sleep (NREM 1/2)</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="h-2 w-5 rounded-full bg-emerald-500" />
          <span>HRV Baseline (ms)</span>
        </div>
      </div>

      {/* Responsive SVG Canvas */}
      <div className="relative mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[550px] overflow-visible select-none"
        >
          <defs>
            <linearGradient id="deepSleepGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#4338ca" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="remSleepGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="lightSleepGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="hrvAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 2.5, 5.0, 7.5, 10.0].map((h) => {
            const y = getYForHours(h);
            return (
              <g key={`grid-${h}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {h}h
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis (HRV scale) */}
          {[40, 60, 80, 100, 120].map((hrv) => {
            const y = getYForHrv(hrv);
            return (
              <text
                key={`hrv-label-${hrv}`}
                x={svgWidth - paddingRight + 8}
                y={y + 3}
                textAnchor="start"
                className="text-[10px] fill-emerald-600/70 dark:fill-emerald-400/70 font-mono"
              >
                {hrv}ms
              </text>
            );
          })}

          {/* Stacked Bars */}
          {activeMetric === "stacked" &&
            epochs.map((epoch, idx) => {
              const x = getXForIndex(idx) - barWidth / 2;
              const totalSleep = epoch.deepSleepHours + epoch.remSleepHours + epoch.lightSleepHours;

              const deepHeight = (epoch.deepSleepHours / maxSleepHours) * plotHeight;
              const remHeight = (epoch.remSleepHours / maxSleepHours) * plotHeight;
              const lightHeight = (epoch.lightSleepHours / maxSleepHours) * plotHeight;

              const deepY = paddingTop + plotHeight - deepHeight;
              const remY = deepY - remHeight;
              const lightY = remY - lightHeight;

              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={`bar-group-${idx}`}
                  className="cursor-pointer transition-opacity"
                  opacity={hoveredIdx !== null && !isHovered ? 0.45 : 1}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Deep Sleep */}
                  <rect
                    x={x}
                    y={deepY}
                    width={barWidth}
                    height={deepHeight}
                    rx={2}
                    fill="url(#deepSleepGrad)"
                  />
                  {/* REM Sleep */}
                  <rect
                    x={x}
                    y={remY}
                    width={barWidth}
                    height={remHeight}
                    rx={2}
                    fill="url(#remSleepGrad)"
                  />
                  {/* Light Sleep (rounded top corners) */}
                  <rect
                    x={x}
                    y={lightY}
                    width={barWidth}
                    height={lightHeight}
                    rx={4}
                    fill="url(#lightSleepGrad)"
                  />

                  {/* Authenticity Badge Indicator */}
                  {epoch.authenticityScore && (
                    <circle
                      cx={getXForIndex(idx)}
                      cy={lightY - 10}
                      r={3.5}
                      className={
                        epoch.authenticityScore >= 95
                          ? "fill-emerald-500"
                          : "fill-blue-500"
                      }
                    />
                  )}
                </g>
              );
            })}

          {/* HRV Line Overlay / Dedicated View */}
          <g>
            {activeMetric === "hrv" && (
              <polygon
                points={`${getXForIndex(0)},${paddingTop + plotHeight} ${hrvPoints} ${getXForIndex(epochs.length - 1)},${paddingTop + plotHeight}`}
                fill="url(#hrvAreaGrad)"
              />
            )}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth={activeMetric === "hrv" ? 3 : 2}
              strokeDasharray={activeMetric === "stacked" ? "3 3" : undefined}
              points={hrvPoints}
            />
            {epochs.map((epoch, idx) => {
              const cx = getXForIndex(idx);
              const cy = getYForHrv(epoch.hrvMs);
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={`hrv-dot-${idx}`}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  className="fill-white dark:fill-slate-900 stroke-emerald-500 stroke-2 cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </g>

          {/* X Axis Day Labels */}
          {epochs.map((epoch, idx) => {
            const x = getXForIndex(idx);
            return (
              <text
                key={`xlabel-${idx}`}
                x={x}
                y={paddingTop + plotHeight + 20}
                textAnchor="middle"
                className={`text-xs font-semibold ${
                  hoveredIdx === idx
                    ? "fill-blue-600 dark:fill-blue-400 font-bold"
                    : "fill-slate-500 dark:fill-slate-400"
                }`}
              >
                {epoch.dayLabel}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && epochs[hoveredIdx] && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-in fade-in duration-150">
            <div>
              <span className="font-bold text-sm block">
                {epochs[hoveredIdx].dayLabel} Telemetry Telemetry Shard
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                Authenticity: {epochs[hoveredIdx].authenticityScore || 98}% Verified Proof
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Deep Sleep</span>
                <span className="font-bold text-indigo-400 dark:text-indigo-600">{epochs[hoveredIdx].deepSleepHours}h</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block">REM Sleep</span>
                <span className="font-bold text-purple-400 dark:text-purple-600">{epochs[hoveredIdx].remSleepHours}h</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Light Sleep</span>
                <span className="font-bold text-sky-400 dark:text-sky-600">{epochs[hoveredIdx].lightSleepHours}h</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block">HRV</span>
                <span className="font-bold text-emerald-400 dark:text-emerald-600">{epochs[hoveredIdx].hrvMs} ms</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SleepTelemetryChart;
