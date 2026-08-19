import type { StarknetWindowObject } from "get-starknet";

const POOL = process.env.NEXT_PUBLIC_STRK20_POOL ?? "";
const PROVIDER = process.env.NEXT_PUBLIC_PROVIDER_URL ?? "";

async function sendWalletInvoke(wallet: StarknetWindowObject, calls: any[]) {
  const params = { calls };
  // @ts-ignore - wallet.request is generic RPC
  return await wallet.request({ type: "wallet_addInvokeTransaction", params });
}

export async function approveToken(wallet: StarknetWindowObject, tokenAddress: string, spender: string, amount: string) {
  // ERC20 approve(token, spender, amount) - many Starknet ERC20s accept [spender, amount]
  const calls = [
    {
      contract_address: tokenAddress,
      entry_point: "approve",
      calldata: [spender, amount],
    },
  ];
  return await sendWalletInvoke(wallet, calls);
}

export async function walletShield(wallet: StarknetWindowObject, tokenAddress: string, amount: string) {
  // Shield requires token approved to pool, then call pool.shield
  const calls = [
    {
      contract_address: POOL,
      entry_point: "shield",
      calldata: [tokenAddress, amount, "0"],
    },
  ];
  return await sendWalletInvoke(wallet, calls);
}

export async function walletUnshield(wallet: StarknetWindowObject, tokenAddress: string, amount: string) {
  const calls = [
    {
      contract_address: POOL,
      entry_point: "unshield",
      calldata: [tokenAddress, amount, "0"],
    },
  ];
  return await sendWalletInvoke(wallet, calls);
}

export async function walletPrivateTransfer(wallet: StarknetWindowObject, recipientNoteId: string, amount: string) {
  const helper = process.env.NEXT_PUBLIC_STRK20_HELPER ?? "";
  const calls = [
    {
      contract_address: helper || POOL,
      entry_point: "privacy_invoke",
      calldata: [recipientNoteId, amount],
    },
  ];
  return await sendWalletInvoke(wallet, calls);
}

export async function pollReceipt(txHash: string, attempts = 20, delayMs = 4000) {
  if (!PROVIDER) throw new Error("No provider URL set in NEXT_PUBLIC_PROVIDER_URL");
  const body = (method: string, params: any[]) => JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(PROVIDER, { method: "POST", headers: { "Content-Type": "application/json" }, body: body("starknet_getTransactionReceipt", [txHash]) });
      const json = await res.json();
      if (json && json.result) return json.result;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Receipt not available after polling");
}
