/**
 * tariffEngine.js
 * GIPSA (General Insurers' Public Sector Association) & PPN (Preferred Provider Network)
 * Medical Procedure Package Tariff Benchmarking Engine.
 * Benchmarks claimed procedures against standard Indian health insurance package tariffs.
 */

// Standard GIPSA / PPN Package Tariffs (in INR) across Metro (Tier 1) vs Non-Metro (Tier 2/3)
const GIPSA_TARIFF_DATABASE = [
  { keywords: ['appendectomy', 'appendix', 'appendicectomy'], category: 'General Surgery', metroTariff: 45000, nonMetroTariff: 32000, description: 'Laparoscopic / Open Appendectomy Package' },
  { keywords: ['cataract', 'phacoemulsification', 'lens replacement', 'iol'], category: 'Ophthalmology', metroTariff: 38000, nonMetroTariff: 28000, description: 'Single Eye Phacoemulsification + Monofocal IOL' },
  { keywords: ['cholecystectomy', 'gallbladder', 'gall stone'], category: 'General Surgery', metroTariff: 55000, nonMetroTariff: 40000, description: 'Laparoscopic Cholecystectomy Package' },
  { keywords: ['hernia', 'inguinal hernia', 'umbilical hernia'], category: 'General Surgery', metroTariff: 48000, nonMetroTariff: 35000, description: 'Hernioplasty / Herniorrhaphy Mesh Repair' },
  { keywords: ['angioplasty', 'ptca', 'stent'], category: 'Cardiology', metroTariff: 180000, nonMetroTariff: 140000, description: 'Single Vessel PTCA + Drug Eluting Stent (DES)' },
  { keywords: ['cabg', 'bypass surgery', 'coronary artery bypass'], category: 'Cardiology', metroTariff: 280000, nonMetroTariff: 220000, description: 'Coronary Artery Bypass Grafting (CABG) Package' },
  { keywords: ['knee replacement', 'tka', 'total knee'], category: 'Orthopedics', metroTariff: 210000, nonMetroTariff: 165000, description: 'Unilateral Total Knee Arthroplasty (TKA)' },
  { keywords: ['hip replacement', 'tha', 'total hip'], category: 'Orthopedics', metroTariff: 230000, nonMetroTariff: 180000, description: 'Unilateral Total Hip Arthroplasty (THA)' },
  { keywords: ['hysterectomy', 'uterus removal'], category: 'Gynecology', metroTariff: 65000, nonMetroTariff: 48000, description: 'Total Abdominal / Laparoscopic Hysterectomy' },
  { keywords: ['dialysis', 'hemodialysis'], category: 'Nephrology', metroTariff: 3500, nonMetroTariff: 2500, description: 'Single Hemodialysis Session Package' },
  { keywords: ['c-section', 'caesarean', 'cesarean'], category: 'Obstetrics', metroTariff: 55000, nonMetroTariff: 38000, description: 'Lower Segment Cesarean Section (LSCS)' },
  { keywords: ['normal delivery'], category: 'Obstetrics', metroTariff: 35000, nonMetroTariff: 25000, description: 'Normal Vaginal Delivery Package' },
  { keywords: ['kidney stone', 'rirs', 'eswl', 'pcnl'], category: 'Urology', metroTariff: 60000, nonMetroTariff: 45000, description: 'Renal Calculus Laser Lithotripsy / RIRS' },
];

/**
 * Check if hospital city is a Metro (Tier 1) zone
 */
function isMetroCity(city = '') {
  const metroCities = ['mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad'];
  return metroCities.some(m => city.toLowerCase().includes(m));
}

/**
 * Main GIPSA / PPN tariff benchmarking function.
 * @param {object} claim - Claim object with description, claimAmount, hospitalNetworkInfo
 * @returns {object} Tariff benchmark analysis
 */
export function analyzeGIPSATariff(claim) {
  const claimAmount = Number(claim.claimAmount) || 0;

  if (claim.policyType && claim.policyType !== 'Health') {
    return {
      tariffApplied: false,
      procedureName: 'N/A — Non-Health Policy',
      benchmarkTariff: null,
      billedAmount: claimAmount,
      tariffExcess: 0,
      approvedAmount: claimAmount,
      isMetroZone: false,
      reason: 'GIPSA package tariffs apply only to Inpatient Health Insurance claims.'
    };
  }

  const description = (claim.description || '').toLowerCase();
  const hospitalCity = claim.hospitalNetworkInfo?.city || 'Mumbai';
  const isMetro = isMetroCity(hospitalCity);

  // Search for matching procedure package
  const matchedProcedure = GIPSA_TARIFF_DATABASE.find(proc =>
    proc.keywords.some(kw => description.includes(kw))
  );

  if (!matchedProcedure) {
    return {
      tariffApplied: false,
      procedureName: 'Unclassified / Custom Procedure',
      benchmarkTariff: null,
      billedAmount: claimAmount,
      tariffExcess: 0,
      reason: 'No standard GIPSA package tariff defined for this procedure. Claim evaluated on itemized billing basis.'
    };
  }

  const benchmarkTariff = isMetro ? matchedProcedure.metroTariff : matchedProcedure.nonMetroTariff;
  const tariffExcess = Math.max(0, claimAmount - benchmarkTariff);
  const isExcessive = tariffExcess > 0;

  return {
    tariffApplied: true,
    procedureName: matchedProcedure.description,
    category: matchedProcedure.category,
    isMetroZone: isMetro,
    hospitalCity,
    benchmarkTariff,
    billedAmount: claimAmount,
    tariffExcess,
    isExcessive,
    allowedAmountUnderTariff: Math.min(claimAmount, benchmarkTariff),
    reason: isExcessive
      ? `Claimed amount ₹${claimAmount.toLocaleString('en-IN')} exceeds standard GIPSA/PPN package tariff of ₹${benchmarkTariff.toLocaleString('en-IN')} for ${matchedProcedure.description} in ${hospitalCity} (${isMetro ? 'Metro' : 'Non-Metro'}).`
      : `Claimed amount ₹${claimAmount.toLocaleString('en-IN')} is within GIPSA/PPN benchmark package tariff (₹${benchmarkTariff.toLocaleString('en-IN')}).`,
    clause: 'Policy Section 5.4 — GIPSA / PPN Preferred Provider Package Tariff Cap'
  };
}
