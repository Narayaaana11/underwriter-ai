"""
co_pay_engine.py — PySpark Co-Payment & Zone Deductible Calculator
"""
from typing import Dict, Any

def compute_co_pay(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes Senior Citizen Co-Pay (15% if age >= 60) and Zonal Deductibles (10% for Zone B/C treatments).
    Only applies to Health policies.
    """
    if claim.get("policyType") != "Health":
        return {
            "coPayTriggered": False,
            "effectiveCoPayPct": 0,
            "totalCoPayDeduction": 0,
            "coPayDeductions": []
        }

    claimant_age = int(claim.get("claimantAge") or 42)
    hospital_name = str(claim.get("hospitalName") or "").lower()
    claim_amount = float(claim.get("claimAmount") or 0)

    co_pay_pct = 0
    co_pay_deductions = []

    # Senior Citizen Co-Pay (Age >= 60)
    is_senior = claimant_age >= 60
    if is_senior:
        co_pay_pct += 15
        deduction_amt = claim_amount * 0.15
        co_pay_deductions.append({
            "type": "Senior Citizen Co-Payment (15%)",
            "clause": "Clause 5.1 — Mandatory 15% Co-Pay for Policyholders Aged 60 and Above",
            "deductedAmount": round(deduction_amt),
            "reason": f"Claimant age {claimant_age} triggers mandatory 15% Senior Citizen co-payment."
        })

    # Zone Deductible (Zone B / Non-metro hospital under Zone A policy)
    is_zone_b = any(city in hospital_name for city in ['pune', 'jaipur', 'ahmedabad', 'lucknow', 'indore', 'nagpur'])
    if is_zone_b and not is_senior:
        co_pay_pct += 10
        deduction_amt = claim_amount * 0.10
        co_pay_deductions.append({
            "type": "Zonal Co-Payment (10%)",
            "clause": "Clause 5.2 — 10% Co-Payment for Treatment in Zone B Hospital under Zone A Policy",
            "deductedAmount": round(deduction_amt),
            "reason": f"Hospital located in Zone B triggers 10% zonal co-payment."
        })

    total_co_pay = sum(d["deductedAmount"] for d in co_pay_deductions)

    return {
        "coPayTriggered": len(co_pay_deductions) > 0,
        "claimantAge": claimant_age,
        "isSeniorCitizen": is_senior,
        "policyZone": "Zone A (Metro)",
        "effectiveCoPayPct": co_pay_pct,
        "totalCoPayDeduction": round(total_co_pay),
        "coPayDeductions": co_pay_deductions
    }
