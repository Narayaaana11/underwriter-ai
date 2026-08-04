"""
risk_engine.py — PySpark Risk Scoring & Fraud Detector Blend Engine
"""
from typing import Dict, Any, Tuple, List

def calculate_risk_score(claim: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Computes comprehensive risk score (0-100) and extracts risk flags.
    """
    score = 0
    flags = []

    claim_amount = float(claim.get("claimAmount") or 0)
    sum_insured = float(claim.get("sumInsured") or 1)
    ratio = claim_amount / max(sum_insured, 1.0)

    # 1. High claim ratio flag
    if ratio > 0.8:
        score += 35
        flags.append({
            "flag": "HIGH_CLAIM_SUM_RATIO",
            "severity": "alert",
            "explanation": f"Claim amount ₹{int(claim_amount):,} is {int(ratio * 100)}% of total sum insured."
        })
    elif ratio > 0.5:
        score += 15
        flags.append({
            "flag": "MODERATE_CLAIM_RATIO",
            "severity": "warning",
            "explanation": f"Claim amount ₹{int(claim_amount):,} is {int(ratio * 100)}% of sum insured."
        })

    # 2. Document count check
    docs = claim.get("documents") or []
    if len(docs) < 2:
        score += 25
        flags.append({
            "flag": "INSUFFICIENT_DOCUMENTATION",
            "severity": "warning",
            "explanation": "Only 1 supporting document uploaded. Minimum 2 required for auto-approval."
        })

    # 3. New policy claim
    start_date = claim.get("policyStartDate") or ""
    incident_date = claim.get("incidentDate") or ""
    if start_date and incident_date:
        try:
            from datetime import datetime
            dt1 = datetime.strptime(start_date, "%Y-%m-%d")
            dt2 = datetime.strptime(incident_date, "%Y-%m-%d")
            days = (dt2 - dt1).days
            if days < 45:
                score += 30
                flags.append({
                    "flag": "EARLY_POLICY_CLAIM",
                    "severity": "alert",
                    "explanation": f"Claim filed within {days} days of policy inception."
                })
        except Exception:
            pass

    # 4. Hospital network verification
    hosp_info = claim.get("hospitalNetworkInfo") or {}
    if hosp_info and not hosp_info.get("empaneled"):
        score += 20
        flags.append({
            "flag": "NON_EMPANELED_HOSPITAL",
            "severity": "warning",
            "explanation": "Hospital is not in insurer's PPN empaneled database."
        })

    final_score = min(100, max(0, score))
    return final_score, flags


def blend_fraud_score(risk_score: int, fraud_detector_score: float) -> Tuple[int, str]:
    """
    Blends rules-based risk score with AWS Fraud Detector model probability.
    """
    if fraud_detector_score is None:
        blended = risk_score
    else:
        blended = int(round(risk_score * 0.6 + (fraud_detector_score * 100) * 0.4))

    if blended < 20:
        rec = "Approve"
    elif blended < 50:
        rec = "Investigate"
    elif blended < 75:
        rec = "Escalate"
    else:
        rec = "Reject"

    return blended, rec
