use soroban_sdk::{contracttype, Address, Bytes, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub user: Address,
    pub collateral_amount: i128,
    pub subsidy_amount: i128,
    pub total_position: i128,
    pub blend_request_id: u64,
    pub timestamp: u64,
    pub status: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProofData {
    pub proof: Bytes,
    pub public_inputs: Bytes,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub blend_pool: Address,
    pub usdc_token: Address,
    pub collateral_token: Address,
    pub subsidy_token: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubsidyTier {
    pub min_score_threshold: u32,
    pub subsidy_percentage: u32,
}
