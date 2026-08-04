import math
from datetime import datetime

def calculate_risk_score(claim: dict) -> dict:
    score = 0
    flags = []

    try:
        policy_start = datetime.strptime(claim.get("policyStartDate", "2025-01-01"), "%Y-%m-%d")
        incident = datetime.strptime(claim.get("incidentDate", "2025-01-01"), "%Y-%m-%d")
        days = (incident - policy_start).days
    except Exception:
        days = 100

    # Rule 1 & 2: Incident timing relative to policy start
    if 0 <= days < 30:
        score += 40
        flags.append({
            "flag": "possible waiting-period violation",
            "impact": 40,
            "severity": "alert",
            "explanation": f"Incident occurred {days} days after policy start (under mandatory 30-day waiting threshold)."
        })
    elif 30 <= days < 90:
        score += 15
        flags.append({
            "flag": "within early-claim window",
            "impact": 15,
            "severity": "warning",
            "explanation": f"Incident occurred {days} days after policy inception (early claim window < 90 days)."
        })

    # Rule 3 & 4: Claim amount vs Sum Insured
    sum_insured = float(claim.get("sumInsured") or 1)
    claim_amount = float(claim.get("claimAmount") or 0)
    ratio = claim_amount / sum_insured if sum_insured > 0 else 0

    if ratio > 0.90:
        score += 30
        flags.append({
            "flag": "unusually high vs sum insured",
            "impact": 30,
            "severity": "alert",
            "explanation": f"Claim amount (₹{claim_amount:,.0f}) represents {(ratio * 100):.1f}% of total policy sum insured (₹{sum_insured:,.0f})."
        })
    elif ratio > 0.60:
        score += 10
        flags.append({
            "flag": "substantial proportion of sum insured",
            "impact": 10,
            "severity": "warning",
            "explanation": f"Claim amount (₹{claim_amount:,.0f}) represents {(ratio * 100):.1f}% of sum insured (₹{sum_insured:,.0f})."
        })

    # Rule 5: Supporting documents count
    docs = claim.get("documents") or []
    doc_count = len(docs) if isinstance(docs, list) else 0
    if doc_count < 2:
        score += 15
        flags.append({
            "flag": "may be insufficient for verification",
            "impact": 15,
            "severity": "warning",
            "explanation": f"Only {doc_count} supporting document(s) provided. Minimum 2 required for standard automatic verification."
        })

    # Rule 6: Description brevity
    desc = (claim.get("description") or "").strip()
    word_count = len([w for w in desc.split() if w])
    if word_count < 12:
        score += 10
        flags.append({
            "flag": "very brief, may need follow-up",
            "impact": 10,
            "severity": "warning",
            "explanation": f"Description contains only {word_count} words, which is below the recommended detail length."
        })

    final_score = min(100, max(0, score))
    band = "low"
    color = "#3E6E5B"
    if final_score >= 50:
        band = "high"
        color = "#A6394A"
    elif final_score >= 20:
        band = "medium"
        color = "#C8862A"

    return {
        "riskScore": final_score,
        "riskBand": band,
        "color": color,
        "riskFlags": flags
    }

def blend_fraud_score(rule_score: int, fraud_score: float = None) -> int:
    if fraud_score is None:
        return rule_score
    return round((rule_score * 0.6) + (fraud_score * 0.4))
