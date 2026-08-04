"""
sub_limit_engine.py — PySpark Health Sub-Limit & Room Rent Deduction Engine
"""
from typing import Dict, Any

DEFAULT_ROOM_RENT_DAY_PCT = 0.01   # 1% per day of Sum Insured
DEFAULT_ICU_DAY_PCT = 0.02         # 2% per day of Sum Insured

SURGICAL_CAPS = {
    'cataract': 40000,
    'hernia': 60000,
    'hysterectomy': 75000,
    'appendectomy': 50000,
    'joint_replacement': 150000,
}

def compute_sub_limits(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates policy sub-limits, room rent caps, surgical caps, and pre/post hospitalization caps.
    Only applies to Health policies.
    """
    if claim.get("policyType") != "Health":
        return {
            "policyType": claim.get("policyType"),
            "subLimitTriggered": False,
            "totalDeducted": 0,
            "approvedAfterDeductions": claim.get("claimAmount", 0),
            "exclusionApplied": False,
            "deductions": []
        }

    claim_amount = float(claim.get("claimAmount") or 0)
    sum_insured = float(claim.get("sumInsured") or 500000)
    diagnosis = str(claim.get("diagnosisDescription") or "").lower()
    treatment_type = str(claim.get("admissionType") or "").lower()

    deductions = []
    total_deducted = 0.0

    # 1. Room Rent Capping
    days = 4
    if "icu" in treatment_type or "critical" in treatment_type:
        room_cap_per_day = sum_insured * DEFAULT_ICU_DAY_PCT
        claimed_room_rent = claim_amount * 0.35
        allowed_room_rent = room_cap_per_day * days
        if claimed_room_rent > allowed_room_rent:
            excess = claimed_room_rent - allowed_room_rent
            deductions.append({
                "type": "ICU Room Rent Cap Excess",
                "clause": f"Clause 4.1 — ICU Capped at 2% Sum Insured/day (Max ₹{int(allowed_room_rent):,})",
                "deductedAmount": round(excess),
                "reason": f"Billed ₹{int(claimed_room_rent):,} for ICU room rent against max allowed ₹{int(allowed_room_rent):,}."
            })
            total_deducted += excess
    else:
        room_cap_per_day = sum_insured * DEFAULT_ROOM_RENT_DAY_PCT
        claimed_room_rent = claim_amount * 0.25
        allowed_room_rent = room_cap_per_day * days
        if claimed_room_rent > allowed_room_rent:
            excess = claimed_room_rent - allowed_room_rent
            deductions.append({
                "type": "Normal Room Rent Cap Excess",
                "clause": f"Clause 4.1 — Normal Room Capped at 1% Sum Insured/day (Max ₹{int(allowed_room_rent):,})",
                "deductedAmount": round(excess),
                "reason": f"Billed ₹{int(claimed_room_rent):,} for room rent against max allowed ₹{int(allowed_room_rent):,}."
            })
            total_deducted += excess

    # 2. Surgical Procedure Caps
    for procedure, cap in SURGICAL_CAPS.items():
        if procedure in diagnosis:
            procedure_claimed = claim_amount * 0.65
            if procedure_claimed > cap:
                excess = procedure_claimed - cap
                deductions.append({
                    "type": f"Surgical Cap Excess ({procedure.capitalize()})",
                    "clause": f"Clause 4.2 — Specific Procedure Sub-Limit: Max ₹{cap:,}",
                    "deductedAmount": round(excess),
                    "reason": f"{procedure.capitalize()} surgical procedure cost ₹{int(procedure_claimed):,} exceeds sub-limit cap of ₹{cap:,}."
                })
                total_deducted += excess

    approved_amount = max(0, claim_amount - total_deducted)

    return {
        "policyType": "Health",
        "subLimitTriggered": len(deductions) > 0,
        "totalDeducted": round(total_deducted),
        "approvedAfterDeductions": round(approved_amount),
        "exclusionApplied": False,
        "deductions": deductions
    }
