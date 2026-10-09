'use client';

import React from 'react';
import { StreakMultiplierStatus } from '@/types/telemetry';
import { AuthenticityScoreBadge } from './AuthenticityScoreBadge';
import { Flame, Sparkles, TrendingUp, Zap, Coins } from 'lucide-react';

interface AuthenticityMetricCardProps {
  streakStatus: StreakMultiplierStatus;
  authenticityScore: number;
  onClaimClick?: () => void;
  isClaiming?: boolean;
  canClaim?: boolean;
}

export const AuthenticityMetricCard: React.FC<AuthenticityMetricCardProps> = ({
  streakStatus,
  authenticityScore,
  onClaimClick,
  isClaiming = false,
  canClaim = true,
}) => {
  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Authenticity Badge & Multiplier */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <AuthenticityScoreBadge score={authenticityScore} size="md" />

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multiplier: {streakStatus.multiplierDisplay}</span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
        {/* Streak Count */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">{streakStatus.currentStreak}</span>
            <span className="text-xs text-slate-400 font-medium">Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Next Tier at {streakStatus.nextTierStreak} days
          </p>
        </div>

        {/* Multiplier Bps */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Streak Boost</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-yellow-400">+{streakStatus.multiplierBps / 100}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Applied to daily epoch rewards
          </p>
        </div>

        {/* Total Estimated NSYNC */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Epoch Reward</span>
            <Coins className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-indigo-400">{streakStatus.totalEstimatedRewardNSYNC}</span>
            <span className="text-xs text-slate-400 font-medium">$NSYNC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Base: {streakStatus.baseRewardNSYNC} + Streak bonus
          </p>
        </div>
      </div>

      {/* Claim Button Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 relative z-10">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Epoch settlement active • Telemetry proof verified</span>
        </div>

        <button
          onClick={onClaimClick}
          disabled={!canClaim || isClaiming}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
            canClaim && !isClaiming
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 cursor-pointer active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {isClaiming ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Claiming Reward...</span>
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              <span>Claim Epoch Allocation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AuthenticityMetricCard;
