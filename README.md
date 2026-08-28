# GhostLine

**Privacy intelligence for Starknet.**

GhostLine helps people make more considered private transactions. It combines a behavioural privacy-risk dashboard with non-custodial STRK20 wallet actions, so users can assess timing, address reuse, activity history, and transaction patterns before moving assets.

Built for the [STRK20 Private Sprint](https://github.com/starkience/strk20-hackathon) on Starknet Mainnet.

## What GhostLine does

- Scores a proposed transaction's behavioural privacy posture.
- Explains the signals behind that score and suggests practical privacy improvements.
- Connects to a STRK20-capable Starknet wallet without taking custody or requesting private keys or viewing keys.
- Shields supported ERC-20 tokens into the STRK20 privacy pool.
- Shows public and shielded token balances after wallet consent.
- Sends private transfers to registered pool recipients.
- Unshields assets back to the connected public wallet.
- Includes a Vesu private-yield route and a Cairo helper integration for the next stage of private DeFi.

## Why GhostLine

Using a privacy pool is not the same as having good privacy hygiene. Observable behaviour can still make activity easier to correlate:

- Immediate movement after a public action
- Repeated use of the same addresses
- Predictable transaction timing
- Recurring transaction patterns
- Distinctive transfer sizes

GhostLine is the user-facing layer between those choices and the private transaction. It does not promise anonymity; it makes privacy trade-offs visible before the user signs.

```text
Transaction intent
       |
       v
GhostLine privacy analysis
       |
       +--> risk signals and recommendations
       |
       v
STRK20-capable wallet
       |
       v
Starknet Mainnet
```

## Product flow

1. Connect a privacy-enabled Starknet wallet.
2. Set the transaction context in the privacy dashboard.
3. Review the risk score, findings, and recommendations.
4. Select a token and enter a human-readable amount.
5. Shield, transfer privately, or unshield with the wallet.
6. Refresh public and shielded balances when needed.

The wallet owns signing, note discovery, proving, and private state. GhostLine only sends the requested STRK20 action through the Wallet API.

## STRK20 actions

### Shield

Moves a public ERC-20 balance into the privacy pool. Enter the ordinary token amount—for example, `10` for 10 STRK—and GhostLine converts it to the token's smallest unit before requesting the wallet action.

Depending on the token and wallet, shielding can involve an ERC-20 approval followed by the STRK20 deposit. GhostLine locks its action controls while a request is in progress.

### Private transfer

Moves value inside the STRK20 pool. The recipient must already be registered with the privacy pool.

### Unshield

Withdraws the entered shielded amount to the currently connected public wallet. Withdrawals are public by design because they return funds to a public ERC-20 address.

### Balances

GhostLine reads the public token balance using its configured Mainnet RPC and asks the connected wallet for the shielded balance. The application never receives a viewing key.

## Privacy score

The dashboard evaluates the context selected by the user and presents a score from 0–100:

| Score | Meaning |
| --- | --- |
| 0–34 | Low risk |
| 35–54 | Moderate risk |
| 55–74 | High risk |
| 75–100 | Critical |

Current scoring signals include asset path, timing, address reuse, recent activity level, recurring patterns, and amount bands. The score is decision support, not a guarantee of anonymity or an on-chain surveillance service.

## Architecture

```text
Next.js interface
  ├─ Privacy-score engine
  ├─ Starknet Wallet API integration
  │   ├─ Shield
  │   ├─ Private transfer
  │   ├─ Unshield
  │   └─ Shielded balance consent request
  ├─ Mainnet RPC balance reader
  └─ Cairo yield-helper artifacts

User wallet
  ├─ Signing key
  ├─ Viewing key
  ├─ Note discovery
  └─ Proof generation
```

## Private yield direction

GhostLine is extending privacy beyond transfers with a Vesu yield route. The design uses a Cairo `privacy_invoke` helper to deposit an underlying asset into a Vesu vault or redeem vToken shares, then return the measured result to a private open note.

The repository includes the Cairo helper source and compiled artifacts. The app also records its deployed GhostLine helper and mainnet STRK20 transactions in [`strk20.json`](./strk20.json).

## Stack

- Next.js 14 and React 18
- TypeScript
- `starknet` 10.4
- Starknet Wallet API (`WalletAccountV6`)
- STRK20 privacy pool
- Starknet Mainnet (`SN_MAIN`)
- Alchemy Starknet RPC
- Cairo 2 helper contract

## Run locally

Requirements: Node.js 20+ and a privacy-enabled Starknet wallet extension.

```bash
git clone https://github.com/Leequidice/GhostLine.git
cd GhostLine
npm install
cp .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

```bash
NEXT_PUBLIC_PROVIDER_URL=https://starknet-mainnet.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>
NEXT_PUBLIC_CHAIN_ID=SN_MAIN
```

Keep RPC credentials out of Git. The Vercel project should use the same values as environment variables.

## Project artifacts

- [`strk20.json`](./strk20.json) — mainnet transaction hashes, GhostLine contract address, and demo metadata.
- [`cairo/`](./cairo) — GhostLine yield-helper source and Scarb project.
- [`public/cairo/`](./public/cairo) — compiled contract artifacts consumed by the operator deployment flow.

## Security

GhostLine is non-custodial. Never share a wallet seed phrase, private key, or viewing key with the application or its operators. Always verify token addresses, recipient addresses, and wallet confirmations before signing.

## License

License information will be added as the project is finalized.
