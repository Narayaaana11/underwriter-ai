/**
 * pedEngine.js
 * Pre-Existing Disease (PED) & Waiting Period Detection Engine.
 * Scans claim description for disease keywords and compares against policy age
 * to flag IRDAI-defined waiting period violations.
 */

// ── PED Disease Keywords (30-day + 2-year waiting period) ───────────────────
const PED_DISEASES = [
  'diabetes', 'diabetic', 'insulin', 'type 2 diabetes', 'type 1 diabetes',
  'hypertension', 'high blood pressure', 'hypertensive',
  'asthma', 'chronic obstructive', 'copd', 'bronchitis',
  'thyroid', 'hypothyroid', 'hyperthyroid',
  'kidney disease', 'renal failure', 'chronic kidney', 'ckd',
  'liver disease', 'hepatitis', 'cirrhosis',
  'heart disease', 'cardiac', 'coronary artery', 'angina', 'heart failure',
  'cancer', 'carcinoma', 'malignancy', 'tumor', 'tumour', 'oncology',
  'epilepsy', 'seizure', 'epileptic',
  'arthritis', 'rheumatoid', 'osteoarthritis',
  'psoriasis', 'lupus', 'multiple sclerosis',
  'parkinson', 'alzheimer', 'dementia',
  'obesity', 'morbid obesity', 'bariatric',
  'sickle cell', 'thalassemia',
  'hiv', 'aids',
  'depression', 'bipolar', 'schizophrenia', 'psychiatric',
  'stroke', 'cerebrovascular',
];

// ── Specific Illness Keywords (4-year waiting period) ─────────────────────
const SPECIFIC_ILLNESS_4YR = [
  'cataract', 'lens replacement',
  'hernia', 'inguinal hernia', 'umbilical hernia',
  'joint replacement', 'knee replacement', 'hip replacement', 'arthroplasty',
  'varicose veins', 'varicose',
  'calculus', 'kidney stone', 'gallstone', 'renal calculus',
  'benign prostatic', 'bph', 'prostate enlargement',
  'piles', 'haemorrhoids', 'hemorrhoids', 'fistula', 'fissure',
  'sinusitis', 'deviated septum', 'nasal polyp',
  'tonsil', 'tonsillitis', 'adenoid',
];

// ── Initial 30-Day Waiting Period Disease Keywords ────────────────────────
// (Not covered in first 30 days of policy for any illness)
const INITIAL_WAITING_DAYS = 30;
const PED_WAITING_YEARS = 2;
const SPECIFIC_ILLNESS_WAITING_YEARS = 4;

/**
 * Compute policy age in days from policyStartDate.
 */
