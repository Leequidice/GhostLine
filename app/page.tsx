"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { connect, disconnect, type StarknetWindowObject } from "get-starknet";
import { analyzeTransaction, type TxInput } from "../lib/privacy";

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
  const [wallet, setWallet] = useState<StarknetWindowObject | null>(null);
  const [walletStatus, setWalletStatus] = useState<string>("Wallet not connected");
  const [walletAddress, setWalletAddress] = useState<string>("Not connected");
  const analysis = useMemo(() => analyzeTransaction(tx), [tx]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWalletEvent = async () => {
      const current = (window as any).starknetLastSelectedWallet ?? null;
      setWallet(current);
      if (current) {
        try {
          const accounts = await current.request({ type: "wallet_requestAccounts" });
          setWalletAddress(accounts[0] ?? "Connected");
          setWalletStatus(`${current.name ?? "Wallet"} connected`);
        } catch {
          setWalletAddress("Connected");
          setWalletStatus(`${current.name ?? "Wallet"} connected`);
        }
      } else {
        setWalletAddress("Not connected");
        setWalletStatus("Wallet not connected");
      }
    };

    handleWalletEvent();
    window.addEventListener("starknet-wallet-disconnected", handleWalletEvent);
    window.addEventListener("starknet-wallet-connected", handleWalletEvent);

    return () => {
      window.removeEventListener("starknet-wallet-disconnected", handleWalletEvent);
      window.removeEventListener("starknet-wallet-connected", handleWalletEvent);
    };
  }, []);

  const handleChange = <K extends keyof TxInput>(key: K, value: TxInput[K]) => {
    setTx((prev) => ({ ...prev, [key]: value }));
  };

  const handleConnect = async () => {
    try {
      const selected = await connect({ modalMode: "alwaysAsk", modalTheme: "dark" });

      if (!selected) {
        setWalletStatus("Wallet connection cancelled");
        return;
      }

      const accounts = await selected.request({ type: "wallet_requestAccounts" });
      setWallet(selected);
      setWalletAddress(accounts[0] ?? "Connected");
      setWalletStatus(`${selected.name ?? "Wallet"} connected`);
    } catch {
      setWalletStatus("Wallet connection failed");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } finally {
      setWallet(null);
      setWalletAddress("Not connected");
      setWalletStatus("Wallet disconnected");
    }
  };

  const network = process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_MAIN";

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
              <input id="tokenAddress" value={tx.amount /* placeholder, replaced below by state */} readOnly />
            </div>
            <div className="field">
              <label htmlFor="recipient">Recipient (note id or address)</label>
              <input id="recipient" value={""} onChange={() => {}} placeholder="0x... or note id" />
            </div>
            <div className="field">
              <label htmlFor="actionAmount">Amount</label>
              <input id="actionAmount" type="number" defaultValue={tx.amount} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={async () => {
                if (!wallet) return;
                try {
                  const token = "0x0000000000000000000000000000000000000000"; // replace with real token
                  const amount = String(tx.amount);
                  // @ts-ignore - wallet.request typed to accept Rpc messages
                  const res = await wallet.request({ type: "wallet_addInvokeTransaction", params: { contractAddress: process.env.NEXT_PUBLIC_STRK20_POOL, entrypoint: "shield", calldata: [token, amount, "0"] } });
                  // eslint-disable-next-line no-console
                  console.log(res);
                  alert("Shield transaction prepared (check wallet)");
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(e);
                  alert("Failed to prepare shield");
                }
              }}
              className="primary-button"
            >
              Shield
            </button>

            <button
              onClick={async () => {
                if (!wallet) return;
                try {
                  const token = "0x0000000000000000000000000000000000000000";
                  const amount = String(tx.amount);
                  // @ts-ignore
                  const res = await wallet.request({ type: "wallet_addInvokeTransaction", params: { contractAddress: process.env.NEXT_PUBLIC_STRK20_POOL, entrypoint: "privacy_invoke", calldata: [token, amount] } });
                  console.log(res);
                  alert("Private transfer prepared (check wallet)");
                } catch (e) {
                  console.error(e);
                  alert("Failed to prepare private transfer");
                }
              }}
              className="secondary-button"
              style={{ marginLeft: 8 }}
            >
              Private transfer
            </button>
          </div>

          <div style={{ marginTop: 22, borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 16 }}>
            <h4>Deploy privacy_invoke helper (wallet-driven)</h4>
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
          </div>
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
