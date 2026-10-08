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
