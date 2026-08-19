"use client";

import { useMemo, useState, type CSSProperties } from "react";
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
  const analysis = useMemo(() => analyzeTransaction(tx), [tx]);

  const handleChange = <K extends keyof TxInput>(key: K, value: TxInput[K]) => {
    setTx((prev) => ({ ...prev, [key]: value }));
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
