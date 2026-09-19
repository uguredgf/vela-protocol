use super::*;
use soroban_sdk::{testutils::{Address as _, MockAuth, MockAuthInvoke}, Vec};

#[contract]
struct TestBlend;

#[contractimpl]
impl TestBlend {
    pub fn submit(env: Env, spender: Address, from: Address, to: Address, requests: Vec<Request>) {
        spender.require_auth();
        assert_eq!(from, to);
        for request in requests.iter() {
            assert_eq!(request.request_type, REQUEST_SUPPLY_COLLATERAL);
            token::Client::new(&env, &request.address)
                .transfer(&from, &env.current_contract_address(), &request.amount);
        }
    }
}

#[test]
fn nested_blend_transfer_is_authorized_and_duplicate_rolls_back() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let pool = env.register(TestBlend, ());
    let gate = env.register(GatekeeperContract, ());
    let client = GatekeeperContractClient::new(&env, &gate);
    client.initialize(&admin, &pool, &asset, &asset, &asset);

    env.mock_all_auths();
    let issuer = token::StellarAssetClient::new(&env, &asset);
    issuer.mint(&admin, &20_000_000);
    issuer.mint(&user, &10_000_000);
    client.fund_subsidy_pool(&admin, &20_000_000);

    let proof = Bytes::new(&env);
    let mut bytes = [7u8; 36];
    bytes[32..].copy_from_slice(&1u32.to_be_bytes());
    let inputs = Bytes::from_array(&env, &bytes);
    // Only the user's authorization is mocked; gatekeeper's nested token auth must be real.
    env.mock_auths(&[MockAuth {
        address: &user,
        invoke: &MockAuthInvoke {
            contract: &gate,
            fn_name: "open_position",
            args: (user.clone(), proof.clone(), inputs.clone(), 10_000_000i128, soroban_sdk::BytesN::from_array(&env, &[7u8; 32])).into_val(&env),
            sub_invokes: &[MockAuthInvoke {
                contract: &asset,
                fn_name: "transfer",
                args: (user.clone(), gate.clone(), 10_000_000i128).into_val(&env),
                sub_invokes: &[],
            }],
        },
    }]);
    let identity_hash = soroban_sdk::BytesN::from_array(&env, &[7u8; 32]);
    let id = client.open_position(&user, &proof, &inputs, &10_000_000, &identity_hash);
    assert_eq!(id, 1);
    let balances = token::Client::new(&env, &asset);
    assert_eq!(balances.balance(&pool), 14_000_000);
    assert_eq!(balances.balance(&gate), 16_000_000);
    assert_eq!(balances.balance(&user), 0);
    assert_eq!(client.get_position(&id).total_position, 14_000_000);
    env.mock_all_auths();
    let second = client.try_open_position(&user, &proof, &inputs, &10_000_000, &identity_hash);
    assert!(std::format!("{second:?}").contains("IdentityAlreadyUsed"));
    assert_eq!(balances.balance(&pool), 14_000_000);
    assert_eq!(balances.balance(&gate), 16_000_000);
}
