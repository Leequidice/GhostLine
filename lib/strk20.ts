import type { StarknetWindowObject } from "get-starknet";

const POOL = process.env.NEXT_PUBLIC_STRK20_POOL ?? "";

export async function walletShield(wallet: StarknetWindowObject, tokenAddress: string, amount: string) {
  // Prepare calldata for shield: [token_address, amount, recipient_placeholder]
  const calldata = [tokenAddress, amount, "0"];
  const params = {
    calls: [
      {
        contract_address: POOL,
        entry_point: "shield",
        calldata,
      },
    ],
  };

  // Wallet API: wallet_addInvokeTransaction
  return await wallet.request({ type: "wallet_addInvokeTransaction", params });
}

export async function walletUnshield(wallet: StarknetWindowObject, tokenAddress: string, amount: string) {
  const calldata = [tokenAddress, amount, "0"];
  const params = {
    calls: [
      {
        contract_address: POOL,
        entry_point: "unshield",
        calldata,
      },
    ],
  };

  return await wallet.request({ type: "wallet_addInvokeTransaction", params });
}

export async function walletPrivateTransfer(wallet: StarknetWindowObject, recipientNoteId: string, amount: string) {
  // privacy_invoke helper is assumed to be deployed and will be called by the dapp
  const helper = process.env.NEXT_PUBLIC_STRK20_HELPER ?? "";
  const calldata = [recipientNoteId, amount];
  const params = {
    calls: [
      {
        contract_address: helper || POOL,
        entry_point: "privacy_invoke",
        calldata,
      },
    ],
  };

  return await wallet.request({ type: "wallet_addInvokeTransaction", params });
}
