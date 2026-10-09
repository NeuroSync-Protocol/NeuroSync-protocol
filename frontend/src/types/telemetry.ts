export type BiometricAuthenticityTier = 'ELITE' | 'VERIFIED' | 'SUSPICIOUS' | 'REJECTED';

export type ClaimTransactionStatus = 'idle' | 'preparing' | 'signing' | 'submitting' | 'confirmed' | 'failed';

export interface SleepStageBreakdown {
  remMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
}

export interface TelemetryEpochPoint {
  id: string;
  date: string;
  epochDay: number;
  remHours: number;
  deepHours: number;
  lightHours: number;
  totalSleepHours: number;
  hrvMs: number;
  authenticityScore: number;
  tier: BiometricAuthenticityTier;
  efficiencyScore: number;
}

export interface StreakMultiplierStatus {
  currentStreak: number;
  multiplierBps: number;
  multiplierDisplay: string;
  nextTierStreak: number;
  daysRemainingInEpoch: number;
  baseRewardNSYNC: number;
  totalEstimatedRewardNSYNC: number;
}

export interface TelemetryProofMetadata {
  proofHash: string;
  signature: string;
  oraclePublicKey: string;
  timestamp: number;
  deviceFingerprint: string;
  rawPayloadSize: number;
  verifiedOnChain: boolean;
  txHash?: string;
}

export interface ClaimToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  txHash?: string;
  timestamp: number;
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
  label: '7D' | '14D' | '30D' | 'ALL';
}
