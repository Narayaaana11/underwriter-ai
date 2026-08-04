/**
 * settlementLetterGenerator.js
 * Generates official IRDAI-compliant Claim Settlement Vouchers (Approval Vouchers)
 * and Formal Rejection / Denial Letters with itemized clause-by-clause deduction breakdowns.
 */

export function generateSettlementLetterHTML(claim) {
  const isApproved = ['approved', 'disbursed'].includes(claim.status);
  const isPartial = isApproved && claim.approvedAmount != null && claim.approvedAmount < claim.claimAmount;
  const isRejected = claim.status === 'rejected';

  const company = claim.policyCompany || 'Star Health & Allied Insurance Co. Ltd.';
  const claimId = claim.id;
  const claimant = claim.claimantName;
  const policyNo = claim.policyNumber;
  const claimAmt = Number(claim.claimAmount) || 0;
  const approvedAmt = claim.approvedAmount != null ? Number(claim.approvedAmount) : isApproved ? claimAmt : 0;
  const deductedAmt = claimAmt - approvedAmt;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const subLimits = claim.subLimitAnalysis?.deductions || [];
  const coPay = claim.coPayAnalysis?.coPayDeductions || [];
  const gipsa = claim.tariffAnalysis?.tariffExcess > 0 ? [claim.tariffAnalysis] : [];
  const pedViolations = claim.pedAnalysis?.violations || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${isApproved ? 'Claim Settlement Voucher' : 'Claim Denial Letter'} — ${claimId}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 850px; margin: 0 auto; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
  .logo-text { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .logo-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 20px; font-weight: 700; margin: 0; color: ${isRejected ? '#b91c1c' : '#15803d'}; }
  .doc-title p { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; font-size: 13px; }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
  .meta-val { font-weight: 600; color: #0f172a; margin-top: 2px; }
  .amount-box { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; background: #0f172a; color: #fff; border-radius: 8px; padding: 18px; margin-bottom: 25px; }
  .amt-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
  .amt-val { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
  .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .table th { background: #f1f5f9; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 11px; }
  .alert-box { background: ${isRejected ? '#fef2f2' : '#f0fdf4'}; border-left: 4px solid ${isRejected ? '#ef4444' : '#22c55e'}; padding: 15px; border-radius: 4px; margin-bottom: 25px; font-size: 13px; color: ${isRejected ? '#991b1b' : '#166534'}; }
  .footer { margin-top: 40px; padding-top: 20px; border-t: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo-text">${company}</div>
    <div class="logo-sub">IRDAI Registration No. 108 / Health & General Underwriting Division</div>
  </div>
  <div class="doc-title">
    <h1>${isRejected ? 'OFFICIAL CLAIM DENIAL ADVICE' : isPartial ? 'PARTIAL CLAIM SETTLEMENT VOUCHER' : 'CLAIM SETTLEMENT VOUCHER'}</h1>
    <p>Date of Issue: ${dateStr}</p>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><span class="meta-label">Claim Reference ID</span><span class="meta-val">${claimId}</span></div>
  <div class="meta-item"><span class="meta-label">Policy Number</span><span class="meta-val">${policyNo}</span></div>
  <div class="meta-item"><span class="meta-label">Policyholder Name</span><span class="meta-val">${claimant}</span></div>
  <div class="meta-item"><span class="meta-label">Policy Type / Coverage</span><span class="meta-val">${claim.policyType} (${claim.policyCompany || 'Star Health'})</span></div>
  <div class="meta-item"><span class="meta-label">Date of Incident</span><span class="meta-val">${claim.incidentDate}</span></div>
  <div class="meta-item"><span class="meta-label">Assigned Underwriter</span><span class="meta-val">${claim.assignedUnderwriterName || 'Senior Claims Committee'}</span></div>
</div>

<div class="amount-box">
  <div><div class="amt-label">Total Claimed</div><div class="amt-val">₹${claimAmt.toLocaleString('en-IN')}</div></div>
  <div><div class="amt-label">Total Deductions</div><div class="amt-val" style="color: #f87171;">- ₹${deductionsTotal(claim).toLocaleString('en-IN')}</div></div>
  <div><div class="amt-label">Net Payable Amount</div><div class="amt-val" style="color: ${approvedAmt > 0 ? '#4ade80' : '#f87171'};">₹${approvedAmt.toLocaleString('en-IN')}</div></div>
</div>

<div class="alert-box">
  <strong>Decision Summary:</strong> ${isRejected
    ? `Your claim reference ${claimId} has been formally rejected following Underwriting & Medical Audit review.`
    : isPartial
    ? `Your claim reference ${claimId} has been partially approved for ₹${approvedAmt.toLocaleString('en-IN')} subject to policy sub-limits & co-pay deductions listed below.`
    : `Your claim reference ${claimId} has been approved in full for ₹${approvedAmt.toLocaleString('en-IN')}.`}
</div>

${(subLimits.length > 0 || coPay.length > 0 || gipsa.length > 0 || pedViolations.length > 0) ? `
<h3>Itemized Deductions & Policy Clause Breakdown</h3>
<table class="table">
  <thead>
    <tr>
      <th>Deduction Type</th>
      <th>Applicable Policy Clause</th>
      <th>Deducted Amount</th>
      <th>Underwriter Explanation</th>
    </tr>
  </thead>
  <tbody>
    ${subLimits.map(d => `
      <tr>
        <td><strong>${d.type}</strong></td>
        <td><code>${d.clause}</code></td>
        <td style="color:#dc2626; font-weight:bold;">- ₹${d.deductedAmount.toLocaleString('en-IN')}</td>
        <td>${d.reason}</td>
      </tr>
    `).join('')}
    ${coPay.map(d => `
      <tr>
        <td><strong>${d.type}</strong></td>
        <td><code>${d.clause}</code></td>
        <td style="color:#dc2626; font-weight:bold;">- ₹${d.deductedAmount.toLocaleString('en-IN')}</td>
        <td>${d.reason}</td>
      </tr>
    `).join('')}
    ${gipsa.map(d => `
      <tr>
        <td><strong>GIPSA Package Tariff Cap</strong></td>
        <td><code>${d.clause}</code></td>
        <td style="color:#dc2626; font-weight:bold;">- ₹${d.tariffExcess.toLocaleString('en-IN')}</td>
        <td>${d.reason}</td>
      </tr>
    `).join('')}
    ${pedViolations.map(d => `
      <tr>
        <td><strong>${d.title}</strong></td>
        <td><code>${d.clause}</code></td>
        <td style="color:#dc2626; font-weight:bold;">100% Non-Payable</td>
        <td>${d.detail}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
` : ''}

<div style="font-size: 11px; color: #64748b; margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px;">
  <strong>IRDAI Grievance Redressal Notice:</strong> If you are dissatisfied with this decision, you have the right to represent your case to the Insurer's Grievance Redressal Officer within 30 days. Under IRDAI (Protection of Policyholders' Interests) Regulations, 2017, you may also approach the Insurance Ombudsman in your jurisdiction.
</div>

<div class="footer">
  <div>Digitally Signed by Ledger AI Underwriting Platform v2.0</div>
  <div>Page 1 of 1 · Confidentially Generated</div>
</div>

</body>
</html>`;
}

function deductionsTotal(claim) {
  const claimAmt = Number(claim.claimAmount) || 0;
  const approvedAmt = claim.approvedAmount != null ? Number(claim.approvedAmount) : ['approved', 'disbursed'].includes(claim.status) ? claimAmt : 0;
  return Math.max(0, claimAmt - approvedAmt);
}
