'use client';

import React from 'react';
import { BiometricAuthenticityTier } from '@/types/telemetry';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface AuthenticityScoreBadgeProps {
  score: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const getAuthenticityTier = (score: number): {
  tier: BiometricAuthenticityTier;
  label: string;
  badgeClass: string;
  iconClass: string;
  bgGlow: string;
} => {
  if (score >= 90) {
    return {
      tier: 'ELITE',
      label: 'Elite Authenticity',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      iconClass: 'text-emerald-400',
      bgGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    };
  } else if (score >= 75) {
    return {
      tier: 'VERIFIED',
      label: 'Verified Biometrics',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      iconClass: 'text-indigo-400',
      bgGlow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    };
  } else if (score >= 50) {
    return {
      tier: 'SUSPICIOUS',
      label: 'Anomaly Flagged',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      iconClass: 'text-amber-400',
      bgGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    };
  } else {
    return {
      tier: 'REJECTED',
      label: 'Spoof Rejected',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      iconClass: 'text-rose-400',
      bgGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    };
  }
};

export const AuthenticityScoreBadge: React.FC<AuthenticityScoreBadgeProps> = ({
  score,
  showDetails = true,
  size = 'md',
}) => {
  const { tier, label, badgeClass, iconClass, bgGlow } = getAuthenticityTier(score);

  const renderIcon = () => {
    switch (tier) {
      case 'ELITE':
        return <ShieldCheck className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'VERIFIED':
        return <CheckCircle2 className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'SUSPICIOUS':
        return <AlertTriangle className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'REJECTED':
        return <XCircle className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 border rounded-full font-semibold transition-all ${badgeClass} ${bgGlow} ${sizeClasses[size]}`}
    >
      <span className={iconClass}>{renderIcon()}</span>
      <span className="tracking-wide">
        {Math.round(score)}% {showDetails && `• ${label}`}
      </span>
    </div>
  );
};

export default AuthenticityScoreBadge;
