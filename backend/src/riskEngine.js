/**
 * Server-side Risk Scoring Engine implementing Section 5 rules.
 */
export function calculateRiskScore(claim) {
  let score = 0;
  const flags = [];

  const policyStartDate = new Date(claim.policyStartDate);
  const incidentDate = new Date(claim.incidentDate);
  const daysBetweenPolicyAndIncident = Math.floor((incidentDate - policyStartDate) / (1000 * 60 * 60 * 24));

  // Rule 1 & 2: Incident timing relative to policy start
  if (daysBetweenPolicyAndIncident < 30 && daysBetweenPolicyAndIncident >= 0) {
    score += 40;
    flags.push({
      flag: "possible waiting-period violation",
      impact: 40,
      severity: "alert",
      explanation: `Incident occurred ${daysBetweenPolicyAndIncident} days after policy start (under mandatory 30-day waiting threshold).`
    });
  } else if (daysBetweenPolicyAndIncident < 90 && daysBetweenPolicyAndIncident >= 30) {
    score += 15;
    flags.push({
      flag: "within early-claim window",
      impact: 15,
      severity: "warning",
      explanation: `Incident occurred ${daysBetweenPolicyAndIncident} days after policy inception (early claim window < 90 days).`
    });
  }

  // Rule 3 & 4: Claim amount vs Sum Insured
  const sumInsured = Number(claim.sumInsured) || 1;
  const claimAmount = Number(claim.claimAmount) || 0;
  const ratio = claimAmount / sumInsured;

  if (ratio > 0.90) {
    score += 30;
    flags.push({
      flag: "unusually high vs sum insured",
      impact: 30,
      severity: "alert",
      explanation: `Claim amount (₹${claimAmount.toLocaleString()}) represents ${(ratio * 100).toFixed(1)}% of total policy sum insured (₹${sumInsured.toLocaleString()}).`
    });
  } else if (ratio > 0.60) {
    score += 10;
    flags.push({
      flag: "substantial proportion of sum insured",
      impact: 10,
      severity: "warning",
      explanation: `Claim amount (₹${claimAmount.toLocaleString()}) represents ${(ratio * 100).toFixed(1)}% of sum insured (₹${sumInsured.toLocaleString()}).`
    });
  }

  // Rule 5: Supporting documents count
  const docCount = Array.isArray(claim.documents) ? claim.documents.length : 0;
  if (docCount < 2) {
    score += 15;
    flags.push({
      flag: "may be insufficient for verification",
      impact: 15,
      severity: "warning",
      explanation: `Only ${docCount} supporting document(s) provided. Minimum 2 required for standard automatic verification.`
    });
  }

  // Rule 6: Description brevity
  const wordCount = (claim.description || "").trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 12) {
    score += 10;
    flags.push({
      flag: "very brief, may need follow-up",
      impact: 10,
      severity: "warning",
      explanation: `Description contains only ${wordCount} words, which is below the recommended detail length.`
    });
  }

  // Cap total at 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine band
  let band = "low"; // 0-19
  let color = "#3E6E5B"; // Sage
  if (finalScore >= 50) {
    band = "high";
    color = "#A6394A"; // Rust
  } else if (finalScore >= 20) {
    band = "medium";
    color = "#C8862A"; // Amber
  }

  return {
    riskScore: finalScore,
    riskBand: band,
    color,
    riskFlags: flags
  };
}

/**
 * Blend rule-based score with AWS Fraud Detector score (if present)
 */
export function blendFraudScore(ruleScore, fraudDetectorScore) {
  if (fraudDetectorScore == null || isNaN(fraudDetectorScore)) {
    return ruleScore;
  }
  // Weighted average: 60% rule score + 40% ML fraud detector score
  return Math.round((ruleScore * 0.6) + (fraudDetectorScore * 0.4));
}
