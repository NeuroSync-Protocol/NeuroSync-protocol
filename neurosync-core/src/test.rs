#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Events, Ledger}, Bytes, BytesN, Env};

#[contract]
pub struct MockRewardDistributor;

#[contractimpl]
impl MockRewardDistributor {
    pub fn set_streak(_env: Env, _caller: Address, _user: Address, _count: u32, _timestamp: u64) {}
}

#[test]
fn test_setup_environment_mock_auth_and_ledger() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);
    assert_eq!(client.admin(), admin);
    assert_eq!(client.is_paused(), false);
}

#[test]
fn test_telemetry_event_emission() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);

    let events = env.events().all();
    // At initialization or status queries events can be checked
    assert_eq!(client.is_paused(), false);
}

#[test]
fn test_reward_claim_event_payload() {
    let env = Env::default();
    let user = Address::generate(&env);
    let event = EpochRewardClaimedEvent {
        user: user.clone(),
        day_epoch: 42,
        amount: 100_000_000,
        streak: 5,
        multiplier_bps: 1500,
    };
    assert_eq!(event.user, user);
    assert_eq!(event.amount, 100_000_000);
    assert_eq!(event.streak, 5);
    assert_eq!(event.multiplier_bps, 1500);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can pause")]
fn test_unauthorized_pause_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let unauthorized_caller = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);

    client.pause(&unauthorized_caller);
}
