Deploying the privacy_invoke helper (guide)

This file explains how to compile and deploy the Cairo helper stub in this
repository. Two deployment methods are described:

- Local CLI (recommended for developers): use the Cairo/starknet toolchain to
  compile and declare/deploy the contract. Requires Cairo + Starknet CLI.

- Wallet-driven deploy (safer for not sharing keys): construct declare/deploy
  payloads and have the connected wallet sign & submit them via the Wallet API.

1) Compile (Cairo 1.x / Starknet tooling)

# Install Cairo & Starknet dev tools (follow official docs)
# Example (local machine):
# cairo-compile cairo/src/lib.cairo --output build/lib.sierra
# cairo-compile cairo/src/lib.cairo --output build/lib.casm --check
# (commands depend on your installed Cairo toolchain)

2) Declare + Deploy with Starknet CLI

# Example (placeholder — adapt to your toolchain):
# starknet declare --contract build/lib.sierra --network $NETWORK
# starknet deploy --class-hash <CLASS_HASH> --network $NETWORK --account-address <ADDRESS>

3) Deploying via a connected wallet (browser)

# This repository includes client helpers that use the Wallet API. The wallet
# supports these RPC messages (see node_modules/@starknet-io/types-js):
#  - wallet_addDeclareTransaction
#  - wallet_addInvokeTransaction
#
# Example sketch using get-starknet in the browser to declare & deploy:

```js
import { connect } from 'get-starknet';

async function declareAndDeploy(compiledSierra, compiledCasm) {
  const wallet = await connect({ modalMode: 'alwaysAsk' });
  if (!wallet) throw new Error('wallet not found');

  // Declare the sierra class
  const declareTx = await wallet.request({
    type: 'wallet_addDeclareTransaction',
    params: {
      contract_class: compiledSierra, // replace with compiled JSON/obj
      casm: compiledCasm, // if required by your toolchain
    }
  });

  // After the wallet processes the declare, it returns a class hash. Use it
  // to deploy the contract (this step may be combined depending on wallet).
}
```

Notes & Safety
- The included Cairo code is a placeholder and must be reviewed and replaced
  before any mainnet usage.
- Deploying and running helper contracts on mainnet involves gas and real
  funds. Test thoroughly on a testnet (Sepolia or a devnet) first.
- If you want, I can add a deploy script that:
  - Compiles using a Docker-based Cairo image (so you don't install Cairo),
  - Produces the artifacts required by wallets or the CLI,
  - Optionally uses a private key (env) to do a programmatic deploy (I will
    provide strong warnings and avoid storing keys in the repo).

Next steps (pick one):
- I can add a Docker-based compile script and a wallet-declare example (recommended).
- I can implement a full helper implementation for privacy_invoke (you must
  confirm the expected adapter behavior & response shape).
- I can scaffold a wallet-driven deploy UI (the user signs each step).
