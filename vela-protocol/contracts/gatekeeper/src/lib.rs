#![no_std]

mod blend;
mod errors;
mod events;
mod proof;
mod storage;
mod types;

#[cfg(test)]
extern crate std;
#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, Bytes, BytesN, Env, IntoVal, Symbol, symbol_short, vec};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use crate::blend::{BlendClient, Request, REQUEST_SUPPLY_COLLATERAL};
use crate::errors::GatekeeperError;
use crate::types::{Config, Position};

#[contract]
pub struct GatekeeperContract;

#[contractimpl]
impl GatekeeperContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        blend_pool: Address,
        usdc_token: Address,
        collateral_token: Address,
        subsidy_token: Address,
    ) -> Result<(), GatekeeperError> {
        if storage::has_config(&env) {
            return Err(GatekeeperError::AlreadyInitialized);
        }

        let config = Config {
            admin,
            blend_pool,
            usdc_token,
            collateral_token,
            subsidy_token,
        };

        storage::set_config(&env, &config);
        Ok(())
    }

    pub fn fund_subsidy_pool(env: Env, funder: Address, amount: i128) -> Result<(), GatekeeperError> {
        funder.require_auth();

        let config = storage::get_config(&env);
        if amount <= 0 {
            return Err(GatekeeperError::InvalidAmount);
        }

        let token = token::Client::new(&env, &config.subsidy_token);
        token.transfer(&funder, &env.current_contract_address(), &amount);

        events::subsidy_funded(&env, funder, amount);
        Ok(())
    }

    pub fn open_position(
        env: Env,
        user: Address,
        proof: Bytes,
        public_inputs: Bytes,
        collateral_amount: i128,
        identity_hash: BytesN<32>,
    ) -> Result<u64, GatekeeperError> {
        user.require_auth();

        if collateral_amount <= 0 {
            return Err(GatekeeperError::InvalidAmount);
        }

        if storage::identity_used(&env, &identity_hash) {
            return Err(GatekeeperError::IdentityAlreadyUsed);
        }

        let config = storage::get_config(&env);

        if storage::has_commitment(&env, &public_inputs) {
            return Err(GatekeeperError::DuplicateCommitment);
        }
        storage::set_commitment(&env, &public_inputs);

        let passed = proof::verify_proof(&env, &proof, &public_inputs)?;
        let subsidy_percentage = proof::calculate_subsidy_percentage(passed);

        if subsidy_percentage == 0 {
            return Err(GatekeeperError::InvalidScore);
        }

        events::proof_verified(&env, user.clone());

        let subsidy_amount = (collateral_amount * (subsidy_percentage as i128)) / 100;
        let total_position = collateral_amount + subsidy_amount;

        let token = token::Client::new(&env, &config.subsidy_token);
        let balance = token.balance(&env.current_contract_address());
        if balance < subsidy_amount {
            return Err(GatekeeperError::InsufficientSubsidyPool);
        }

        let col_token = token::Client::new(&env, &config.collateral_token);
        col_token.transfer(&user, &env.current_contract_address(), &collateral_amount);

        let blend_client = BlendClient::new(&env, &config.blend_pool);
        let mut requests = soroban_sdk::Vec::new(&env);
        requests.push_back(Request {
            address: config.collateral_token.clone(),
            amount: total_position,
            request_type: REQUEST_SUPPLY_COLLATERAL,
        });
        let contract_address = env.current_contract_address();
        // Blend transfers these tokens in a nested call, which needs explicit authorization.
        env.authorize_as_current_contract(vec![&env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: config.collateral_token.clone(),
                    fn_name: symbol_short!("transfer"),
                    args: (contract_address.clone(), config.blend_pool.clone(), total_position).into_val(&env),
                },
                sub_invocations: vec![&env],
            })
        ]);
        blend_client.submit(&contract_address, &contract_address, &contract_address, &requests);

        let id = storage::get_position_counter(&env) + 1;
        storage::set_position_counter(&env, id);

        let position = Position {
            user: user.clone(),
            collateral_amount,
            subsidy_amount,
            total_position,
            blend_request_id: 0,
            timestamp: env.ledger().timestamp(),
            status: symbol_short!("active"),
        };

        storage::set_position(&env, id, &position);
        storage::mark_identity_used(&env, &identity_hash);
        events::position_opened(&env, user, id, subsidy_amount);

        Ok(id)
    }

    pub fn get_position(env: Env, position_id: u64) -> Result<Position, GatekeeperError> {
        storage::get_position(&env, position_id).ok_or(GatekeeperError::PositionNotFound)
    }

    pub fn get_subsidy_balance(env: Env) -> i128 {
        let config = storage::get_config(&env);
        let token = token::Client::new(&env, &config.subsidy_token);
        token.balance(&env.current_contract_address())
    }

    pub fn set_config(env: Env, admin: Address, key: Symbol, value: Bytes) -> Result<(), GatekeeperError> {
        admin.require_auth();
        let config = storage::get_config(&env);
        if admin != config.admin {
            return Err(GatekeeperError::Unauthorized);
        }

        events::config_updated(&env, admin, key, value);
        Ok(())
    }

    pub fn extend_ttl(env: Env) {
        storage::extend_instance_ttl(&env);
    }
}
