'use client';

import React from 'react';

export const TelemetryProofSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Metric Card Skeleton */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-36 bg-slate-800 rounded-full" />
          <div className="h-6 w-28 bg-slate-800 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
              <div className="h-4 w-20 bg-slate-700/60 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-28 bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 w-44 bg-slate-800 rounded-xl ml-auto" />
      </div>

      {/* Sleep Chart Skeleton */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="h-6 w-52 bg-slate-800 rounded" />
            <div className="h-4 w-72 bg-slate-800/60 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-slate-800 rounded-xl" />
            <div className="h-8 w-24 bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Bar skeletons */}
        <div className="h-64 flex items-end justify-between gap-4 pt-8">
          {[60, 85, 45, 95, 70, 80, 65].map((h, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div
                style={{ height: `${h}%` }}
                className="w-full max-w-[48px] bg-slate-800/80 rounded-t-lg"
              />
              <div className="h-3 w-8 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TelemetryProofSkeleton;
