#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_reward_claim_event_payload_structure() {
    let env = Env::default();
    let user = Address::generate(&env);
    let event = EpochRewardClaimedEvent {
        user: user.clone(),
        day_epoch: 12345,
        amount: 550_000_000,
        streak: 1,
        multiplier_bps: 1100,
    };
    assert_eq!(event.user, user);
    assert_eq!(event.day_epoch, 12345);
    assert_eq!(event.amount, 550_000_000);
    assert_eq!(event.streak, 1);
    assert_eq!(event.multiplier_bps, 1100);
}

#[test]
fn test_multiplier_streak_event_payload() {
    let env = Env::default();
    let user = Address::generate(&env);
    let streak_event = MultiplierStreakEvent {
        user: user.clone(),
        count: 7,
        timestamp: 1700000000,
    };
    assert_eq!(streak_event.user, user);
    assert_eq!(streak_event.count, 7);
    assert_eq!(streak_event.timestamp, 1700000000);
}
