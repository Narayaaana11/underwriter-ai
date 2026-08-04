"""
ped_engine.py — PySpark Pre-Existing Disease (PED) & Waiting Period Analyzer
"""
from typing import Dict, Any
from datetime import datetime

PED_KEYWORDS = {
    'diabetes': {'waitingMonths': 24, 'clause': 'Clause 3.1 — 24 Months Waiting Period for Pre-Existing Diabetes Mellitus'},
    'hypertension': {'waitingMonths': 24, 'clause': 'Clause 3.2 — 24 Months Waiting Period for Pre-Existing Hypertension'},
    'thyroid': {'waitingMonths': 24, 'clause': 'Clause 3.3 — 24 Months Waiting Period for Pre-Existing Thyroid Disorders'},
    'asthma': {'waitingMonths': 36, 'clause': 'Clause 3.4 — 36 Months Waiting Period for Pre-Existing Asthma'},
    'cardiac': {'waitingMonths': 48, 'clause': 'Clause 3.5 — 48 Months Waiting Period for Pre-Existing Cardiac Conditions'},
    'cataract': {'waitingMonths': 24, 'clause': 'Clause 3.6 — 24 Months Specified Disease Waiting Period'},
}

def analyze_ped(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates Pre-Existing Diseases against policy start date & waiting period rules.
    Only applies to Health policies.
    """
    if claim.get("policyType") != "Health":
        return {
            "hasViolation": False,
            "exclusionApplied": False,
            "violations": [],
            "policyAgeMonths": 0
        }

    diagnosis = str(claim.get("diagnosisDescription") or "").lower()
    start_date_str = claim.get("policyStartDate") or "2024-01-01"
    incident_date_str = claim.get("incidentDate") or datetime.now().strftime("%Y-%m-%d")

    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        incident_dt = datetime.strptime(incident_date_str, "%Y-%m-%d")
        policy_age_months = max(1, (incident_dt.year - start_dt.year) * 12 + (incident_dt.month - start_dt.month))
    except Exception:
        policy_age_months = 12

    violations = []
    exclusion_applied = False

    for condition, meta in PED_KEYWORDS.items():
        if condition in diagnosis:
            required_months = meta['waitingMonths']
            if policy_age_months < required_months:
                exclusion_applied = True
                violations.append({
                    "condition": condition.capitalize(),
                    "waitingPeriodRequiredMonths": required_months,
                    "policyAgeMonths": policy_age_months,
                    "clause": meta['clause'],
                    "status": "EXCLUSION_TRIGGERED",
                    "reason": f"{condition.capitalize()} claimed at month {policy_age_months} before mandatory {required_months}-month waiting period."
                })

    return {
        "hasViolation": len(violations) > 0,
        "exclusionApplied": exclusion_applied,
        "policyAgeMonths": policy_age_months,
        "violations": violations
    }
