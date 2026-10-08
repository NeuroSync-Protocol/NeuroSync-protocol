#![no_std]
use soroban_sdk::{contract, contractclient, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BiometricVerifiedEvent {
    pub user: Address,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EpochRewardClaimedEvent {
    pub user: Address,
    pub day_epoch: u64,
    pub amount: i128,
    pub streak: u32,
    pub multiplier_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircuitBreakerEvent {
    pub admin: Address,
    pub is_paused: bool,
}

#[contractclient(name = "RewardDistributorClient")]
pub trait RewardDistributorInterface {
    fn set_streak(env: Env, caller: Address, user: Address, count: u32, timestamp: u64);
}

#[contracttype]
pub enum DataKey {
    Admin,
    OracleKey,
    DistributorAddress,
    UserStreak(Address),
    Paused,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreakData {
    pub count: u32,
    pub last_timestamp: u64,
}

#[contract]
pub struct NeuroSyncContract;

#[contractimpl]
impl NeuroSyncContract {
    /// Initializes the contract with the Oracle's public key and admin address.
    pub fn init(env: Env, admin: Address, oracle_pub_key: BytesN<32>) {
        let key = DataKey::OracleKey;
        if env.storage().instance().has(&key) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&key, &oracle_pub_key);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().extend_ttl(172_800, 518_400);
    }

    /// Retrieve the admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().extend_ttl(172_800, 518_400);
        env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| panic!("Admin not set"))
    }

    /// Check if the contract is paused
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().extend_ttl(172_800, 518_400);
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    /// Emergency pause circuit breaker - requires admin authentication
    pub fn pause(env: Env, admin: Address) {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not set"));
        if admin != stored_admin {
            panic!("Unauthorized: only admin can pause");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &true);
        env.storage().instance().extend_ttl(172_800, 518_400);

        env.events().publish(
            (symbol_short!("circuit"), symbol_short!("pause")),
            CircuitBreakerEvent {
                admin,
                is_paused: true,
            },
        );
    }

    /// Resume operations after emergency pause - requires admin authentication
    pub fn unpause(env: Env, admin: Address) {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not set"));
        if admin != stored_admin {
            panic!("Unauthorized: only admin can unpause");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().extend_ttl(172_800, 518_400);

        env.events().publish(
            (symbol_short!("circuit"), symbol_short!("unpause")),
            CircuitBreakerEvent {
                admin,
                is_paused: false,
            },
        );
    }

    /// Extend instance storage TTL helper
    pub fn extend_instance_ttl(env: Env, threshold: u32, extend_to: u32) {
        env.storage().instance().extend_ttl(threshold, extend_to);
    }

    /// Extend persistent user streak data TTL helper
    pub fn extend_user_ttl(env: Env, user: Address, threshold: u32, extend_to: u32) {
        let streak_key = DataKey::UserStreak(user);
        if env.storage().persistent().has(&streak_key) {
            env.storage().persistent().extend_ttl(&streak_key, threshold, extend_to);
        }
    }

    /// Set or update the deployed Reward Distributor contract address
    pub fn set_distributor(env: Env, distributor: Address) {
        env.storage().instance().set(&DataKey::DistributorAddress, &distributor);
    }

    /// Verifies biometric telemetry proof against Oracle key and publishes event
    pub fn verify_telemetry(
        env: Env,
        user: Address,
        payload: Bytes,
        signature: BytesN<64>,
    ) -> bool {
        if Self::is_paused(env.clone()) {
            panic!("Contract is paused");
        }
        user.require_auth();

        env.storage().instance().extend_ttl(172_800, 518_400);
        let key = DataKey::OracleKey;
        let oracle_pub_key: BytesN<32> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("Contract not initialized"));

        env.crypto().ed25519_verify(&oracle_pub_key, &payload, &signature);

        let timestamp = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("biom"), symbol_short!("verify"), user.clone()),
            BiometricVerifiedEvent {
                user,
                timestamp,
            },
        );

        true
    }

    /// Submits a signed sleep data shard.
    /// Verifies the Oracle signature and updates the habit streak logic.
    pub fn submit_shard(
        env: Env,
        user: Address,
        payload: Bytes,
        signature: BytesN<64>,
    ) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is paused");
        }

        // 1. Require authorization from the user
        user.require_auth();

        // 2. Extend instance storage TTL and fetch stored Oracle public key
        env.storage().instance().extend_ttl(172_800, 518_400);
        let key = DataKey::OracleKey;
        let oracle_pub_key: BytesN<32> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("Contract not initialized"));

        // 3. Cryptographically verify signature matches the payload and Oracle public key
        env.crypto().ed25519_verify(&oracle_pub_key, &payload, &signature);

        let current_timestamp = env.ledger().timestamp();

        // Emit biometric verification event
        env.events().publish(
            (symbol_short!("biom"), symbol_short!("verify"), user.clone()),
            BiometricVerifiedEvent {
                user: user.clone(),
                timestamp: current_timestamp,
            },
        );

        // 4. Retrieve or initialize the user's streak data from persistent storage using on-chain ledger timestamp
        let current_timestamp = env.ledger().timestamp();
        let streak_key = DataKey::UserStreak(user.clone());
        if env.storage().persistent().has(&streak_key) {
            env.storage().persistent().extend_ttl(&streak_key, 172_800, 518_400);
        }

        let mut streak: StreakData = env
            .storage()
            .persistent()
            .get(&streak_key)
            .unwrap_or(StreakData {
                count: 0,
                last_timestamp: 0,
            });

        // 5. Implement habit streak logic:
        // Do NOT update last_timestamp if user submits early (< 24 hrs).
        // Only update last_timestamp when a legitimate daily streak increment or reset occurs.
        if streak.last_timestamp == 0 {
            // First submission: initialize streak to 1
            streak.count = 1;
            streak.last_timestamp = current_timestamp;
        } else {
            // Enforce timestamp linearity
            if current_timestamp < streak.last_timestamp {
                panic!("Invalid current timestamp: must be greater than last timestamp");
            }

            let diff = current_timestamp - streak.last_timestamp;
            if diff >= 86_400 && diff <= 172_800 {
                // Submitted within 24 to 48 hours: increment streak count
                streak.count += 1;
                streak.last_timestamp = current_timestamp;
            } else if diff > 172_800 {
                // Submitted after 48 hours: penalize and reset count to 1
                streak.count = 1;
                streak.last_timestamp = current_timestamp;
            }
            // If diff < 86_400 (less than 24 hours), count AND last_timestamp remain UNCHANGED.
        }

        // 6. Save updated streak back to persistent storage and extend TTL
        env.storage().persistent().set(&streak_key, &streak);
        env.storage().persistent().extend_ttl(&streak_key, 172_800, 518_400);

        // 7. Synchronize streak data with Reward Distributor contract if configured
        if let Some(distributor_addr) = env.storage().instance().get::<DataKey, Address>(&DataKey::DistributorAddress) {
            let client = RewardDistributorClient::new(&env, &distributor_addr);
            client.set_streak(&env.current_contract_address(), &user, &streak.count, &streak.last_timestamp);
        }
    }

    /// Returns the user's streak data, or None if they have no active streak.
    pub fn get_streak(env: Env, user: Address) -> Option<StreakData> {
        let key = DataKey::UserStreak(user);
        env.storage().persistent().get(&key)
    }
}
