"use client";

import React from "react";
import { ShieldCheck, Flame, Zap, Award, CheckCircle2 } from "lucide-react";

export interface AuthenticityMetricCardProps {
  authenticityScore: number; // e.g. 96 (%)
  streakCount: number;       // e.g. 5 (days)
  multiplier?: number;       // e.g. 1.5 (x)
  totalVerifiedProofs?: number;
  lastVerifiedHash?: string;
  className?: string;
}

export const AuthenticityMetricCard: React.FC<AuthenticityMetricCardProps> = ({
  authenticityScore,
  streakCount,
  multiplier,
  totalVerifiedProofs = 0,
  lastVerifiedHash,
  className = ""
}) => {
  const computedMultiplier = multiplier || Number((1.0 + streakCount * 0.1).toFixed(2));

  // Determine score health tier
  const getScoreTier = (score: number) => {
    if (score >= 90) {
      return {
        label: "Cryptographically Pristine",
        colorText: "text-emerald-600 dark:text-emerald-400",
        colorBg: "bg-emerald-50 dark:bg-emerald-950/40",
        colorBorder: "border-emerald-200 dark:border-emerald-900/50",
        badgeBg: "bg-emerald-500",
      };
    } else if (score >= 75) {
      return {
        label: "Verified Physiological Stream",
        colorText: "text-blue-600 dark:text-blue-400",
        colorBg: "bg-blue-50 dark:bg-blue-950/40",
        colorBorder: "border-blue-200 dark:border-blue-900/50",
        badgeBg: "bg-blue-500",
      };
    } else {
      return {
        label: "Requires Biometric Recalibration",
        colorText: "text-amber-600 dark:text-amber-400",
        colorBg: "bg-amber-50 dark:bg-amber-950/40",
        colorBorder: "border-amber-200 dark:border-amber-900/50",
        badgeBg: "bg-amber-500",
      };
    }
  };

  const tier = getScoreTier(authenticityScore);

  return (
    <div
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm relative overflow-hidden transition-all ${className}`}
    >
      {/* Background glow orbs */}
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-orange-500/5 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Biometric Authenticity & Multiplier
            </h3>
            <p className="text-[11px] text-slate-400">
              Decentralized proof verification & habit yield boost
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${tier.colorBg} ${tier.colorText} ${tier.colorBorder}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tier.badgeBg} animate-pulse`} />
          {tier.label}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
        
        {/* Biometric Authenticity Score */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Authenticity Score
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-slate-50">
              {authenticityScore}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Oracle Validated
            </span>
          </div>
          {/* Progress track */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, authenticityScore))}%` }}
            />
          </div>
        </div>

        {/* Streak Multiplier Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Streak Multiplier
            </span>
            <Flame className="h-4 w-4 text-orange-500 fill-current animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-orange-600 dark:text-orange-400">
              {computedMultiplier}x
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({streakCount} Day Streak)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            +{(streakCount * 10)}% yield boost on $NSYNC epoch rewards
          </div>
        </div>

      </div>

      {/* Bottom Proof Info */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Award className="h-3.5 w-3.5 text-blue-500" />
          {totalVerifiedProofs} Total Shards Ingested
        </span>
        {lastVerifiedHash && (
          <span className="font-mono text-[10px] truncate max-w-[200px]" title={lastVerifiedHash}>
            Hash: {lastVerifiedHash.slice(0, 10)}...{lastVerifiedHash.slice(-6)}
          </span>
        )}
      </div>
    </div>
  );
};
export default AuthenticityMetricCard;
