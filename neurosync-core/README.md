# NeuroSync Core Soroban Smart Contracts

## Overview
`neurosync-core` houses the central cryptographic proof verification and habit streak logic for the NeuroSync protocol built on Soroban (Stellar).

## Core Capabilities
1. **Biometric Verification**: Validates Ed25519 signatures issued by the decentralized NeuroSync Oracle over aggregated biometric sleep packets (`env.crypto().ed25519_verify`).
2. **Native Contract Event Emissions**: Emits structured Soroban topics and payloads:
   - `(symbol_short!("biom"), symbol_short!("verify"), user)` -> `BiometricVerifiedEvent`
   - `(symbol_short!("circuit"), symbol_short!("pause"))` / `unpause` -> `CircuitBreakerEvent`
3. **Emergency Circuit Breaker**: Allows contract administrators to pause or unpause execution in critical failure conditions (`pause()`, `unpause()`, enforcing `admin.require_auth()`).
4. **Habit Streak Engine**: Tracks daily consecutive sleep telemetry submissions:
   - Increments streak if submitted between 24 and 48 hours of last submission.
   - Preserves state if submitted earlier than 24 hours.
   - Resets streak to 1 if lapse exceeds 48 hours.
5. **Replay & Rate Limiting**: Enforces rate limiting per wallet and single-use nonce replay protection.
6. **Storage TTL Management**: Explicitly extends instance and persistent data lifetimes using Soroban TTL APIs.
