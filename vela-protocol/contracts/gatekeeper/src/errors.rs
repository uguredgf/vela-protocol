use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GatekeeperError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InsufficientSubsidyPool = 4,
    InvalidProof = 5,
    InvalidAmount = 6,
    BlendCallFailed = 7,
    PositionNotFound = 8,
    ProofExpired = 9,
    DuplicateCommitment = 10,
    InvalidScore = 11,
    IdentityAlreadyUsed = 12,
}
