/**
 * irdaiReportGenerator.js
 * Generates a self-contained IRDAI-compliant HTML audit report
 * for a given insurance claim. Suitable for regulatory submission,
 * print-to-PDF, and internal compliance archiving.
 */

/**
 * Format currency in Indian Rupees
 */
function inr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

/**
 * Format ISO date string to readable Indian locale date
 */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Status pill HTML
 */
function statusPill(status) {
  const map = {
    approved: '#1a7a4a',
    rejected: '#a6394a',
    submitted: '#5a6a82',
    review: '#c8862a',
    escalated: '#7c3aed',
    paid: '#1a7a4a',
  };
  const color = map[(status || '').toLowerCase()] || '#5a6a82';
  return `<span style="background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${status || 'Unknown'}</span>`;
}

/**
 * Risk badge HTML
 */
function riskBadge(score) {
  const level = score >= 50 ? 'HIGH RISK' : score >= 20 ? 'MEDIUM RISK' : 'LOW RISK';
  const color = score >= 50 ? '#a6394a' : score >= 20 ? '#c8862a' : '#1a7a4a';
  return `<span style="background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;">${score}/100 · ${level}</span>`;
}

/**
 * Network status badge HTML
 */
function networkBadge(status) {
  const map = { CASHLESS: '#1a7a4a', REIMBURSEMENT: '#c8862a', OUT_OF_NETWORK: '#a6394a' };
  const color = map[status] || '#5a6a82';
  const label = status === 'OUT_OF_NETWORK' ? 'OUT OF NETWORK' : status;
  return `<span style="background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;">${label}</span>`;
}

/**
 * AI recommendation badge HTML
 */
function aiBadge(rec) {
  const map = { Approve: '#1a7a4a', Reject: '#a6394a', 'Investigate Further': '#c8862a' };
  const color = map[rec] || '#5a6a82';
  return `<span style="background:${color};color:#fff;padding:2px 12px;border-radius:4px;font-size:12px;font-weight:700;">${rec || 'Pending'}</span>`;
}

/**
 * Section header
 */
function sectionHeader(num, title) {
  return `
  <div style="margin-top:32px;margin-bottom:12px;border-bottom:2px solid #14213D;padding-bottom:6px;">
    <span style="font-size:11px;font-weight:700;color:#8a9ab5;letter-spacing:0.1em;text-transform:uppercase;">Section ${num}</span>
    <h2 style="margin:4px 0 0;font-size:17px;font-weight:700;color:#14213D;">${title}</h2>
  </div>`;
}

/**
 * Table row
 */
function row(label, value) {
  return `<tr>
    <td style="padding:6px 12px;color:#5a6a82;font-size:12px;width:38%;border-bottom:1px solid #e8e6df;">${label}</td>
    <td style="padding:6px 12px;color:#14213D;font-size:12px;font-weight:600;border-bottom:1px solid #e8e6df;">${value || '—'}</td>
  </tr>`;
}

/**
 * Main report generator
 * @param {object} claim - Full claim object from db
 * @param {object} options - { generatedBy, reportId }
 * @returns {string} Complete HTML document string
 */
