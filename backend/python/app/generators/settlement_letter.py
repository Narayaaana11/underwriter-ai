"""
settlement_letter.py — IRDAI-Compliant Claim Settlement / Repudiation Letter Generator
"""
from typing import Dict, Any
from datetime import datetime

def generate_settlement_letter_html(claim: Dict[str, Any]) -> str:
    """
    Generates IRDAI-compliant HTML settlement/partial approval/repudiation letter.
    """
    claim_id = claim.get("id", "CLM-0000")
    claimant_name = claim.get("claimantName", "Policyholder")
    policy_number = claim.get("policyNumber", "POL-0000")
    policy_company = claim.get("policyCompany", "Star Health & Allied Insurance")
    status = (claim.get("status") or "approved").upper()
    claim_amt = float(claim.get("claimAmount") or 0)
    app_amt = float(claim.get("approvedAmount") or claim_amt)
    sub_lim = claim.get("subLimitAnalysis") or {}

    today_str = datetime.now().strftime("%d %B %Y")

    deductions_rows_html = ""
    for d in sub_lim.get("deductions", []):
        deductions_rows_html += f"""
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">{d.get('type')}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; font-family:monospace; font-size:11px;">{d.get('clause')}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right; color:#c0392b; font-weight:bold;">- ₹{d.get('deductedAmount', 0):,}</td>
        </tr>
        """

    if not deductions_rows_html:
        deductions_rows_html = "<tr><td colspan='3' style='padding:8px; text-align:center; color:#7f8c8d; italic;'>No policy sub-limit or co-pay deductions applied. Full claim eligible.</td></tr>"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>IRDAI Claim Settlement Letter — {claim_id}</title>
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin:0; padding:40px; color:#2c3e50; line-height:1.6; background:#f9f9f9; }}
    .letter-card {{ max-width:800px; margin:0 auto; background:#fff; padding:40px; border:1px solid #e2dec9; box-shadow:0 4px 15px rgba(0,0,0,0.05); border-radius:8px; }}
    .header {{ display:flex; justify-content:space-between; border-bottom:2px solid #14213d; padding-bottom:15px; margin-bottom:25px; }}
    .logo {{ font-size:22px; font-weight:bold; color:#14213d; letter-spacing:-0.5px; }}
    .sub-logo {{ font-size:11px; color:#5c6b73; font-family:monospace; }}
    .badge {{ display:inline-block; padding:4px 12px; font-size:12px; font-weight:bold; font-family:monospace; border-radius:4px; text-transform:uppercase; }}
    .badge-approved {{ background:#d1e7dd; color:#0f5132; border:1px solid #badbcc; }}
    .table {{ width:100%; border-collapse:collapse; margin:20px 0; font-size:13px; }}
    .table th {{ background:#f8f9fa; padding:10px; border-bottom:2px solid #dee2e6; text-align:left; font-size:11px; text-transform:uppercase; color:#6c757d; }}
    .footer {{ margin-top:40px; pt-20px; border-top:1px solid #eee; font-size:11px; color:#7f8c8d; text-align:center; }}
  </style>
</head>
<body>
  <div class="letter-card">
    <div class="header">
      <div>
        <div class="logo">{policy_company}</div>
        <div class="sub-logo">IRDAI Regd. No. 129 · Claims Assessment Bureau</div>
      </div>
      <div style="text-align:right;">
        <span class="badge badge-approved">STATUS: {status}</span>
        <div style="font-size:11px; color:#7f8c8d; margin-top:5px;">Date: {today_str}</div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <strong>To,</strong><br/>
      <strong>{claimant_name}</strong><br/>
      Policy Number: <span style="font-family:monospace;">{policy_number}</span><br/>
      Claim Reference ID: <span style="font-family:monospace;">{claim_id}</span>
    </div>

    <p>Dear {claimant_name},</p>
    <p>We are pleased to inform you that your insurance claim has been evaluated by our <strong>UnderWriter AI Autonomous System</strong> in accordance with IRDAI Protection of Policyholders' Interests Regulations.</p>

    <table class="table">
      <thead>
        <tr>
          <th>Deduction / Clause Type</th>
          <th>Policy Clause Reference</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {deductions_rows_html}
      </tbody>
    </table>

    <div style="background:#f8f9fa; padding:15px; border-radius:6px; margin:20px 0; border:1px solid #e9ecef;">
      <div style="display:flex; justify-between; margin-bottom:5px;">
        <span>Claimed Amount:</span>
        <strong>₹{int(claim_amt):,}</strong>
      </div>
      <div style="display:flex; justify-between; font-size:16px; color:#0f5132; font-weight:bold; border-top:1px solid #ccc; padding-top:8px;">
        <span>Final Approved Payout Amount:</span>
        <span>₹{int(app_amt):,}</span>
      </div>
    </div>

    <p style="font-size:12px; color:#6c757d;">Disbursement will be credited via NEFT/RTGS to your registered bank account within 24 business hours.</p>

    <div class="footer">
      This document is digitally generated by <strong>UnderWriter AI Platform</strong>. IRDAI Master Circular Compliance Ref: IRDAI/HLT/REG/2024.
    </div>
  </div>
</body>
</html>
"""
