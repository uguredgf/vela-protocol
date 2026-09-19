# Gatekeeper Testnet Verification - 2026-09-18

Current frontend contract: `CCSDVXSUOS2P7PJZASQ7XZ27BYOMRWUNJPBMBK3AMF6PFWXT5VPU7ZMB`.

Configuration:
- Network: Stellar testnet
- Admin/test account: `GCG3ED3ZCAYQAF76DEB2LLXOQ75KF3PE4ZADO4JLCCWAM5YHRDALCJ6Y`
- Blend pool: `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF`
- Collateral and subsidy token (native XLM): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- USDC configuration field: `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU`
- WASM SHA-256: `0deb4e851b08e9e68f9a38b92292f81a93f85653f46c3a0f759032ed9f64be47`

## Confirmed Transactions

| Operation | Transaction |
| --- | --- |
| Deploy | [c95243e8c942444840408288ba7c5b45059b0260fce2df8b82887a71ebee3155](https://stellar.expert/explorer/testnet/tx/c95243e8c942444840408288ba7c5b45059b0260fce2df8b82887a71ebee3155) |
| Initialize | [4941d6f93c3973353db90c4243b054d2653a43310694c76efe748e2de5d57b4a](https://stellar.expert/explorer/testnet/tx/4941d6f93c3973353db90c4243b054d2653a43310694c76efe748e2de5d57b4a) |
| Fund first 1 XLM | [d26adf932a922320c702af586361165f32985740ee1a944eaf3d5cc0e7fb447b](https://stellar.expert/explorer/testnet/tx/d26adf932a922320c702af586361165f32985740ee1a944eaf3d5cc0e7fb447b) |
| Open position, 1 XLM collateral | [9d3c113a193e9e60ef67cdae8314453f773c737738d5257d37de1cc21948b5d1](https://stellar.expert/explorer/testnet/tx/9d3c113a193e9e60ef67cdae8314453f773c737738d5257d37de1cc21948b5d1) |
| Fund remaining 1,999 XLM | [8dd24c214d3dbcf36086c7b0454c8a09e6ef2fa029b76e4610c3c053e77e500e](https://stellar.expert/explorer/testnet/tx/8dd24c214d3dbcf36086c7b0454c8a09e6ef2fa029b76e4610c3c053e77e500e) |

The real transaction test used the deployer G-account and a test threshold claim, not a browser Passkey login or a cryptographically verified AI score. The contract still accepts a caller-supplied flag. No Anchor withdrawal was performed by this check.

## Captured Outputs

Frontend status reader executed against live RPC:
```json
{"hash":"4941d6f93c3973353db90c4243b054d2653a43310694c76efe748e2de5d57b4a","status":"SUCCESS"}
{"hash":"d26adf932a922320c702af586361165f32985740ee1a944eaf3d5cc0e7fb447b","status":"SUCCESS"}
{"hash":"8dd24c214d3dbcf36086c7b0454c8a09e6ef2fa029b76e4610c3c053e77e500e","status":"SUCCESS"}
{"hash":"9d3c113a193e9e60ef67cdae8314453f773c737738d5257d37de1cc21948b5d1","status":"SUCCESS"}
```

`get_position --position_id 1` with `--send no`:
```json
{"blend_request_id":0,"collateral_amount":"10000000","status":"active","subsidy_amount":"4000000","timestamp":1789735827,"total_position":"14000000","user":"GCG3ED3ZCAYQAF76DEB2LLXOQ75KF3PE4ZADO4JLCCWAM5YHRDALCJ6Y"}
```

`get_subsidy_balance` with `--send no`:
```text
"19996000000"
```
This is 1,999.6 XLM, after the 0.4 XLM test subsidy.

Frontend SDK simulation using empty proof bytes, fresh 36-byte public inputs, and 1,000 XLM collateral (not submitted):
```text
frontend-style 1000 XLM simulation result: 2
assembled: true
```

Local regression test and build:
```text
test test::nested_blend_transfer_is_authorized_and_duplicate_rolls_back ... ok
test result: ok. 1 passed; 0 failed
Wasm Size: 10580 bytes
```
`npx tsc --noEmit` exited 0. `npm run build` completed in 4.79s with the existing bundle-size warning.

## Identity Hash Duplicate Guard Deployment

The identity-hash duplicate-guard contract was deployed and funded on testnet:

- Contract: `CCSDVXSUOS2P7PJZASQ7XZ27BYOMRWUNJPBMBK3AMF6PFWXT5VPU7ZMB`
- Deploy transaction: `f924cb43d67a19aeec69a8d76e35c366bea5c71416cac0b11dbf51a25544b0c5`
- First `open_position` transaction: `bcec10737c1f4f538c142eca78c7de9540f9746d7e21f0680ff808ad7e84ab39`
- First call identity hash: 32 zero bytes (test-only)
- Second call with the same identity hash failed during simulation with `Error(Contract, #12)` (`IdentityAlreadyUsed`), using a different commitment to prove the identity check is independent of commitment replay.
- Live subsidy balance after funding: `20000000000` stroops (`2000 XLM`)

`CDO3YYFGPRKOVH3XRQQ2ZD2W233G7NZSKLOWT2OGSKOUF5ZWMNMAI7GV` was initialized (`042ec8d13070cdb6d56238b25d39ebe4e385b5950ce298d4352bc24b4a1adf77`) and funded with 2,000 testnet XLM (`bfa215e18f761a9778f859d02880ba93f01908b8dea186d188b4a55a7e51db09`). Its Blend nested transfer authorization was missing. Those test funds remain locked because that deployed version has no withdrawal or upgrade entry point. It is superseded by the current frontend contract listed at the top of this document.

The corrected contract also has no withdrawal entry point; this workflow verifies supplying collateral only. Blend records the collateral under the gatekeeper address. The frontend borrow limit remains an estimate, not a completed loan.
