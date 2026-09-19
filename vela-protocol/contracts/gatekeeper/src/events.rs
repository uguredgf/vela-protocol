use soroban_sdk::{Env, Address, Bytes, Symbol, symbol_short};

pub fn position_opened(env: &Env, user: Address, position_id: u64, subsidy: i128) {
    let topics = (symbol_short!("opened"), user);
    env.events().publish(topics, (position_id, subsidy));
}

pub fn subsidy_funded(env: &Env, funder: Address, amount: i128) {
    let topics = (symbol_short!("funded"), funder);
    env.events().publish(topics, amount);
}

pub fn proof_verified(env: &Env, user: Address) {
    let topics = (symbol_short!("verified"), user);
    env.events().publish(topics, ());
}

pub fn config_updated(env: &Env, admin: Address, key: Symbol, value: Bytes) {
    let topics = (symbol_short!("config"), admin, key);
    env.events().publish(topics, value);
}
