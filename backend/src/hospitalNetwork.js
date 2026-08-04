/**
 * hospitalNetwork.js
 * Classifies a hospital mentioned in a claim description against the
 * insurer's Empaneled Network Hospital list.
 * Determines: CASHLESS (Tier 1/2) | REIMBURSEMENT (Tier 3) | OUT_OF_NETWORK
 */

const EMPANELED_HOSPITALS = [
  // ── TIER 1: Top Cashless Network Hospitals ───────────────────────────────
  { keywords: ['apollo', 'apollo hospital', 'apollo multispeciality', 'apollo multi-specialty'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['fortis', 'fortis hospital', 'fortis memorial', 'fortis healthcare'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['max hospital', 'max super speciality', 'max healthcare', 'max multispeciality'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['manipal hospital', 'manipal healthcare', 'manipal', 'manipal clinic'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['aiims', 'all india institute of medical sciences'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['medanta', 'medanta the medicity', 'medanta hospital'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['kokilaben', 'kokilaben dhirubhai ambani', 'kokilaben hospital'], tier: 'TIER_1', status: 'CASHLESS', city: 'Mumbai' },
  { keywords: ['lilavati', 'lilavati hospital', 'lilavati trust'], tier: 'TIER_1', status: 'CASHLESS', city: 'Mumbai' },
  { keywords: ['hinduja', 'p.d. hinduja', 'hinduja hospital'], tier: 'TIER_1', status: 'CASHLESS', city: 'Mumbai' },
  { keywords: ['aster', 'aster cmi', 'aster hospital', 'aster prime'], tier: 'TIER_1', status: 'CASHLESS', city: 'Pan-India' },

  // ── TIER 2: Secondary Cashless Network Hospitals ─────────────────────────
  { keywords: ['columbia asia', 'columbia hospital', 'columbia asia hospital'], tier: 'TIER_2', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['wockhardt', 'wockhardt hospital'], tier: 'TIER_2', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['ruby hall', 'ruby hall clinic'], tier: 'TIER_2', status: 'CASHLESS', city: 'Pune' },
  { keywords: ['narayana health', 'narayana hrudayalaya', 'nh hospital'], tier: 'TIER_2', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['care hospital', 'care hospitals'], tier: 'TIER_2', status: 'CASHLESS', city: 'Hyderabad' },
  { keywords: ['gleneagles', 'gleneagles hospital', 'gleneagles bgr'], tier: 'TIER_2', status: 'CASHLESS', city: 'Chennai' },
  { keywords: ['global hospital', 'global hospitals'], tier: 'TIER_2', status: 'CASHLESS', city: 'Pan-India' },
  { keywords: ['kamineni', 'kamineni hospitals'], tier: 'TIER_2', status: 'CASHLESS', city: 'Hyderabad' },

  // ── TIER 3: Reimbursement-Only Hospitals ─────────────────────────────────
  { keywords: ['city care', 'citycare', 'city care hospital'], tier: 'TIER_3', status: 'REIMBURSEMENT', city: 'Regional' },
  { keywords: ['district hospital', 'govt hospital', 'government hospital', 'civil hospital'], tier: 'TIER_3', status: 'REIMBURSEMENT', city: 'Government' },
  { keywords: ['community health center', 'chc', 'primary health center', 'phc'], tier: 'TIER_3', status: 'REIMBURSEMENT', city: 'Government' },
];

/**
 * Extracts the most likely hospital name mentioned in a claim description.
 * @param {string} text - The claim description text
 * @returns {string|null}
 */
function extractHospitalName(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Look for patterns like "admitted to X", "at X hospital", "X hospital"
  const patterns = [
    /admitted (?:to|at) ([A-Za-z\s,.-]+?)(?:for|hospital|\.)/i,
    /([A-Za-z\s]+hospital[A-Za-z\s,.-]*)/i,
    /treated at ([A-Za-z\s,.-]+?)(?:for|\.|,|by)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim().slice(0, 60);
  }
  return null;
}

/**
 * Classifies a hospital against the empaneled network.
 * @param {string} description - Claim description
 * @param {string} policyCompany - The insurer name (for future per-insurer network support)
 * @returns {{ hospitalName, networkStatus, empanelmentTier, tierLabel, status, city, locationVerified, cashlessEligible }}
 */
export function classifyHospital(description, policyCompany = '') {
  const lower = (description || '').toLowerCase();
  const extractedName = extractHospitalName(description);

  // Fuzzy match against empaneled list
  for (const entry of EMPANELED_HOSPITALS) {
    const matched = entry.keywords.some(kw => lower.includes(kw));
    if (matched) {
      return {
        hospitalName: extractedName || entry.keywords[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        networkStatus: entry.status,
        empanelmentTier: entry.tier,
        tierLabel: entry.tier === 'TIER_1' ? 'Tier 1 — Premium Cashless' : entry.tier === 'TIER_2' ? 'Tier 2 — Standard Cashless' : 'Tier 3 — Reimbursement Only',
        city: entry.city,
        locationVerified: true,
        cashlessEligible: entry.status === 'CASHLESS',
        empaneledWith: policyCompany || 'Star Health & Allied Insurance',
        networkBadgeColor: entry.status === 'CASHLESS' ? 'green' : 'amber',
        riskAddition: 0 // no extra risk for reimbursement, only for out-of-network
      };
    }
  }

  // Not found — OUT_OF_NETWORK
  return {
    hospitalName: extractedName || 'Unknown / Unverified Healthcare Provider',
    networkStatus: 'OUT_OF_NETWORK',
    empanelmentTier: 'UNEMPANELED',
    tierLabel: 'Not in Empaneled Network',
    city: 'Unknown',
    locationVerified: false,
    cashlessEligible: false,
    empaneledWith: policyCompany || 'Star Health & Allied Insurance',
    networkBadgeColor: 'red',
    riskAddition: 15 // penalize risk score
  };
}
