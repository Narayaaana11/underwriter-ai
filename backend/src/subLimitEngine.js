/**
 * subLimitEngine.js
 * Enforces Indian health insurance policy sub-limits and computes deductions.
 * Returns approved amount, deductions breakdown, and applied clauses.
 */

// Standard sub-limit defaults (can be overridden per insurer config)
const DEFAULT_SUB_LIMITS = {
  roomRentPct: 0.01,          // 1% of Sum Insured per day
  icuPct: 0.02,               // 2% of Sum Insured per day
  cataractMax: 40000,         // ₹40,000 per eye per year
  opdMax: 10000,              // ₹10,000 OPD per year
  maternityMax: 50000,        // ₹50,000 maternity
  ambulanceMax: 2000,         // ₹2,000 per hospitalization
  defaultStayDays: 4,         // assumed stay if not specified
  defaultIcuDays: 0,          // assumed ICU days if not specified
};

// Procedure-specific sub-limit keywords
const CATARACT_KEYWORDS = ['cataract', 'phacoemulsification', 'lens replacement', 'iol'];
const MATERNITY_KEYWORDS = ['delivery', 'caesarean', 'c-section', 'maternity', 'prenatal', 'postnatal', 'labour', 'labor', 'childbirth', 'newborn'];
const OPD_KEYWORDS = ['outpatient', 'opd', 'out-patient', 'clinic visit', 'consultation only'];
const ICU_KEYWORDS = ['icu', 'intensive care', 'critical care', 'ventilator', 'icu stay'];
const COSMETIC_KEYWORDS = ['cosmetic', 'aesthetic', 'plastic surgery', 'rhinoplasty', 'facelift', 'liposuction', 'hair transplant', 'botox', 'breast augmentation'];

/**
 * Extract estimated stay days from claim description
 */
function extractStayDays(description) {
  if (!description) return DEFAULT_SUB_LIMITS.defaultStayDays;
  const match = description.match(/(\d+)\s*(?:day|days|night|nights)\s*(?:inpatient|stay|admission|hospitali)/i);
  if (match) return Math.min(parseInt(match[1]), 30);
  const match2 = description.match(/(\d+)\s*(?:day|days|night|nights)/i);
  if (match2) return Math.min(parseInt(match2[1]), 30);
  return DEFAULT_SUB_LIMITS.defaultStayDays;
}

/**
 * Check if text contains any keyword from list
 */
