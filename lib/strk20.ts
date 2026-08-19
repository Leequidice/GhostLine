import { compareVersions, RpcProvider, WalletAccountV6, walletV6, type STRK20_ACTION } from "starknet";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard-v6/features";

const MINIMUM_WALLET_API_VERSION = "0.10.3";

export type PrivacyWalletSession = {
  account: WalletAccountV6;
  walletName: string;
  address: string;
};

function providerUrl() {
  const url = process.env.NEXT_PUBLIC_PROVIDER_URL;
  if (!url || url.includes("<YOUR_ALCHEMY_KEY>")) {
    throw new Error("Set NEXT_PUBLIC_PROVIDER_URL to a Starknet mainnet RPC URL before connecting a privacy wallet.");
  }
  return url;
}

async function discoverWallet(): Promise<WalletWithStarknetFeatures> {
  const { createStore } = await import("@starknet-io/get-starknet-discovery");
  const store = createStore();
  store._refreshInjectedWallets();

  const wallet = await new Promise<WalletWithStarknetFeatures | undefined>((resolve) => {
    const current = store.getWallets()[0];
    if (current) {
      resolve(current as WalletWithStarknetFeatures);
      return;
    }
    const unsubscribe = store.subscribe((wallets) => {
      const found = wallets[0];
      if (found) {
        unsubscribe();
        resolve(found as WalletWithStarknetFeatures);
      }
    });
    window.setTimeout(() => {
      unsubscribe();
      resolve(store.getWallets()[0] as WalletWithStarknetFeatures | undefined);
    }, 800);
  });

  if (!wallet) throw new Error("No Starknet wallet was found. Install or enable a privacy-enabled wallet extension, then retry.");
  return wallet;
}

export async function connectPrivacyWallet(): Promise<PrivacyWalletSession> {
  const wallet = await discoverWallet();
  const versions = await walletV6.supportedWalletApi(wallet);
  const supported = versions.some((version) => compareVersions(String(version), MINIMUM_WALLET_API_VERSION) >= 0);
  if (!supported) throw new Error(`This wallet does not support the STRK20 Wallet API ${MINIMUM_WALLET_API_VERSION} or newer.`);

  const account = await WalletAccountV6.connect(new RpcProvider({ nodeUrl: providerUrl() }), wallet);
  if (!account.address) throw new Error("The wallet did not provide an account address.");
  return { account, walletName: wallet.name, address: account.address };
}

export async function shield(account: WalletAccountV6, token: string, amount: string) {
  const actions: STRK20_ACTION[] = [{ type: "deposit", token, amount }];
  return account.strk20InvokeTransaction(actions);
}

export async function privateTransfer(account: WalletAccountV6, token: string, amount: string, recipient: string) {
  const actions: STRK20_ACTION[] = [{ type: "transfer", token, amount, recipient }];
  return account.strk20InvokeTransaction(actions);
}
