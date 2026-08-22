"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { WalletAccountV6 } from "starknet";
import { analyzeTransaction, type TxInput } from "../lib/privacy";
import { connectPrivacyWallet, privateTransfer, privateYieldDeposit, shield } from "../lib/strk20";

const initialState: TxInput = {
  amount: "5000",
  timing: "immediate",
  addressReuse: "multiple",
  history: "moderate",
  pattern: "repeat",
  shielded: true,
};

export default function Home() {
  const [tx, setTx] = useState<TxInput>(initialState);
  const [wallet, setWallet] = useState<WalletAccountV6 | null>(null);
  const [walletStatus, setWalletStatus] = useState<string>("Wallet not connected");
  const [walletAddress, setWalletAddress] = useState<string>("Not connected");
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [actionAmount, setActionAmount] = useState("10");
  const [tokenDecimals, setTokenDecimals] = useState("18");
  const [yieldVault, setYieldVault] = useState("");
  const [actionStatus, setActionStatus] = useState("");
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
      ? "The wallet rejected the request payload. Use a supported Starknet Mainnet token contract address and a positive whole-number amount in its smallest unit."
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
  };

  const network = process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_MAIN";
  const yieldHelper = process.env.NEXT_PUBLIC_GHOSTLINE_YIELD_HELPER ?? "";

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
              onClick={async () => {
                if (!wallet || !tokenAddress || !actionAmount) { setActionStatus("Connect a STRK20-capable wallet and enter a token address and amount first."); return; }
                try {
                  setActionStatus("Requesting private deposit from your wallet. It will request approval and then the STRK20 deposit.");
                  const res = await shield(wallet, tokenAddress, actionAmount, Number(tokenDecimals));
                  setActionStatus(`Shield transaction submitted: ${res.transaction_hash}`);
                } catch (e) {
                  console.error(e);
                  setActionStatus(`Shield request failed: ${actionError(e)}`);
                }
              }}
              className="primary-button"
            >
              Shield with wallet
            </button>

            <button
              onClick={async () => {
                if (!wallet || !tokenAddress || !recipient || !actionAmount) { setActionStatus("Connect a STRK20-capable wallet and enter a token, registered recipient, and amount first."); return; }
                try {
                  setActionStatus("Requesting private transfer from your wallet.");
                  const res = await privateTransfer(wallet, tokenAddress, actionAmount, recipient, Number(tokenDecimals));
                  setActionStatus(`Private transfer submitted: ${res.transaction_hash}`);
                } catch (e) {
                  console.error(e);
                  setActionStatus(`Private transfer request failed: ${actionError(e)}`);
                }
              }}
              className="secondary-button"
              style={{ marginLeft: 8 }}
            >
              Private transfer
            </button>
          </div>

          <p style={{ color: 'var(--muted)', marginTop: 14 }}>
            {actionStatus || "Shielding is public and requires an ERC-20 approval before the private deposit. Enter the human amount you want to shield; GhostLine converts it using the token decimals and sends Ready the required felt format. Private transfers require a recipient already registered with the privacy pool."}
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
          <h3>GhostLine Private Yield Vault</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Convert a shielded position into private Vesu vault shares. The helper measures the real minted-share delta and returns it to your private open note.
          </p>
          <div className="grid">
            <div className="field">
              <label htmlFor="yieldVault">Approved Vesu vault (vToken)</label>
              <input id="yieldVault" value={yieldVault} onChange={(event) => setYieldVault(event.target.value)} placeholder="Vesu vToken address" spellCheck={false} />
            </div>
            <div className="field">
              <label>GhostLine helper</label>
              <input value={yieldHelper || "Deploy helper to enable"} readOnly />
            </div>
          </div>
          <button
            className="primary-button"
            style={{ marginTop: 12 }}
            disabled={!yieldHelper}
            onClick={async () => {
              if (!wallet || !tokenAddress || !yieldVault || !actionAmount) {
                setActionStatus("Connect a privacy wallet and enter the underlying token, Vesu vault, and amount first.");
                return;
              }
              try {
                setActionStatus("Preparing private yield deposit. Ready will prove the action and return Vesu shares to an open note.");
                const res = await privateYieldDeposit(wallet, yieldHelper, tokenAddress, yieldVault, actionAmount, Number(tokenDecimals));
                setActionStatus(`Private yield deposit submitted: ${res.transaction_hash}`);
              } catch (error) {
                console.error(error);
                setActionStatus(`Private yield deposit failed: ${actionError(error)}`);
              }
            }}
          >
            Deposit privately into Vesu
          </button>
          <p style={{ color: "var(--muted)", marginTop: 14 }}>
            {yieldHelper
              ? "Use only a reviewed Vesu vToken. This is experimental mainnet software."
              : "Disabled until GhostLine’s reviewed helper is deployed and configured."}
          </p>
        </div>
      </section>

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
