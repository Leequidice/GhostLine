"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { WalletAccountV6 } from "starknet";
import { analyzeTransaction, type TxInput } from "../lib/privacy";
import { connectOperatorWallet, connectPrivacyWallet, declareAndDeployYieldHelper, getPublicTokenBalance, privateTransfer, shield, unshield, VESU_YIELD_HELPER_MAINNET } from "../lib/strk20";

const initialState: TxInput = {
  amount: "5000",
  timing: "immediate",
  addressReuse: "multiple",
  history: "moderate",
  pattern: "repeat",
  shielded: true,
};

// Vesu's official `pools_sn_mainnet.json`: Genesis Pool STRK market.
const VESU_GENESIS_STRK = {
  underlying: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  vault: "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2",
  decimals: "18",
};

export default function Home() {
  const [tx, setTx] = useState<TxInput>(initialState);
  const [wallet, setWallet] = useState<WalletAccountV6 | null>(null);
  const [operatorWallet, setOperatorWallet] = useState<WalletAccountV6 | null>(null);
  const [operatorStatus, setOperatorStatus] = useState("No operator wallet connected");
  const [publicBalance, setPublicBalance] = useState<string>("—");
  const [shieldedBalance, setShieldedBalance] = useState<string>("—");
  const [walletStatus, setWalletStatus] = useState<string>("Wallet not connected");
  const [walletAddress, setWalletAddress] = useState<string>("Not connected");
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [actionAmount, setActionAmount] = useState("10");
  const [tokenDecimals, setTokenDecimals] = useState("18");
  const [yieldVault, setYieldVault] = useState("");
  const [yieldOperation, setYieldOperation] = useState<"deposit" | "withdraw">("deposit");
  const [yieldHelperOverride, setYieldHelperOverride] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [activeAction, setActiveAction] = useState<"shield" | "unshield" | "transfer" | null>(null);
  const analysis = useMemo(() => analyzeTransaction(tx), [tx]);

  const handleChange = <K extends keyof TxInput>(key: K, value: TxInput[K]) => {
    setTx((prev) => ({ ...prev, [key]: value }));
  };

  const handleConnect = async () => {
    try {
      const session = await connectPrivacyWallet();
      setWallet(session.account);
      setWalletAddress(session.address);
      setWalletStatus(`${session.walletName} connected and STRK20-ready`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed";
      setWalletStatus(
        /not implemented/i.test(message)
          ? "This wallet does not implement the STRK20 Wallet API yet. Use a privacy-enabled wallet, then reconnect."
          : message,
      );
    }
  };

  const actionError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return /INVALID_REQUEST_PAYLOAD/i.test(message)
      ? "The wallet rejected this request before proof generation (INVALID_REQUEST_PAYLOAD). No pool funds were moved."
      : message;
  };

  const useStrk = () => {
    setTokenAddress("0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d");
    setTokenDecimals("18");
  };

  const handleDisconnect = async () => {
    setWallet(null);
    setWalletAddress("Not connected");
    setWalletStatus("Wallet disconnected");
    setActionStatus("");
    setPublicBalance("—");
    setShieldedBalance("—");
  };

  const network = process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_MAIN";
  const configuredYieldHelper = process.env.NEXT_PUBLIC_GHOSTLINE_YIELD_HELPER ?? VESU_YIELD_HELPER_MAINNET;
  const yieldHelper = yieldHelperOverride || configuredYieldHelper;

  const formatTokenBalance = (raw: bigint, decimals: number) => {
    let divisor = BigInt(1);
    for (let index = 0; index < decimals; index += 1) divisor *= BigInt(10);
    const whole = raw / divisor;
    const fraction = (raw % divisor).toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 6);
    return fraction ? `${whole}.${fraction}` : whole.toString();
  };

  const refreshBalances = async () => {
    if (!wallet) {
      setActionStatus("Connect a privacy wallet before reading balances.");
      return;
    }
    const selectedToken = tokenAddress || VESU_GENESIS_STRK.underlying;
    const decimals = Number(tokenDecimals);
    try {
      setActionStatus("Reading public balance, then requesting Ready consent for the shielded balance…");
      const publicRaw = await getPublicTokenBalance(wallet, selectedToken);
      setPublicBalance(formatTokenBalance(publicRaw, decimals));
      const privateBalances = await wallet.strk20Balances([selectedToken]);
      const privateEntry = privateBalances.find((entry) => BigInt(entry.token) === BigInt(selectedToken));
      setShieldedBalance(formatTokenBalance(BigInt(privateEntry?.balance ?? "0x0"), decimals));
      setActionStatus("Balances refreshed. Shielded balance is supplied by Ready; GhostLine never receives a viewing key.");
    } catch (error) {
      setActionStatus(`Balance refresh failed: ${actionError(error)}`);
    }
  };

  const ringStyle: CSSProperties = {
    ["--value" as any]: `${analysis.score * 3.6}deg`,
  };

  return (
    <main className="page">
      <header className="hero">
        <div className="kicker">GhostLine</div>
        <h1>Privacy firewall for Starknet transactions</h1>
        <p className="subtitle">
          Assess whether your transaction is private in practice, not just private in theory.
          GhostLine checks timing, address reuse, activity history, and transaction rhythm before you sign.
        </p>
      </header>

      <section className="wallet-panel panel">
        <div>
          <div className="wallet-label">Wallet status</div>
          <div className="wallet-status">{walletStatus}</div>
        </div>

        <div className="wallet-metadata">
          <div>
            <span className="meta-label">Network</span>
            <strong>{network}</strong>
          </div>
          <div>
            <span className="meta-label">Address</span>
            <strong>{walletAddress}</strong>
          </div>
          <div>
            <span className="meta-label">Public balance</span>
            <strong>{publicBalance}</strong>
          </div>
          <div>
            <span className="meta-label">Shielded balance</span>
            <strong>{shieldedBalance}</strong>
          </div>
        </div>

        <div className="wallet-actions">
          <button onClick={handleConnect} className="primary-button">
            {wallet ? "Reconnect wallet" : "Connect wallet"}
          </button>
          {wallet ? (
            <button onClick={handleDisconnect} className="secondary-button">
              Disconnect
            </button>
          ) : null}
          {wallet ? (
            <button onClick={refreshBalances} className="secondary-button">
              Refresh balances
            </button>
          ) : null}
        </div>
      </section>

      <section className="score-card">
        <div className="panel risk-panel">
          <div className="risk-visual" style={ringStyle}>
            <div className="score">
              <strong>{analysis.score}</strong>
              <span>{analysis.label}</span>
            </div>
          </div>
        </div>

        <div className="panel form-panel">
          <div className="grid">
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                value={tx.amount}
                onChange={(event) => handleChange("amount", event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="timing">Timing</label>
              <select
                id="timing"
                value={tx.timing}
                onChange={(event) => handleChange("timing", event.target.value as TxInput["timing"])}
              >
                <option value="immediate">Immediate</option>
                <option value="fewMinutes">Few minutes</option>
                <option value="fewHours">Few hours</option>
                <option value="later">Delayed</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="addressReuse">Address reuse</label>
              <select
                id="addressReuse"
                value={tx.addressReuse}
                onChange={(event) => handleChange("addressReuse", event.target.value as TxInput["addressReuse"])}
              >
                <option value="none">None</option>
                <option value="single">Single</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="history">History</label>
              <select
                id="history"
                value={tx.history}
                onChange={(event) => handleChange("history", event.target.value as TxInput["history"])}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="pattern">Pattern</label>
              <select
                id="pattern"
                value={tx.pattern}
                onChange={(event) => handleChange("pattern", event.target.value as TxInput["pattern"])}
              >
                <option value="unique">Unique</option>
                <option value="occasional">Occasional</option>
                <option value="repeat">Repeat</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="shielded">Asset flow</label>
              <select
                id="shielded"
                value={String(tx.shielded)}
                onChange={(event) => handleChange("shielded", event.target.value === "true")}
              >
                <option value="true">Shielded path</option>
                <option value="false">Public path</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="actions-panel">
        <div className="panel">
          <h3>STRK20 Actions</h3>
          <div className="grid">
            <div className="field">
              <label htmlFor="tokenAddress">Token address</label>
              <input id="tokenAddress" value={tokenAddress} onChange={(event) => setTokenAddress(event.target.value)} placeholder="Supported 0x token contract address" spellCheck={false} />
              <button type="button" onClick={useStrk} className="secondary-button" style={{ marginTop: 8 }}>Use STRK</button>
            </div>
            <div className="field">
              <label htmlFor="recipient">Recipient (note id or address)</label>
              <input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Registered recipient address" />
            </div>
            <div className="field">
              <label htmlFor="actionAmount">Amount to shield</label>
              <input id="actionAmount" inputMode="decimal" value={actionAmount} onChange={(event) => setActionAmount(event.target.value)} placeholder="10" />
            </div>
            <div className="field">
              <label htmlFor="tokenDecimals">Token decimals</label>
              <input id="tokenDecimals" inputMode="numeric" pattern="[0-9]*" value={tokenDecimals} onChange={(event) => setTokenDecimals(event.target.value)} placeholder="18 for STRK" />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              disabled={activeAction !== null}
              onClick={async () => {
                if (!wallet || !tokenAddress || !actionAmount) { setActionStatus("Connect a STRK20-capable wallet and enter a token address and amount first."); return; }
                try {
                  setActiveAction("shield");
                  setActionStatus("Shield request sent once. Ready may request an ERC-20 approval and then one STRK20 shield confirmation. Do not approve another Shield prompt after a successful shield transaction.");
                  const res = await shield(wallet, tokenAddress, actionAmount, Number(tokenDecimals));
                  setActionStatus(`Shield transaction submitted: ${res.transaction_hash}`);
                } catch (e) {
                  console.error(e);
                  setActionStatus(`Shield request failed: ${actionError(e)}`);
                } finally {
                  setActiveAction(null);
                }
              }}
              className="primary-button"
            >
              {activeAction === "shield" ? "Shield request pending…" : "Shield with wallet"}
            </button>

            <button
              disabled={activeAction !== null}
              onClick={async () => {
                if (!wallet || !tokenAddress || !actionAmount) { setActionStatus("Connect a STRK20-capable wallet and enter a token address and amount first."); return; }
                try {
                  setActiveAction("unshield");
                  setActionStatus("Requesting an unshield to your currently connected public address. This withdrawal is public.");
                  const res = await unshield(wallet, tokenAddress, actionAmount, Number(tokenDecimals));
                  setActionStatus(`Unshield transaction submitted: ${res.transaction_hash}`);
                } catch (e) {
                  console.error(e);
                  setActionStatus(`Unshield request failed: ${actionError(e)}`);
                } finally {
                  setActiveAction(null);
                }
              }}
              className="secondary-button"
              style={{ marginLeft: 8 }}
            >
              {activeAction === "unshield" ? "Unshield request pending…" : "Unshield to my wallet"}
            </button>

            <button
              disabled={activeAction !== null}
              onClick={async () => {
                if (!wallet || !tokenAddress || !recipient || !actionAmount) { setActionStatus("Connect a STRK20-capable wallet and enter a token, registered recipient, and amount first."); return; }
                try {
                  setActiveAction("transfer");
                  setActionStatus("Requesting private transfer from your wallet.");
                  const res = await privateTransfer(wallet, tokenAddress, actionAmount, recipient, Number(tokenDecimals));
                  setActionStatus(`Private transfer submitted: ${res.transaction_hash}`);
                } catch (e) {
                  console.error(e);
                  setActionStatus(`Private transfer request failed: ${actionError(e)}`);
                } finally {
                  setActiveAction(null);
                }
              }}
              className="secondary-button"
              style={{ marginLeft: 8 }}
            >
              Private transfer
            </button>
          </div>

          <p style={{ color: 'var(--muted)', marginTop: 14 }}>
            {actionStatus || "Shielding may require an ERC-20 approval followed by a STRK20 deposit. GhostLine sends one shield request and locks this control until Ready responds. Unshielding sends shielded funds back to the connected public wallet and is public. Private transfers require a recipient already registered with the privacy pool."}
          </p>

          <div hidden aria-hidden="true" style={{ marginTop: 22, borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 16 }}>
            <h4>Disabled legacy helper deployment controls</h4>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
              Upload the compiled Sierra JSON and optional CASM/artifact produced by your Cairo toolchain, then declare the class using your connected wallet. After declare, note the returned class hash and deploy via your preferred method.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input id="sierraFile" type="file" accept="application/json" />
              <input id="casmFile" type="file" accept="application/json" />
              <button
                onClick={async () => {
                  if (!wallet) { alert('Connect a wallet first'); return; }
                  // read files
                  const sierraInput = document.getElementById('sierraFile') as HTMLInputElement;
                  if (!sierraInput || !sierraInput.files || sierraInput.files.length === 0) { alert('Select a Sierra file'); return; }
                  const sierraFile = sierraInput.files[0];
                  const sierraText = await sierraFile.text();
                  let sierraJson: any;
                  try { sierraJson = JSON.parse(sierraText); } catch { alert('Sierra file is not valid JSON'); return; }

                  const casmInput = document.getElementById('casmFile') as HTMLInputElement;
                  let casmJson: any | undefined;
                  if (casmInput && casmInput.files && casmInput.files.length > 0) {
                    const casmText = await casmInput.files[0].text();
                    try { casmJson = JSON.parse(casmText); } catch { alert('CASM file is not valid JSON'); return; }
                  }

                  try {
                    const params: any = { contract_class: sierraJson };
                    if (casmJson) params.casm = casmJson;
                    // @ts-ignore
                    const res = await wallet.request({ type: 'wallet_addDeclareTransaction', params });
                    console.log('declare response', res);
                    alert('Declare transaction submitted; check your wallet for signing. Response: ' + JSON.stringify(res));
                  } catch (e) {
                    console.error(e);
                    alert('Declare failed: ' + String(e));
                  }
                }}
                className="primary-button"
              >
                Declare
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>Deploy instance (wallet-driven)</h4>
              <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                After declaring a class, deploy an instance from your wallet. Enter the class hash and optional constructor arguments (space-separated felt/hex values) and click Deploy. If your wallet does not support direct deploy RPC, a CLI command will be shown instead.
              </p>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input id="classHash" placeholder="0xCLASS_HASH" style={{ minWidth: 360 }} />
                <input id="salt" placeholder="salt (optional)" style={{ width: 160 }} />
                <input id="ctorArgs" placeholder="constructor args (space-separated)" style={{ flex: 1 }} />
                <button
                    onClick={async () => {
                      if (!wallet) { alert('Connect wallet first'); return; }
                      const classHashEl = document.getElementById('classHash') as HTMLInputElement;
                      const saltEl = document.getElementById('salt') as HTMLInputElement;
                      const ctorEl = document.getElementById('ctorArgs') as HTMLInputElement;
                      const classHash = (classHashEl?.value || '').trim();
                      if (!classHash) { alert('Enter class hash'); return; }
                      const salt = (saltEl?.value || '').trim() || '0';
                      const ctorArgs = (ctorEl?.value || '').trim() ? ctorEl.value.split(/\s+/) : [];

                      // Build CLI fallback
                      const cliCmd = `starknet deploy --class-hash ${classHash} --salt ${salt} ${ctorArgs.length ? '--constructor-args ' + ctorArgs.join(' '): ''}`;

                      try {
                        // Try wallet RPC deploy — wallets differ; attempt a deploy-style invoke and catch failures.
                        // @ts-ignore
                        const params: any = {
                          calls: [
                            {
                              contract_address: '0x0',
                              entry_point: 'deploy',
                              calldata: [classHash, salt, ...ctorArgs],
                            },
                          ],
                        };
                        // @ts-ignore
                        const res = await wallet.request({ type: 'wallet_addInvokeTransaction', params });
                        console.log('deploy response', res);
                        alert('Deploy transaction submitted. Wallet response: ' + JSON.stringify(res));
                      } catch (err) {
                        console.error('wallet deploy failed', err);
                        // Show the CLI fallback
                        const picked = confirm('Wallet deploy failed or is unsupported. Show CLI deploy command instead?');
                        if (picked) {
                          // copy to clipboard if available
                          try { await navigator.clipboard.writeText(cliCmd); alert('CLI command copied to clipboard:\n' + cliCmd); }
                          catch { alert('CLI command:\n' + cliCmd); }
                        }
                      }
                    }}
                    className="primary-button"
                >
                    Deploy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="actions-panel">
        <div className="panel">
          <h3>GhostLine Private Yield Vault <span style={{ color: "#f6c35b" }}>— Experimental</span></h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Planned private Vesu deposits and withdrawals. The route is wired to the official helper, but the current Ready wallet rejects external private-DeFi invokes before proof generation.
          </p>
          <div className="grid">
            <div className="field">
              <label htmlFor="yieldVault">Approved Vesu vault (vToken)</label>
              <input id="yieldVault" value={yieldVault} onChange={(event) => setYieldVault(event.target.value)} placeholder="Vesu vToken address" spellCheck={false} />
            </div>
            <div className="field">
              <label htmlFor="yieldOperation">Operation</label>
              <select id="yieldOperation" value={yieldOperation} onChange={(event) => setYieldOperation(event.target.value as "deposit" | "withdraw")}>
                <option value="deposit">Deposit underlying → private vToken</option>
                <option value="withdraw">Withdraw vToken → private underlying</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="yieldHelper">GhostLine demo helper</label>
              <input id="yieldHelper" value={yieldHelper} onChange={(event) => setYieldHelperOverride(event.target.value)} placeholder="Configured after one-time operator deployment" spellCheck={false} />
            </div>
          </div>
          <button
            className="secondary-button"
            style={{ marginTop: 12 }}
            onClick={() => {
              setTokenAddress(VESU_GENESIS_STRK.underlying);
              setTokenDecimals(VESU_GENESIS_STRK.decimals);
              setYieldVault(VESU_GENESIS_STRK.vault);
              setActionStatus("Vesu Genesis STRK market selected for the experimental route preview.");
            }}
          >
            Use verified Vesu Genesis STRK vault
          </button>
          <button
            className="secondary-button"
            style={{ marginLeft: 8 }}
            onClick={() => {
              setYieldHelperOverride(VESU_YIELD_HELPER_MAINNET);
              setActionStatus("Using the official mainnet Vesu helper for this browser session.");
            }}
          >
            Use official Vesu helper
          </button>
          <p style={{ color: "var(--muted)", marginTop: 14 }}>
            No Vesu action is submitted from GhostLine while Ready v5.33.9 returns INVALID_REQUEST_PAYLOAD for this action class. Your shielded balance remains in your wallet. This route will be re-enabled only after it succeeds with a privacy wallet on mainnet.
          </p>
        </div>
      </section>

      {!yieldHelper && <section className="actions-panel">
        <div className="panel">
          <h3>One-time shared helper setup</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            An operator declares GhostLine's Cairo 2.18 helper and deploys one shared instance. Your wallet will show two separate confirmations. This does not move pool funds, and no user or judge repeats it.
          </p>
          <p style={{ color: "var(--muted)" }}>{operatorStatus}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              className="secondary-button"
              onClick={async () => {
                try {
                  setOperatorStatus("Connecting operator wallet…");
                  const session = await connectOperatorWallet();
                  setOperatorWallet(session.account);
                  setOperatorStatus(`${session.walletName} operator connected: ${session.address}`);
                } catch (error) {
                  setOperatorStatus(`Operator connection failed: ${actionError(error)}`);
                }
              }}
            >
              Connect operator wallet
            </button>
            <button
              className="primary-button"
              disabled={!operatorWallet}
              onClick={async () => {
                if (!operatorWallet) return;
                try {
                  setActionStatus("Approve the class declaration, then the shared helper deployment, in your operator wallet.");
                  const deployed = await declareAndDeployYieldHelper(operatorWallet);
                  setYieldHelperOverride(deployed.address);
                  setOperatorStatus(`Helper live at ${deployed.address}. Send me this public address so I can make it the permanent GhostLine configuration.`);
                  setActionStatus(`Shared helper deployed: ${deployed.transactionHash}`);
                } catch (error) {
                  console.error(error);
                  setActionStatus(`Operator setup failed: ${actionError(error)}`);
                }
              }}
            >
              Declare and deploy shared helper
            </button>
          </div>
        </div>
      </section>}

      <section className="signal-list">
        {analysis.findings.map((item) => (
          <article key={item.title} className="signal panel">
            <div className="meta">
              <h3>{item.title}</h3>
              <span className="badge">signal</span>
            </div>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="recommendations">
        {analysis.recommendations.map((item) => (
          <div key={item} className="recommendation">
            <strong>Recommendation:</strong> {item}
          </div>
        ))}
      </section>
    </main>
  );
}
