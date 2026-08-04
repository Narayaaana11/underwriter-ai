/**
 * coPayEngine.js
 * Co-Payment & Zone Mismatch Deductible Engine for Indian Health Insurance.
 * Enforces Senior Citizen Co-Pay (Age > 60), Zone Mismatch Co-Pay (Tier 3 to Metro Tier 1),
 * and Voluntary Deductibles.
 */

/**
 * Estimate claimant age based on claimantName or mock default if missing
 */
function estimateAge(claimantName = '') {
  // Demo heuristic: if name contains "Senior" or "Elder", default age 65; otherwise default 42
  const lower = claimantName.toLowerCase();
  if (lower.includes('senior') || lower.includes('kumar (65)') || lower.includes('ramesh (68)')) return 68;
  return 42;
}

/**
 * Main Co-Pay computation function.
 * @param {object} claim - Claim object with claimantName, claimAmount, hospitalNetworkInfo
 * @param {number} baseApprovedAmount - Amount remaining after sub-limits & GIPSA tariffs
 * @returns {object} Co-Pay analysis result
 */
export function computeCoPay(claim, baseApprovedAmount) {
  const amountToApply = baseApprovedAmount != null ? baseApprovedAmount : Number(claim.claimAmount) || 0;

  if (claim.policyType && claim.policyType !== 'Health') {
    return {
      coPayTriggered: false,
      totalCoPayDeduction: 0,
      netApprovedAfterCoPay: amountToApply,
      coPayDeductions: [],
      effectiveCoPayPct: 0,
      claimantAge: 42,
      policyZone: 'N/A'
    };
  }
  const age = claim.claimantAge || estimateAge(claim.claimantName);
  const hospitalCity = (claim.hospitalNetworkInfo?.city || 'Mumbai').toLowerCase();
  const policyZone = (claim.policyZone || 'Zone A').toUpperCase(); // Zone A = Metro, Zone B = Tier 2, Zone C = Tier 3

  const coPayDeductions = [];
  let totalCoPayPct = 0;

  // ── 1. Senior Citizen Co-Pay (Age >= 60 -> 20% mandatory co-pay) ──────────
  let seniorCoPayPct = 0;
  if (age >= 60) {
    seniorCoPayPct = 0.20; // 20%
    totalCoPayPct += seniorCoPayPct;
    coPayDeductions.push({
      type: 'Senior Citizen Mandatory Co-Pay (20%)',
      clause: 'Policy Section 7.1 — Senior Citizen Entry Co-Payment (Age ≥ 60)',
      percentage: '20%',
      deductedAmount: Math.round(amountToApply * seniorCoPayPct),
      reason: `Claimant age ${age} triggers mandatory 20% Senior Citizen co-payment clause.`
    });
  }

  // ── 2. Zone Mismatch Co-Pay (Zone C policy treated in Zone A Metro) ───────
  const isMetroTreatment = ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata'].some(c => hospitalCity.includes(c));
  let zoneCoPayPct = 0;
  if (policyZone === 'ZONE C' && isMetroTreatment) {
    zoneCoPayPct = 0.15; // 15% co-pay for Zone C policy in Metro
    totalCoPayPct += zoneCoPayPct;
    coPayDeductions.push({
      type: 'Zone Mismatch Co-Pay (15%)',
      clause: 'Policy Section 7.4 — Geographic Zone Treatment Co-Pay',
      percentage: '15%',
      deductedAmount: Math.round(amountToApply * zoneCoPayPct),
      reason: `Policy issued under Zone C (Tier-3 pricing) but treatment received in Zone A Metro (${hospitalCity}). 15% zone co-pay applied.`
    });
  }

  // ── 3. Voluntary Deductible ──────────────────────────────────────────────
  const voluntaryDeductible = Number(claim.voluntaryDeductible) || 0;
  if (voluntaryDeductible > 0) {
    coPayDeductions.push({
      type: 'Voluntary Deductible',
      clause: 'Policy Schedule — Voluntary Deductible Discount Opted',
      percentage: 'Fixed Amount',
      deductedAmount: Math.min(amountToApply, voluntaryDeductible),
      reason: `Policyholder opted for voluntary deductible discount of ₹${voluntaryDeductible.toLocaleString('en-IN')}.`
    });
  }

  const totalPercentageDeducted = Math.round(amountToApply * Math.min(totalCoPayPct, 0.50));
  const totalCoPayDeduction = totalPercentageDeducted + voluntaryDeductible;
  const netApprovedAfterCoPay = Math.max(0, amountToApply - totalCoPayDeduction);

  return {
    coPayTriggered: coPayDeductions.length > 0,
    claimantAge: age,
    policyZone,
    isSeniorCitizen: age >= 60,
    coPayDeductions,
    totalCoPayDeduction,
    netApprovedAfterCoPay,
    effectiveCoPayPct: Math.round(totalCoPayPct * 100)
  };
}
