import { compareVersions, RpcProvider, WalletAccountV6, walletV6, type STRK20_ACTION } from "starknet";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard-v6/features";

const MINIMUM_WALLET_API_VERSION = "0.10.3";

export type PrivacyWalletSession = {
  account: WalletAccountV6;
  walletName: string;
  address: string;
};

function validateAddress(value: string, label: string) {
  const address = value.trim();
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(address)) {
    throw new Error(`${label} must be a Starknet contract address beginning with 0x.`);
  }
  if (/^0x0+$/i.test(address)) {
    throw new Error(`${label} must be a valid non-zero Starknet address.`);
  }
  return address;
}

function tokenAmountToFelt(value: string, decimals: number) {
  const baseUnits = tokenAmountToBaseUnits(value, decimals);
  return `0x${baseUnits.toString(16)}`;
}

function tokenAmountToBaseUnits(value: string, decimals: number) {
  const amount = value.trim();
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("Token decimals must be a whole number between 0 and 255.");
  }
  if (!/^\d+(?:\.\d+)?$/.test(amount)) {
    throw new Error("Amount must be a positive decimal number.");
  }

  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error(`This token supports at most ${decimals} decimal places.`);
  }
  const baseUnitText = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+/, "") || "0";
  if (baseUnitText === "0") throw new Error("Amount must be greater than zero.");

  return BigInt(baseUnitText);
}

function providerUrl() {
  const url = process.env.NEXT_PUBLIC_PROVIDER_URL;
  if (!url || url.includes("<YOUR_ALCHEMY_KEY>")) {
    throw new Error("Set NEXT_PUBLIC_PROVIDER_URL to a Starknet mainnet RPC URL before connecting a privacy wallet.");
  }
  return url;
}

async function discoverWallets(): Promise<WalletWithStarknetFeatures[]> {
  const { createStore } = await import("@starknet-io/get-starknet-discovery");
  const store = createStore();
  store._refreshInjectedWallets();

  const wallets = await new Promise<WalletWithStarknetFeatures[]>((resolve) => {
    const current = store.getWallets();
    if (current.length > 0) {
      resolve(current as WalletWithStarknetFeatures[]);
      return;
    }
    const unsubscribe = store.subscribe((nextWallets) => {
      if (nextWallets.length > 0) {
        unsubscribe();
        resolve(nextWallets as WalletWithStarknetFeatures[]);
      }
    });
    window.setTimeout(() => {
      unsubscribe();
      resolve(store.getWallets() as WalletWithStarknetFeatures[]);
    }, 800);
  });

  if (wallets.length === 0) throw new Error("No Starknet wallet was found. Install or enable a privacy-enabled wallet extension, then retry.");
  return wallets;
}

export async function connectPrivacyWallet(): Promise<PrivacyWalletSession> {
  const wallets = await discoverWallets();
  const provider = new RpcProvider({ nodeUrl: providerUrl() });
  let compatibleWalletFound = false;
  let lastConnectionError: unknown;

  for (const wallet of wallets) {
    try {
      const versions = await walletV6.supportedWalletApi(wallet);
      const supported = versions.some((version) => compareVersions(String(version), MINIMUM_WALLET_API_VERSION) >= 0);
      if (!supported) continue;
      compatibleWalletFound = true;

      const account = await WalletAccountV6.connect(provider, wallet);
      if (!account.address) throw new Error("The wallet did not provide an account address.");
      return { account, walletName: wallet.name, address: account.address };
    } catch (error) {
      lastConnectionError = error;
    }
  }

  if (!compatibleWalletFound) {
    throw new Error(`No detected wallet supports the STRK20 Wallet API ${MINIMUM_WALLET_API_VERSION} or newer.`);
  }

  const message = lastConnectionError instanceof Error ? lastConnectionError.message : "Wallet connection failed";
  if (/selected account|wallet_connectV2/i.test(message)) {
    throw new Error("Your wallet has no usable selected account. Unlock the extension, select a deployed Starknet Mainnet account, then reconnect.");
  }
  throw new Error(message);
}

export async function shield(account: WalletAccountV6, token: string, amount: string, decimals: number) {
  const actions: STRK20_ACTION[] = [{ type: "deposit", token: validateAddress(token, "Token address"), amount: tokenAmountToFelt(amount, decimals) }];
  return account.strk20InvokeTransaction(actions);
}

export async function privateTransfer(account: WalletAccountV6, token: string, amount: string, recipient: string, decimals: number) {
  const actions: STRK20_ACTION[] = [{
    type: "transfer",
    token: validateAddress(token, "Token address"),
    amount: tokenAmountToFelt(amount, decimals),
    recipient: validateAddress(recipient, "Recipient"),
  }];
  return account.strk20InvokeTransaction(actions);
}

export async function privateYieldDeposit(
  account: WalletAccountV6,
  helper: string,
  underlying: string,
  vault: string,
  amount: string,
  decimals: number,
) {
  const helperAddress = validateAddress(helper, "Yield helper address");
  const underlyingAddress = validateAddress(underlying, "Underlying token address");
  const vaultAddress = validateAddress(vault, "Vesu vault address");
  if (underlyingAddress.toLowerCase() === vaultAddress.toLowerCase()) {
    throw new Error("The underlying token and Vesu vault addresses must be different.");
  }
  const baseUnits = tokenAmountToBaseUnits(amount, decimals);
  const maxU128 = BigInt("340282366920938463463374607431768211455");
  if (baseUnits > maxU128) throw new Error("Amount exceeds the STRK20 note limit.");

  const actions: STRK20_ACTION[] = [
    { type: "transfer", token: vaultAddress, amount: "OPEN", recipient: account.address },
    {
      type: "invoke",
      contract: helperAddress,
      calldata: ["0x0", underlyingAddress, vaultAddress, `0x${baseUnits.toString(16)}`, "0x0", "${openNoteIds[0]}"],
    },
  ];
  return account.strk20InvokeTransaction(actions);
}