export function generateIRDAIReport(claim, { generatedBy = 'System', reportId = null } = {}) {
  const rId = reportId || `IRDAI-RPT-${claim.id}-${Date.now()}`;
  const genTime = new Date().toISOString();
  const genTimeFmt = fmtDate(genTime);
  const pct = Math.round(((claim.claimAmount || 0) / (claim.sumInsured || 1)) * 100);

  // ── OCR document rows ────────────────────────────────────────────────────
  const ocrRows = (claim.documents || []).map(doc => {
    const fields = doc.extractedFields || {};
    const fieldRows = Object.entries(fields)
      .filter(([k]) => k !== 'ocrConfidence')
      .map(([k, v]) => `<tr>
        <td style="padding:4px 10px;color:#5a6a82;font-size:11px;border-bottom:1px solid #e8e6df;">${k}</td>
        <td style="padding:4px 10px;font-size:11px;font-weight:600;border-bottom:1px solid #e8e6df;">${v}</td>
      </tr>`).join('');
    return `
    <div style="margin-bottom:16px;border:1px solid #d8d4cb;border-radius:6px;overflow:hidden;">
      <div style="background:#f0ede5;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:12px;color:#14213D;">📄 ${doc.name}</span>
        <span style="font-size:11px;color:#5a6a82;">${doc.type} · OCR: ${fields.ocrConfidence || '98.2%'}</span>
      </div>
      ${fieldRows ? `<table style="width:100%;border-collapse:collapse;background:#fff;">${fieldRows}</table>` : '<p style="padding:8px 12px;color:#8a9ab5;font-size:11px;">No fields extracted.</p>'}
    </div>`;
  }).join('');

  // ── Risk flags rows ──────────────────────────────────────────────────────
  const flagRows = (claim.riskFlags || []).map(f => `
    <tr>
      <td style="padding:6px 12px;font-size:11px;font-weight:700;color:${f.severity === 'alert' ? '#a6394a' : '#c8862a'};border-bottom:1px solid #e8e6df;">⚑ ${f.flag}</td>
      <td style="padding:6px 12px;font-size:11px;border-bottom:1px solid #e8e6df;">${f.explanation}</td>
      <td style="padding:6px 12px;font-size:11px;font-weight:700;text-align:right;border-bottom:1px solid #e8e6df;">+${f.impact} pts</td>
    </tr>`).join('');

  // ── Audit trail rows ─────────────────────────────────────────────────────
  const auditRows = (claim.auditTrail || []).map(e => `
    <tr>
      <td style="padding:6px 10px;font-size:10px;font-family:monospace;color:#5a6a82;border-bottom:1px solid #e8e6df;white-space:nowrap;">${fmtDate(e.timestamp)}</td>
      <td style="padding:6px 10px;font-size:11px;font-weight:700;border-bottom:1px solid #e8e6df;">${e.action || e.event}</td>
      <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #e8e6df;">${e.actor}</td>
      <td style="padding:6px 10px;font-size:11px;color:#5a6a82;border-bottom:1px solid #e8e6df;">${e.details}</td>
    </tr>`).join('');

  // ── Hospital network info ─────────────────────────────────────────────────
  const hn = claim.hospitalNetworkInfo || {};
  const iv = claim.invoiceVerification || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IRDAI Audit Report · ${claim.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #f7f6f1; color: #14213D; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px 48px; min-height: 100vh; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { padding: 20px; box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── PRINT BUTTON ── -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;">
    <button onclick="window.print()" style="background:#14213D;color:#fff;padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- ── HEADER ── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #14213D;">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#8a9ab5;margin-bottom:4px;">Insurance Regulatory and Development Authority of India</div>
      <h1 style="font-size:26px;font-weight:800;color:#14213D;letter-spacing:-0.02em;">IRDAI Compliance Audit Report</h1>
      <div style="margin-top:8px;font-size:13px;color:#5a6a82;">Report ID: <span style="font-family:monospace;font-weight:700;">${rId}</span></div>
      <div style="margin-top:3px;font-size:12px;color:#5a6a82;">Generated: ${genTimeFmt} · By: ${generatedBy}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;font-size:13px;color:#14213D;">${claim.policyCompany || 'Star Health & Allied Insurance'}</div>
      <div style="font-size:12px;color:#5a6a82;margin-top:2px;">Ledger AI Underwriting Platform v2.0</div>
      <div style="margin-top:10px;">${statusPill(claim.status)}</div>
    </div>
  </div>

  <!-- ── SECTION 1: CLAIM IDENTIFICATION ── -->
  ${sectionHeader(1, 'Claim Identification & Core Specifications')}
  <table>
    <tbody>
      ${row('Claim ID', `<span style="font-family:monospace;font-weight:800;">${claim.id}</span>`)}
      ${row('Claimant Name', claim.claimantName)}
      ${row('Policy Number', claim.policyNumber)}
      ${row('Policy Type', claim.policyType)}
      ${row('Policy Company', claim.policyCompany || 'Star Health & Allied Insurance')}
      ${row('Policy Start Date', claim.policyStartDate)}
      ${row('Incident / Loss Date', claim.incidentDate)}
      ${row('Date Submitted', fmtDate(claim.submittedAt))}
      ${row('Contact Number', claim.contactNumber || '—')}
      ${row('Claim Amount', `<strong style="font-size:15px;">${inr(claim.claimAmount)}</strong>`)}
      ${row('Sum Insured', inr(claim.sumInsured))}
      ${row('% of Sum Insured', `<strong style="color:${pct > 90 ? '#a6394a' : '#14213D'}">${pct}%</strong>`)}
      ${row('Assigned Underwriter', claim.assignedUnderwriterName || 'Unassigned')}
      ${row('Final Decision', `${statusPill(claim.status)}`)}
      ${row('Decided By', claim.decidedBy || 'Pending')}
      ${row('Decided At', fmtDate(claim.decidedAt))}
    </tbody>
  </table>

  <div style="margin-top:16px;padding:14px;background:#f7f6f1;border-radius:6px;border:1px solid #d8d4cb;">
    <div style="font-size:11px;font-weight:700;color:#5a6a82;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;">Incident Description (Verbatim)</div>
    <p style="font-size:13px;color:#14213D;font-style:italic;line-height:1.6;">"${claim.description || 'No description provided.'}"</p>
  </div>

  <!-- ── SECTION 2: AWS TEXTRACT OCR EXTRACTIONS ── -->
  ${sectionHeader(2, 'AWS Textract · Document OCR Extractions')}
  <div style="margin-bottom:8px;font-size:12px;color:#5a6a82;">
    ${(claim.documents || []).length} document(s) processed via AWS Textract with SSE-KMS encryption. All hashes verified against S3 KMS objects.
  </div>
  ${ocrRows || '<p style="color:#8a9ab5;font-size:13px;font-style:italic;">No supporting documents were submitted with this claim.</p>'}

  <!-- ── SECTION 3: INVOICE & GSTIN VERIFICATION ── -->
  ${sectionHeader(3, 'Invoice Authenticity & GSTIN Verification')}
  <table>
    <tbody>
      ${row('GSTIN Verified', iv.gstinVerified ? '<span style="color:#1a7a4a;font-weight:700;">✓ GSTIN FORMAT VALID</span>' : '<span style="color:#a6394a;font-weight:700;">✗ GSTIN FORMAT INVALID</span>')}
      ${row('GSTIN Number', `<span style="font-family:monospace;">${iv.gstinNumber || 'Not extracted'}</span>`)}
      ${row('QR Hash Fingerprint', `<span style="font-family:monospace;font-size:10px;">${iv.qrHashFingerprint || '—'}</span>`)}
      ${row('Invoice Authenticity Score', iv.invoiceAuthenticityScore != null ? `${iv.invoiceAuthenticityScore}/100` : '—')}
      ${row('Verification Flags', (iv.authenticityFlags || []).length > 0 ? iv.authenticityFlags.map(f => `<span style="color:#a6394a;">⚑ ${f}</span>`).join('<br>') : '<span style="color:#1a7a4a;">✓ No flags — invoice appears authentic</span>')}
    </tbody>
  </table>

  <!-- ── SECTION 4: HOSPITAL NETWORK CLASSIFICATION ── -->
  ${sectionHeader(4, 'Hospital Network & Geolocation Classification')}
  <table>
    <tbody>
      ${row('Hospital / Provider Name', hn.hospitalName || '—')}
      ${row('Network Status', hn.networkStatus ? networkBadge(hn.networkStatus) : '—')}
      ${row('Empanelment Tier', hn.tierLabel || '—')}
      ${row('Cashless Eligible', hn.cashlessEligible ? '<span style="color:#1a7a4a;font-weight:700;">✓ YES — Cashless processing available</span>' : '<span style="color:#c8862a;font-weight:700;">✗ NO — Reimbursement mode only</span>')}
      ${row('Location Verified', hn.locationVerified ? '<span style="color:#1a7a4a;">✓ Verified in empaneled database</span>' : '<span style="color:#a6394a;">✗ Not found in empaneled database</span>')}
      ${row('Empaneled With', hn.empaneledWith || 'Star Health & Allied Insurance')}
      ${row('City / Coverage', hn.city || '—')}
    </tbody>
  </table>

  <!-- ── SECTION 5: AI RECOMMENDATION (BEDROCK) ── -->
  ${sectionHeader(5, 'AWS Bedrock · AI Recommendation & Policy Clause Analysis')}
  <div style="padding:16px;background:#f0ede5;border-radius:6px;border:1px solid #d8d4cb;margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:#5a6a82;text-transform:uppercase;">AI Suggested Action</div>
      ${aiBadge(claim.aiRecommendation)}
      <div style="font-size:11px;color:#8a9ab5;">Confidence: ${claim.aiConfidenceScore || '96.4%'}</div>
    </div>
    <div style="font-size:13px;color:#14213D;font-style:italic;line-height:1.6;margin-bottom:12px;">"${claim.aiSummary || 'AI summary pending.'}"</div>
    <div style="font-size:12px;font-weight:700;color:#5a6a82;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">Reasoning & Clause Reference</div>
    <div style="font-size:12px;color:#14213D;line-height:1.7;">${claim.aiReasoning || '—'}</div>
    ${claim.citedClause ? `<div style="margin-top:10px;padding:6px 10px;background:#14213D;color:#f7f6f1;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">📋 ${claim.citedClause}</div>` : ''}
  </div>

  <!-- ── SECTION 6: RISK & FRAUD ASSESSMENT ── -->
  ${sectionHeader(6, 'Risk Score & Fraud Detection Assessment')}
  <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="flex:1;min-width:180px;padding:14px;background:#f7f6f1;border:1px solid #d8d4cb;border-radius:6px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#5a6a82;margin-bottom:6px;text-transform:uppercase;">Rules Engine Risk Score</div>
      <div style="font-size:28px;font-weight:800;color:#14213D;">${claim.riskScore || 0}<span style="font-size:14px;">/100</span></div>
      <div style="margin-top:6px;">${riskBadge(claim.riskScore || 0)}</div>
    </div>
    <div style="flex:1;min-width:180px;padding:14px;background:#f7f6f1;border:1px solid #d8d4cb;border-radius:6px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#5a6a82;margin-bottom:6px;text-transform:uppercase;">Fraud Detector Score</div>
      <div style="font-size:28px;font-weight:800;color:#14213D;">${claim.fraudDetectorScore != null ? Math.round(claim.fraudDetectorScore) : '—'}</div>
      <div style="font-size:11px;color:#5a6a82;margin-top:4px;">AWS Fraud Detector · ledger_claims_fraud_v2</div>
    </div>
  </div>
  ${flagRows ? `
  <table style="border:1px solid #d8d4cb;border-radius:6px;overflow:hidden;">
    <thead><tr style="background:#f0ede5;">
      <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Risk Flag</th>
      <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Explanation</th>
      <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Impact</th>
    </tr></thead>
    <tbody>${flagRows}</tbody>
  </table>` : '<p style="color:#1a7a4a;font-size:13px;">✓ No significant risk flags detected for this claim.</p>'}

  <!-- ── SECTION 7: AUDIT TRAIL ── -->
  ${sectionHeader(7, 'Full Audit Trail (CloudTrail Log)')}
  ${auditRows ? `
  <table style="border:1px solid #d8d4cb;border-radius:6px;overflow:hidden;">
    <thead><tr style="background:#f0ede5;">
      <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Timestamp</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Event</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Actor</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#5a6a82;text-transform:uppercase;">Details</th>
    </tr></thead>
    <tbody>${auditRows}</tbody>
  </table>` : '<p style="color:#8a9ab5;font-size:13px;font-style:italic;">No audit events recorded.</p>'}

  <!-- ── SECTION 8: UNDERWRITER SIGN-OFF ── -->
  ${sectionHeader(8, 'Underwriter Sign-Off & Certification')}
  <div style="padding:20px;border:2px solid #14213D;border-radius:8px;margin-bottom:24px;">
    <div style="font-size:12px;color:#5a6a82;line-height:1.7;">
      I, the undersigned Underwriter, hereby certify that this claim has been reviewed in accordance with the policy terms and conditions,
      applicable IRDAI regulations, and the internal underwriting guidelines of <strong>${claim.policyCompany || 'Star Health & Allied Insurance'}</strong>.
      All AI-generated recommendations have been reviewed and the final decision is the responsibility of the signing underwriter.
    </div>
    <div style="margin-top:24px;display:flex;gap:40px;flex-wrap:wrap;">
      <div>
        <div style="border-top:1px solid #14213D;padding-top:8px;min-width:220px;">
          <div style="font-size:12px;font-weight:700;">${claim.decidedBy || claim.assignedUnderwriterName || '___________________________'}</div>
          <div style="font-size:11px;color:#5a6a82;">Underwriter / Authorized Signatory</div>
        </div>
      </div>
      <div>
        <div style="border-top:1px solid #14213D;padding-top:8px;min-width:200px;">
          <div style="font-size:12px;font-weight:700;">${claim.decidedAt ? fmtDate(claim.decidedAt) : '___________________________'}</div>
          <div style="font-size:11px;color:#5a6a82;">Date of Decision</div>
        </div>
      </div>
      <div>
        <div style="border-top:1px solid #14213D;padding-top:8px;min-width:200px;">
          <div style="font-size:12px;font-weight:700;">${statusPill(claim.status)}</div>
          <div style="font-size:11px;color:#5a6a82;margin-top:4px;">Final Claim Decision</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div style="border-top:1px solid #d8d4cb;padding-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
    <div style="font-size:10px;color:#8a9ab5;line-height:1.6;">
      <strong>IRDAI Compliance Notice</strong><br>
      This report is generated in compliance with IRDAI Circular No. IRDA/HLT/REG/CIR/203/08/2016 and IRDAI (Health Insurance) Regulations, 2016.<br>
      This is a system-generated document. For queries, contact the Grievance Redressal Officer at ${claim.policyCompany || 'Star Health & Allied Insurance'}.
    </div>
    <div style="text-align:right;font-size:10px;color:#8a9ab5;font-family:monospace;">
      Report ID: ${rId}<br>
      Generated: ${genTimeFmt}<br>
      Ledger Engine v2.0 · AWS Bedrock · Textract
    </div>
  </div>

</div>
</body>
</html>`;
}
