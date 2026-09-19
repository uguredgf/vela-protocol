use soroban_sdk::{contracttype, Env, Bytes, BytesN};
use crate::types::{Config, Position};

pub const LEDGER_THRESHOLD: u32 = 17280; // ~1 day
pub const LEDGER_BUMP: u32 = 518400; // ~30 days
pub const LEDGER_INSTANCE_THRESHOLD: u32 = 17280;
pub const LEDGER_INSTANCE_BUMP: u32 = 518400;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    PositionCounter,
    Position(u64),
    Commitment(Bytes),
    IdentityUsed(BytesN<32>),
}

pub fn set_config(env: &Env, config: &Config) {
    env.storage().instance().set(&DataKey::Config, config);
}

pub fn get_config(env: &Env) -> Config {
    env.storage().instance().get(&DataKey::Config).unwrap()
}

pub fn has_config(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Config)
}

pub fn get_position_counter(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::PositionCounter).unwrap_or(0)
}

pub fn set_position_counter(env: &Env, counter: u64) {
    env.storage().instance().set(&DataKey::PositionCounter, &counter);
}

pub fn set_position(env: &Env, id: u64, position: &Position) {
    let key = DataKey::Position(id);
    env.storage().persistent().set(&key, position);
    env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

pub fn get_position(env: &Env, id: u64) -> Option<Position> {
    let key = DataKey::Position(id);
    if let Some(pos) = env.storage().persistent().get(&key) {
        env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
        Some(pos)
    } else {
        None
    }
}

pub fn has_commitment(env: &Env, commitment: &Bytes) -> bool {
    let key = DataKey::Commitment(commitment.clone());
    let has = env.storage().persistent().has(&key);
    if has {
        env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
    }
    has
}

pub fn set_commitment(env: &Env, commitment: &Bytes) {
    let key = DataKey::Commitment(commitment.clone());
    env.storage().persistent().set(&key, &true);
    env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

pub fn identity_used(env: &Env, identity_hash: &BytesN<32>) -> bool {
    let key = DataKey::IdentityUsed(identity_hash.clone());
    let used = env.storage().persistent().get(&key).unwrap_or(false);
    if used {
        env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
    }
    used
}

pub fn mark_identity_used(env: &Env, identity_hash: &BytesN<32>) {
    let key = DataKey::IdentityUsed(identity_hash.clone());
    env.storage().persistent().set(&key, &true);
    env.storage().persistent().extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(LEDGER_INSTANCE_THRESHOLD, LEDGER_INSTANCE_BUMP);
}
