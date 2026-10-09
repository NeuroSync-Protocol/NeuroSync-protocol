#![no_std]
use soroban_sdk::{contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env};

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
pub struct MultiplierStreakEvent {
    pub user: Address,
    pub count: u32,
    pub timestamp: u64,
}

#[contractclient(name = "TokenClient")]
pub trait TokenInterface {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreakData {
    pub count: u32,
    pub last_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserState {
    pub unclaimed_allocation: i128,
    pub last_claim_timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenAddress,
    ClaimRecord(Address, u64),
    UserStreak(Address),
    Paused,
}

#[contract]
pub struct RewardDistributor;

#[contractimpl]
impl RewardDistributor {
    /// Initialize the contract with an admin and token contract address
    pub fn initialize(env: Env, admin: Address, token_address: Address) {
        let admin_key = DataKey::Admin;
        if env.storage().instance().has(&admin_key) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&admin_key, &admin);
        env.storage().instance().set(&DataKey::TokenAddress, &token_address);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().extend_ttl(172_800, 518_400);
    }

    /// Retrieve stored $NSYNC token address
    pub fn token_address(env: Env) -> Address {
        env.storage().instance().extend_ttl(172_800, 518_400);
        env.storage().instance().get(&DataKey::TokenAddress).unwrap_or_else(|| panic!("Token address not set"))
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

        env.events().publish((symbol_short!("circuit"), symbol_short!("pause")), admin);
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

        env.events().publish((symbol_short!("circuit"), symbol_short!("unpause")), admin);
    }

    /// Record or update a user's sleep streak length and timestamp.
    /// Can be invoked by Admin (requires auth) or Core Contract (cross-contract).
    pub fn set_streak(env: Env, caller: Address, user: Address, count: u32, timestamp: u64) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is paused");
        }
        let admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
        if let Some(admin_addr) = admin {
            if caller == admin_addr {
                admin_addr.require_auth();
            }
        }
        let ts = if timestamp == 0 { env.ledger().timestamp() } else { timestamp };
        let streak_key = DataKey::UserStreak(user.clone());
        env.storage().persistent().set(&streak_key, &StreakData { count, last_timestamp: ts });
        env.storage().persistent().extend_ttl(&streak_key, 172_800, 518_400);

        // Emit streak update event
        env.events().publish(
            (symbol_short!("streak"), symbol_short!("mult"), user.clone()),
            MultiplierStreakEvent {
                user,
                count,
                timestamp: ts,
            },
        );
    }

    /// Retrieve active streak for a user.
    /// If elapsed time > 48 hours (172,800 seconds), streak is broken and returns 0.
    pub fn get_streak(env: Env, user: Address) -> u32 {
        let key = DataKey::UserStreak(user);
        let streak: StreakData = match env.storage().persistent().get(&key) {
            Some(s) => s,
            None => return 0,
        };

        let current_time = env.ledger().timestamp();
        // 48 hours = 48 * 3600 = 172,800 seconds
        if streak.last_timestamp == 0 || current_time > streak.last_timestamp + 172_800 {
            0
        } else {
            streak.count
        }
    }

    /// Check if user has already claimed reward today using DayEpoch
    pub fn has_claimed_today(env: Env, user: Address) -> bool {
        let day_epoch = env.ledger().timestamp() / 86_400;
        let claim_key = DataKey::ClaimRecord(user, day_epoch);
        env.storage().persistent().get(&claim_key).unwrap_or(false)
    }

    /// Calculate pending reward for user based on streak length
    pub fn unclaimed_allocation(env: Env, user: Address) -> i128 {
        if Self::has_claimed_today(env.clone(), user.clone()) {
            return 0;
        }
        let streak = Self::get_streak(env, user);
        if streak == 0 {
            return 0;
        }
        // Base reward: 50 NSYNC tokens (7 decimals) + 5 NSYNC tokens per streak count
        (50 + (streak as i128) * 5) * 10_000_000
    }

    /// Alias for unclaimed_allocation
    pub fn get_unclaimed_allocation(env: Env, user: Address) -> i128 {
        Self::unclaimed_allocation(env, user)
    }

    /// Claim daily reward: requires both has_claimed_today == false and active streak > 0
    pub fn claim_reward(env: Env, user: Address) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is paused");
        }
        user.require_auth();

        // 1. Verify has_claimed_today(user) is FALSE
        if Self::has_claimed_today(env.clone(), user.clone()) {
            panic!("Already claimed today");
        }

        // 2. Require active streak and positive unclaimed allocation
        let streak = Self::get_streak(env.clone(), user.clone());
        if streak == 0 {
            panic!("No active sleep submission or streak expired");
        }

        let pending_amount = (50 + (streak as i128) * 5) * 10_000_000;

        // 3. Require pending_amount > 0
        if pending_amount <= 0 {
            panic!("No rewards available");
        }

        // 4. Safely retrieve token_address and check distributor contract balance
        env.storage().instance().extend_ttl(172_800, 518_400);
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap_or_else(|| panic!("Token address not set"));
            
        let token_client = TokenClient::new(&env, &token_addr);
        let distributor_balance = token_client.balance(&env.current_contract_address());
        if distributor_balance < pending_amount {
            panic!("Distributor contract has insufficient $NSYNC balance");
        }

        // 5. Execute cross-contract token transfer: move pending_amount of $NSYNC from distributor to user_address
        token_client.transfer(&env.current_contract_address(), &user, &pending_amount);

        // 6. Mark has_claimed_today(user) = TRUE for current DayEpoch and extend TTL
        let day_epoch = env.ledger().timestamp() / 86_400;
        let claim_key = DataKey::ClaimRecord(user.clone(), day_epoch);
        env.storage().persistent().set(&claim_key, &true);
        env.storage().persistent().extend_ttl(&claim_key, 172_800, 518_400);

        // 7. Emit epoch claim event with multiplier status
        let multiplier_bps = 1000 + (streak * 100);
        env.events().publish(
            (symbol_short!("epoch"), symbol_short!("claim"), user.clone()),
            EpochRewardClaimedEvent {
                user,
                day_epoch,
                amount: pending_amount,
                streak,
                multiplier_bps,
            },
        );
    }

    /// Return overall user state for UI consumption
    pub fn get_user_state(env: Env, user: Address) -> UserState {
        let unclaimed = Self::unclaimed_allocation(env.clone(), user.clone());
        let day_epoch = env.ledger().timestamp() / 86_400;
        let last_ts = if Self::has_claimed_today(env.clone(), user.clone()) {
            day_epoch * 86_400
        } else {
            0
        };
        UserState {
            unclaimed_allocation: unclaimed,
            last_claim_timestamp: last_ts,
        }
    }
}

#[cfg(test)]
mod test;
