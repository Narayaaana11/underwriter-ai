"""
universal_engine.py — PySpark Multi-Line Policy Evaluation Engine
Handles policy clause evaluation across Health, Motor, Life, Property, and Travel claims.
"""
from typing import Dict, Any

def evaluate_universal_policy(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates policy conditions and deductions based on policy line of business.
    """
    policy_type = claim.get("policyType", "Health")
    claim_amount = float(claim.get("claimAmount") or 0)
    sum_insured = float(claim.get("sumInsured") or 500000)

    deductions = []
    exclusion_applied = False

    if policy_type == "Motor":
        idv = sum_insured
        is_total_loss = claim_amount >= (0.75 * idv)
        has_zero_dep = bool(claim.get("zeroDepAddon", True))

        if not has_zero_dep and not is_total_loss:
            dep_deduction = claim_amount * 0.15
            deductions.append({
                "type": "Standard Metal & Rubber Depreciation (15%)",
                "clause": "Motor Tariff Section 3 — Depreciation Scale for Non-Zero-Dep Policies",
                "deductedAmount": round(dep_deduction),
                "reason": "Standard tariff depreciation applied on replaced spare parts."
            })

        return {
            "policyType": "Motor",
            "idv": idv,
            "isTotalLoss": is_total_loss,
            "hasZeroDepAddon": has_zero_dep,
            "exclusionApplied": False,
            "deductions": deductions
        }

    elif policy_type == "Life":
        policy_age_months = int(claim.get("policyAgeMonths") or 24)
        is_early_claim = policy_age_months < 36

        if is_early_claim and "suicide" in str(claim.get("causeOfDeath") or "").lower():
            exclusion_applied = True
            deductions.append({
                "type": "Section 45 Life Exclusion",
                "clause": "Section 45 Insurance Act — Suicide Exclusion within 1 Year / Contestability Window",
                "deductedAmount": round(claim_amount),
                "reason": "Claim repudiated under early policy contestability guidelines."
            })

        return {
            "policyType": "Life",
            "sumAssured": sum_insured,
            "policyAgeMonths": policy_age_months,
            "isEarlyClaim": is_early_claim,
            "exclusionApplied": exclusion_applied,
            "deductions": deductions
        }

    elif policy_type == "Property":
        under_insurance_ratio = min(1.0, sum_insured / max(1.0, float(claim.get("propertyValue") or sum_insured)))
        if under_insurance_ratio < 0.85:
            under_ins_deduction = claim_amount * (1.0 - under_insurance_ratio)
            deductions.append({
                "type": "Condition of Average (Under-Insurance Penalty)",
                "clause": "Fire Tariff Clause 8 — Proportional Reduction for Property Value Under-Declaration",
                "deductedAmount": round(under_ins_deduction),
                "reason": f"Property under-insured by {int((1 - under_insurance_ratio) * 100)}%. Claim reduced proportionally."
            })

        return {
            "policyType": "Property",
            "sumInsured": sum_insured,
            "underInsuranceRatio": under_insurance_ratio,
            "exclusionApplied": False,
            "deductions": deductions
        }

    elif policy_type == "Travel":
        has_medical_extension = bool(claim.get("medicalExtension", True))
        if not has_medical_extension and "medical" in str(claim.get("incidentType") or "").lower():
            exclusion_applied = True
            deductions.append({
                "type": "Overseas Medical Extension Exclusion",
                "clause": "Travel Policy Section 2 — Overseas Emergency Medical Coverage Not Selected",
                "deductedAmount": round(claim_amount),
                "reason": "Claim repudiated: Policy does not carry Overseas Medical Emergency Rider."
            })

        return {
            "policyType": "Travel",
            "sumInsured": sum_insured,
            "hasMedicalExtension": has_medical_extension,
            "exclusionApplied": exclusion_applied,
            "deductions": deductions
        }

    # Default / Health
    return {
        "policyType": policy_type,
        "exclusionApplied": False,
        "deductions": []
    }
