'use client';

import React from 'react';
import { Moon, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface EmptyTelemetryStateProps {
  onSyncClick?: () => void;
}

export const EmptyTelemetryState: React.FC<EmptyTelemetryStateProps> = ({ onSyncClick }) => {
  return (
    <div className="w-full bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
        <Moon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Sleep Telemetry Recorded</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        Sync your smart wearable (Oura Ring, Apple Watch, WHOOP) to begin logging cryptographic zero-knowledge sleep epochs and earning $NSYNC streak rewards.
      </p>
      <button
        onClick={onSyncClick}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>Initiate Device Sync</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default EmptyTelemetryState;
