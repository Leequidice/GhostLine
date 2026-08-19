export type TxInput = {
  amount: string;
  timing: "immediate" | "fewMinutes" | "fewHours" | "later";
  addressReuse: "none" | "single" | "multiple";
  history: "low" | "moderate" | "heavy";
  pattern: "unique" | "occasional" | "repeat";
  shielded: boolean;
};

export type Finding = {
  title: string;
  description: string;
};

export type Analysis = {
  score: number;
  label: string;
  findings: Finding[];
  recommendations: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function analyzeTransaction(input: TxInput): Analysis {
  const amount = Number(input.amount) || 0;
  let score = 22;
  const findings: Finding[] = [];

  if (!input.shielded) {
    score += 18;
    findings.push({
      title: "Public route",
      description: "The transaction is moving through a public path, leaving more observable metadata on-chain.",
    });
  } else {
    findings.push({
      title: "Shielded asset path",
      description: "The transfer is using a privacy-preserving flow, which reduces direct traceability.",
    });
  }

  if (input.timing === "immediate") {
    score += 18;
    findings.push({
      title: "Timing correlation",
      description: "The transaction occurs immediately after a related action, making behavior easier to link.",
    });
  } else if (input.timing === "fewMinutes") {
    score += 12;
    findings.push({
      title: "Short timing window",
      description: "The transaction happens within a narrow time band that may signal relationship building.",
    });
  } else if (input.timing === "fewHours") {
    score += 8;
    findings.push({
      title: "Delayed execution",
      description: "This still shows some relationship to prior activity but less aggressively than immediate execution.",
    });
  } else {
    findings.push({
      title: "Waited before executing",
      description: "A wider delay reduces obvious timing correlations and improves unlinkability.",
    });
    score -= 8;
  }

  if (input.addressReuse === "multiple") {
    score += 18;
    findings.push({
      title: "Address reuse",
      description: "Repeated use of the same on-chain addresses creates a stronger correlation trail.",
    });
  } else if (input.addressReuse === "single") {
    score += 6;
    findings.push({
      title: "Single address loop",
      description: "A limited reuse pattern still leaves a meaningful fingerprint.",
    });
  } else {
    score -= 10;
    findings.push({
      title: "Address diversification",
      description: "Using fresh addresses lowers address-level linkage risk.",
    });
  }

  if (input.history === "heavy") {
    score += 18;
    findings.push({
      title: "Recent activity history",
      description: "Multiple related actions increase the chance that observers can infer the same actor or intent.",
    });
  } else if (input.history === "moderate") {
    score += 8;
    findings.push({
      title: "Some activity history",
      description: "There is enough recent context to correlate actions if they are closely spaced.",
    });
  } else {
    score -= 6;
    findings.push({
      title: "Limited history footprint",
      description: "Lower activity history reduces behavioral linkage across transactions.",
    });
  }

  if (input.pattern === "repeat") {
    score += 14;
    findings.push({
      title: "Recurring pattern",
      description: "A consistent rhythm or repeated shape makes the pattern easier to cluster.",
    });
  } else if (input.pattern === "occasional") {
    score += 6;
    findings.push({
      title: "Semi-regular flow",
      description: "This pattern is still somewhat recognizable but less obvious than a fixed cadence.",
    });
  } else {
    score -= 4;
    findings.push({
      title: "Unique activity pattern",
      description: "A one-off pattern is less likely to match a structured behavioral profile.",
    });
  }

  if (amount >= 25000) {
    score += 10;
    findings.push({
      title: "High-value transfer",
      description: "Large transfers are more likely to stand out in aggregate analysis.",
    });
  } else if (amount >= 8000) {
    score += 6;
    findings.push({
      title: "Medium-value transfer",
      description: "The amount is meaningful enough to correlate with similar recent flows.",
    });
  }

  const finalScore = clamp(Math.round(score), 8, 96);
  const label = finalScore >= 75 ? "Critical" : finalScore >= 55 ? "High risk" : finalScore >= 35 ? "Moderate" : "Low risk";
  const recommendations = [
    finalScore >= 60 ? "Delay the transaction for a wider time window to reduce timing linkage." : "Keep the window short, but avoid coordinated bursts.",
    input.addressReuse !== "none" ? "Rotate to fresh addresses and reduce address reuse before signing." : "Keep using fresh addresses to maintain unlinkability.",
    input.pattern !== "unique" ? "Avoid recurring execution patterns by varying the transaction rhythm." : "Your pattern is already relatively unstructured.",
  ];

  return {
    score: finalScore,
    label,
    findings: findings.slice(0, 4),
    recommendations,
  };
}
