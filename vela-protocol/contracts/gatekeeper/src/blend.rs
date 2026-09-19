use soroban_sdk::{contractclient, contracttype, Address, Env, Val, Vec};

pub const REQUEST_SUPPLY_COLLATERAL: u32 = 2;

#[contracttype]
#[derive(Clone)]
pub struct Request {
    pub address: Address,
    pub amount: i128,
    pub request_type: u32,
}

#[contractclient(name = "BlendClient")]
pub trait BlendPool {
    fn submit(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        requests: Vec<Request>,
    ) -> Val;
}
