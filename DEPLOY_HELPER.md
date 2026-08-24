# GhostLine Private Yield Vault deployment

`cairo/src/lib.cairo` is a stateless STRK20 `privacy_invoke` helper for ERC-4626-compatible Vesu vaults. On deposit, it receives a private underlying-token withdrawal from the STRK20 pool, deposits that amount in the supplied vault, measures the resulting vToken balance delta, and approves the pool to place those shares in the user's open note.

It does not custody funds between calls and has no owner. `privacy_invoke` is intentionally callable by the STRK20 flow, so the helper must never be pre-funded or used outside its atomic pool transaction. It is nevertheless experimental code: do not deploy or use it with meaningful mainnet value without an independent Cairo/security review and a confirmed Vesu vToken address.

## Build

Install [Scarb](https://docs.swmansion.com/scarb/) 2.18.0, then run from the repository root:

```powershell
Set-Location cairo
scarb fmt --check
scarb build
```

The Sierra and CASM artifacts are written under `cairo/target/dev/`. The GitHub Action runs this build and the format check on pull requests.

## Mainnet deployment checklist

1. Review the compiled source and CASM artifact; confirm the caller/pool assumptions with STRK20 maintainers.
2. Confirm the exact Vesu ERC-4626 vault address, its underlying-token address, and its deposit/withdraw ABI on Starknet mainnet.
3. Declare and deploy with a wallet-controlled account or a dedicated deployer. Never put a private key in this repository or in Vercel.
4. Record the deployed helper address in Vercel as `NEXT_PUBLIC_GHOSTLINE_YIELD_HELPER` if it should replace the current shared mainnet helper, then add the address to `strk20.json`.
5. Run a small shield → yield deposit → unshield test. Add the three resulting mainnet transaction hashes to `strk20.json`.

Deployment requires an explicit wallet signature and mainnet gas. It is deliberately not automated by this project.

## Wallet action format

GhostLine asks the privacy-enabled wallet for two STRK20 actions:

1. A private transfer of the underlying token to the deployed helper.
2. A `privacy_invoke` call with `Deposit`, underlying token, Vesu vToken, human-entered amount, and the wallet-supplied open-note ID.

The helper returns the actual minted-share delta, rather than trusting a user-supplied share amount. Vault and token choices remain visible to the chain; the wallet identity is hidden by the STRK20 private action.
