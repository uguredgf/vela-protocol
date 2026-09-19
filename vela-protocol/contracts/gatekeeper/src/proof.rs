use soroban_sdk::{Env, Bytes};
use crate::errors::GatekeeperError;

/// Commitment and threshold-claim validator (hackathon MVP).
/// `public_inputs` (36 bytes):
/// - bytes 0..32: skorun commitment hash'i (score + salt) — burada hiç okunmuyor,
///   sadece lib.rs'deki storage::has_commitment ile replay-koruması için taşınıyor.
/// - bytes 32..36: u32 big-endian bayrak, SADECE 0 veya 1 olabilir.
///   1 = "client claimed that the score met the threshold", 0 = did not meet it.
/// The raw score and the relationship between the commitment and claim are not
/// verified here; a full ZK verifier is a future upgrade.
pub fn verify_proof(_env: &Env, _proof: &Bytes, public_inputs: &Bytes) -> Result<bool, GatekeeperError> {
    if public_inputs.len() != 36 {
        return Err(GatekeeperError::InvalidProof);
    }

    let flag_bytes = public_inputs.slice(32..36);
    let mut flag_arr = [0u8; 4];
    for i in 0..4 {
        flag_arr[i as usize] = flag_bytes.get(i).unwrap_or(0);
    }
    let flag = u32::from_be_bytes(flag_arr);

    match flag {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(GatekeeperError::InvalidProof), // 0/1 dışında bir değer = bozuk/sahte proof
    }
}

/// Subsidy percentage for a passing threshold claim.
pub fn calculate_subsidy_percentage(passed: bool) -> u32 {
    if passed {
        40
    } else {
        0
    }
}