function hasKeyword(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Main sub-limit computation engine.
 * @param {object} claim - The full claim object
 * @returns {{ approvedAmount, deductions, totalDeducted, appliedClauses, subLimitTriggered }}
 */
export function computeSubLimits(claim) {
  const claimAmount = Number(claim.claimAmount) || 0;
  const sumInsured = Number(claim.sumInsured) || 500000;

  if (claim.policyType && claim.policyType !== 'Health') {
    return {
      subLimitTriggered: false,
      exclusionApplied: false,
      approvedAfterDeductions: claimAmount,
      totalDeducted: 0,
      deductions: [],
      appliedClauses: []
    };
  }

  const description = (claim.description || '').toLowerCase();
  const stayDays = extractStayDays(claim.description);
  const limits = DEFAULT_SUB_LIMITS;

  const deductions = [];
  let totalDeducted = 0;

  // ── 1. COSMETIC EXCLUSION (100% rejection) ───────────────────────────────
  if (hasKeyword(description, COSMETIC_KEYWORDS)) {
    return {
      approvedAmount: 0,
      deductions: [{
        type: 'Cosmetic / Aesthetic Procedure Exclusion',
        clause: 'Policy Section 4.1 — Elective Cosmetic Exclusion',
        claimedAmount: claimAmount,
        allowedAmount: 0,
        deductedAmount: claimAmount,
        reason: 'Elective cosmetic and aesthetic procedures are explicitly excluded under standard health insurance policy terms.'
      }],
      totalDeducted: claimAmount,
      approvedAfterDeductions: 0,
      appliedClauses: ['Section 4.1 — Cosmetic Exclusion'],
      subLimitTriggered: true,
      exclusionApplied: true
    };
  }

  // ── 2. ROOM RENT SUB-LIMIT ───────────────────────────────────────────────
  const roomRentCap = Math.round(sumInsured * limits.roomRentPct); // per day
  // Estimate room rent portion as ~25% of claim amount (heuristic if not itemized)
  const estimatedRoomRent = Math.round(claimAmount * 0.25);
  const allowedRoomRent = roomRentCap * stayDays;
  if (estimatedRoomRent > allowedRoomRent && !hasKeyword(description, OPD_KEYWORDS)) {
    const deduction = estimatedRoomRent - allowedRoomRent;
    totalDeducted += deduction;
    deductions.push({
      type: 'Room Rent Sub-Limit Excess',
      clause: `Policy Section 3.2 — Room Rent Cap (1% of SI = ₹${roomRentCap.toLocaleString('en-IN')}/day)`,
      claimedAmount: estimatedRoomRent,
      allowedAmount: allowedRoomRent,
      deductedAmount: deduction,
      reason: `Room rent claimed exceeds 1% of Sum Insured (₹${roomRentCap.toLocaleString('en-IN')}/day × ${stayDays} days = ₹${allowedRoomRent.toLocaleString('en-IN')} allowed).`
    });
  }

  // ── 3. ICU SUB-LIMIT ─────────────────────────────────────────────────────
  if (hasKeyword(claim.description, ICU_KEYWORDS)) {
    const icuDays = 2; // default ICU days if mentioned
    const icuCap = Math.round(sumInsured * limits.icuPct * icuDays);
    const estimatedICU = Math.round(claimAmount * 0.30);
    if (estimatedICU > icuCap) {
      const deduction = estimatedICU - icuCap;
      totalDeducted += deduction;
      deductions.push({
        type: 'ICU / Critical Care Sub-Limit Excess',
        clause: `Policy Section 3.3 — ICU Cap (2% of SI = ₹${Math.round(sumInsured * limits.icuPct).toLocaleString('en-IN')}/day)`,
        claimedAmount: estimatedICU,
        allowedAmount: icuCap,
        deductedAmount: deduction,
        reason: `ICU charges exceed 2% of Sum Insured per day (${icuDays} ICU days × ₹${Math.round(sumInsured * limits.icuPct).toLocaleString('en-IN')} = ₹${icuCap.toLocaleString('en-IN')} allowed).`
      });
    }
  }

  // ── 4. CATARACT SUB-LIMIT ────────────────────────────────────────────────
  if (hasKeyword(description, CATARACT_KEYWORDS)) {
    if (claimAmount > limits.cataractMax) {
      const deduction = claimAmount - limits.cataractMax;
      totalDeducted += deduction;
      deductions.push({
        type: 'Cataract Surgery Sub-Limit',
        clause: `Policy Section 3.7 — Cataract Cap (₹${limits.cataractMax.toLocaleString('en-IN')} per eye per year)`,
        claimedAmount: claimAmount,
        allowedAmount: limits.cataractMax,
        deductedAmount: deduction,
        reason: `Cataract procedure claim exceeds the sub-limit of ₹${limits.cataractMax.toLocaleString('en-IN')} per eye per year.`
      });
    }
  }

  // ── 5. OPD CAP ──────────────────────────────────────────────────────────
  if (hasKeyword(description, OPD_KEYWORDS)) {
    if (claimAmount > limits.opdMax) {
      const deduction = claimAmount - limits.opdMax;
      totalDeducted += deduction;
      deductions.push({
        type: 'OPD (Out-Patient) Annual Cap',
        clause: `Policy Section 3.9 — OPD Cap (₹${limits.opdMax.toLocaleString('en-IN')}/year)`,
        claimedAmount: claimAmount,
        allowedAmount: limits.opdMax,
        deductedAmount: deduction,
        reason: `OPD treatment claim exceeds the annual out-patient cap of ₹${limits.opdMax.toLocaleString('en-IN')}.`
      });
    }
  }

  // ── 6. MATERNITY CAP ─────────────────────────────────────────────────────
  if (hasKeyword(description, MATERNITY_KEYWORDS)) {
    if (claimAmount > limits.maternityMax) {
      const deduction = claimAmount - limits.maternityMax;
      totalDeducted += deduction;
      deductions.push({
        type: 'Maternity Benefit Sub-Limit',
        clause: `Policy Section 3.11 — Maternity Cap (₹${limits.maternityMax.toLocaleString('en-IN')})`,
        claimedAmount: claimAmount,
        allowedAmount: limits.maternityMax,
        deductedAmount: deduction,
        reason: `Maternity benefit claims are capped at ₹${limits.maternityMax.toLocaleString('en-IN')} per policy year.`
      });
    }
  }

  const totalDeductedCapped = Math.min(totalDeducted, claimAmount);
  const approvedAfterDeductions = Math.max(0, claimAmount - totalDeductedCapped);

  return {
    approvedAmount: approvedAfterDeductions,
    deductions,
    totalDeducted: totalDeductedCapped,
    approvedAfterDeductions,
    appliedClauses: deductions.map(d => d.clause),
    subLimitTriggered: deductions.length > 0,
    exclusionApplied: false,
    stayDaysAssumed: stayDays,
    roomRentCapPerDay: Math.round(sumInsured * limits.roomRentPct)
  };
}
