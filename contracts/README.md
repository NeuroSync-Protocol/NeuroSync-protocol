# NeuroSync Protocol Smart Contracts Suite

This directory contains the Soroban smart contracts powering the decentralized biometric sleep telemetry incentivization network:

- **`neurosync-core`**: Core telemetry verification, circuit breaker pause mechanism, streak tracking, and replay protection.
- **`reward_distributor`**: Daily epoch reward distribution, streak multiplier bonuses, and cross-contract `$NSYNC` token payouts.
- **`token`**: Stellar Soroban compatible NEP-standard token representing the `$NSYNC` utility token.

## Event Specifications
All contracts publish typed events using Soroban's native `env.events().publish(...)`:
- `EpochRewardClaimedEvent`: Emits recipient wallet, day epoch, token amount, streak count, and multiplier basis points.
- `MultiplierStreakEvent`: Emits updated streak count and ledger timestamp.
- `BiometricVerifiedEvent`: Emits telemetry proof verification status and verification timestamp.
- `CircuitBreakerEvent`: Emits admin address and pause status changes.
