/**
 * accumulatorEngine.js
 * Yearly Policy Accumulator, No Claim Bonus (NCB), & Auto-Restoration Benefit Engine.
 * Tracks cumulative claims made in the current policy year, calculates No Claim Bonus additions,
 * and triggers 100% Auto-Restoration of Sum Insured when base coverage is exhausted.
 */

/**
 * Main accumulator function.
 * @param {object} currentClaim - The claim being processed
 * @param {Array} existingClaimsForPolicy - All historical claims under the same policy number
 * @returns {object} Accumulator & Restoration analysis
 */
export function computePolicyAccumulator(currentClaim, existingClaimsForPolicy = []) {
  const sumInsured = Number(currentClaim.sumInsured) || 500000;
  const policyNumber = currentClaim.policyNumber;

  // Filter existing claims in the current policy year excluding current claim
  const priorApprovedClaims = existingClaimsForPolicy.filter(c =>
    c.id !== currentClaim.id &&
    ['approved', 'submitted', 'review', 'doc_pending'].includes(c.status)
  );

  const totalPriorClaimed = priorApprovedClaims.reduce((acc, c) => acc + (Number(c.approvedAmount != null ? c.approvedAmount : c.claimAmount) || 0), 0);

  // No Claim Bonus (NCB) calculation: +10% SI for each claim-free year (capped at 50% max)
  const isClaimFree = priorApprovedClaims.length === 0;
  const ncbPercentage = isClaimFree ? 20 : 0; // 20% NCB if no prior claims
  const ncbAmount = Math.round(sumInsured * (ncbPercentage / 100));

  const totalCoverageWithNCB = sumInsured + ncbAmount;
  const remainingSIBeforeCurrentClaim = Math.max(0, totalCoverageWithNCB - totalPriorClaimed);

  const currentClaimAmt = Number(currentClaim.claimAmount) || 0;
  const isBaseExhausted = currentClaimAmt > remainingSIBeforeCurrentClaim;

  // Auto-Restoration Benefit: 100% SI restored once per policy year for unrelated illness
  let restorationTriggered = false;
  let restoredAmount = 0;
  let effectiveAvailableCoverage = remainingSIBeforeCurrentClaim;

  if (isBaseExhausted) {
    restorationTriggered = true;
    restoredAmount = sumInsured; // 100% reinstatement
    effectiveAvailableCoverage += restoredAmount;
  }

  return {
    policyNumber,
    baseSumInsured: sumInsured,
    ncbPercentage,
    ncbAmount,
    totalCoverageWithNCB,
    totalPriorClaimed,
    priorClaimCount: priorApprovedClaims.length,
    remainingSIBeforeCurrentClaim,
    isBaseExhausted,
    restorationTriggered,
    restoredAmount,
    effectiveAvailableCoverage,
    clause: restorationTriggered
      ? 'Policy Section 8.2 — Automatic 100% Reinstatement / Restoration of Sum Insured Triggered'
      : 'Policy Section 8.1 — Standard Cumulative Sum Insured Balance'
  };
}
