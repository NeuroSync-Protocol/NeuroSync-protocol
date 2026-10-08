#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Bytes, BytesN, Env};

#[contract]
pub struct MockRewardDistributor;

#[contractimpl]
impl MockRewardDistributor {
    pub fn set_streak(_env: Env, _caller: Address, _user: Address, _count: u32, _timestamp: u64) {}
}

#[test]
fn test_core_initialization_and_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);
    assert_eq!(client.admin(), admin);
    assert_eq!(client.is_paused(), false);

    // Pause contract
    client.pause(&admin);
    assert_eq!(client.is_paused(), true);

    // Unpause contract
    client.unpause(&admin);
    assert_eq!(client.is_paused(), false);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can pause")]
fn test_core_pause_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);
    client.pause(&impostor);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can unpause")]
fn test_core_unpause_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);
    client.pause(&admin);
    client.unpause(&impostor);
}

#[test]
#[should_panic(expected = "Unauthorized: only admin can set distributor")]
fn test_set_distributor_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NeuroSyncContract, ());
    let client = NeuroSyncContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let distributor = Address::generate(&env);
    let oracle_key = BytesN::from_array(&env, &[1u8; 32]);

    client.init(&admin, &oracle_key);
    client.set_distributor(&impostor, &distributor);
}
