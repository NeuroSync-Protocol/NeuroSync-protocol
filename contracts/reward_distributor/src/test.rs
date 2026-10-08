#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, vec, IntoVal, Env};

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
    pub fn balance(_env: Env, _id: Address) -> i128 {
        1_000_000_000_000i128
    }
}

#[test]
fn test_distributor_initialization_and_pause_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardDistributor, ());
    let client = RewardDistributorClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin, &token);
    assert_eq!(client.is_paused(), false);
    assert_eq!(client.token_address(), token);

    // Pause
    client.pause(&admin);
    assert_eq!(client.is_paused(), true);

    // Unpause
    client.unpause(&admin);
    assert_eq!(client.is_paused(), false);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can pause")]
fn test_distributor_pause_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardDistributor, ());
    let client = RewardDistributorClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin, &token);
    client.pause(&non_admin);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can unpause")]
fn test_distributor_unpause_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardDistributor, ());
    let client = RewardDistributorClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin, &token);
    client.pause(&admin);
    client.unpause(&non_admin);
}

#[test]
fn test_distributor_events_on_streak_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(MockToken, ());
    let contract_id = env.register(RewardDistributor, ());
    let client = RewardDistributorClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &token_id);

    // Set streak and verify event emission
    client.set_streak(&admin, &user, &5u32, &1000u64);
    assert_eq!(client.get_streak(&user), 5u32);

    // Claim reward and verify event emission
    client.claim_reward(&user);
    assert_eq!(client.has_claimed_today(&user), true);

    // Verify events were emitted
    let events = env.events().all();
    assert!(events.len() >= 2);
}

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_claim_reward_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(MockToken, ());
    let contract_id = env.register(RewardDistributor, ());
    let client = RewardDistributorClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &token_id);
    client.set_streak(&admin, &user, &3u32, &1000u64);

    client.pause(&admin);
    client.claim_reward(&user);
}