function policyAgeDays(policyStartDate) {
  if (!policyStartDate) return 365; // default 1 year if unknown
  const start = new Date(policyStartDate);
  const now = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

/**
 * Find matching PED keywords in text.
 */
function matchKeywords(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.filter(kw => lower.includes(kw));
}

/**
 * Main PED & waiting period detection engine.
 * @param {object} claim - Full claim object
 * @returns {object} - PED analysis result
 */
export function analyzePED(claim) {
  const policyAge = policyAgeDays(claim.policyStartDate);
  const policyAgeYears = policyAge / 365;

  if (claim.policyType && claim.policyType !== 'Health') {
    return {
      hasViolation: false,
      violations: [],
      warnings: [],
      riskAddition: 0,
      detectedPED: [],
      detectedSpecific: [],
      policyAgeDays: policyAge,
      policyAgeYears
    };
  }

  const description = claim.description || '';

  const detectedPED = matchKeywords(description, PED_DISEASES);
  const detectedSpecific = matchKeywords(description, SPECIFIC_ILLNESS_4YR);

  const violations = [];
  const warnings = [];

  // ── Initial 30-day waiting period check ─────────────────────────────────
  if (policyAge < INITIAL_WAITING_DAYS) {
    violations.push({
      type: 'INITIAL_WAITING_PERIOD',
      severity: 'critical',
      title: 'Initial 30-Day Waiting Period Violation',
      detail: `Policy is only ${policyAge} days old. No claims are payable during the initial 30-day waiting period unless for accidental injuries.`,
      clause: 'Policy Section 6.1 — Initial Waiting Period (30 Days)',
      recommendedAction: 'REJECT — Unless claim is for accidental injury (verify incident cause)',
      policyAgeDays: policyAge
    });
  }

  // ── PED 2-year waiting period check ────────────────────────────────────
  if (detectedPED.length > 0 && policyAgeYears < PED_WAITING_YEARS) {
    const diseaseList = [...new Set(detectedPED)].slice(0, 5).join(', ');
    violations.push({
      type: 'PED_WAITING_PERIOD',
      severity: 'critical',
      title: 'Pre-Existing Disease (PED) Waiting Period Violation',
      detail: `Detected potential pre-existing conditions: "${diseaseList}". Policy is ${Math.floor(policyAgeYears * 12)} months old — PED waiting period requires 2 full years (24 months).`,
      clause: 'Policy Section 6.2 — PED Waiting Period (24 Months)',
      recommendedAction: 'REJECT or INVESTIGATE — Obtain PED declaration form and hospital records to confirm onset date.',
      detectedDiseases: [...new Set(detectedPED)],
      policyAgeDays: policyAge,
      policyAgeMonths: Math.floor(policyAgeYears * 12)
    });
  } else if (detectedPED.length > 0 && policyAgeYears >= PED_WAITING_YEARS) {
    warnings.push({
      type: 'PED_WAIVED',
      severity: 'info',
      title: 'PED Detected — Waiting Period Satisfied',
      detail: `Pre-existing conditions detected (${[...new Set(detectedPED)].slice(0,3).join(', ')}) but the 2-year PED waiting period has been completed (${Math.floor(policyAgeYears * 12)} months old). Claim eligible subject to other conditions.`,
      detectedDiseases: [...new Set(detectedPED)]
    });
  }

  // ── Specific illness 4-year waiting period check ────────────────────────
  if (detectedSpecific.length > 0 && policyAgeYears < SPECIFIC_ILLNESS_WAITING_YEARS) {
    const illnessList = [...new Set(detectedSpecific)].slice(0, 5).join(', ');
    violations.push({
      type: 'SPECIFIC_ILLNESS_WAITING_PERIOD',
      severity: 'high',
      title: 'Specific Illness 4-Year Waiting Period Violation',
      detail: `Detected specific illness: "${illnessList}". Policy is ${Math.floor(policyAgeYears * 12)} months old — specific illness waiting period requires 4 full years (48 months).`,
      clause: 'Policy Section 6.3 — Specific Illness Waiting Period (48 Months)',
      recommendedAction: 'REJECT — Specific illness waiting period not yet satisfied.',
      detectedIllnesses: [...new Set(detectedSpecific)],
      policyAgeDays: policyAge,
      policyAgeMonths: Math.floor(policyAgeYears * 12)
    });
  }

  // ── PED risk score addition ─────────────────────────────────────────────
  let riskAddition = 0;
  if (violations.some(v => v.type === 'INITIAL_WAITING_PERIOD')) riskAddition += 35;
  if (violations.some(v => v.type === 'PED_WAITING_PERIOD')) riskAddition += 30;
  if (violations.some(v => v.type === 'SPECIFIC_ILLNESS_WAITING_PERIOD')) riskAddition += 25;
  if (warnings.length > 0 && violations.length === 0) riskAddition += 5;

  return {
    pedAnalyzed: true,
    policyAgeDays: policyAge,
    policyAgeMonths: Math.floor(policyAgeYears * 12),
    policyAgeYears: parseFloat(policyAgeYears.toFixed(2)),
    detectedPEDDiseases: [...new Set(detectedPED)],
    detectedSpecificIllnesses: [...new Set(detectedSpecific)],
    violations,
    warnings,
    hasViolation: violations.length > 0,
    riskAddition,
    analyzedAt: new Date().toISOString()
  };
}
