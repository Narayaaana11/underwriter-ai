"""
tariff_engine.py — PySpark GIPSA / PPN Package Tariff Benchmarking Engine
"""
from typing import Dict, Any

GIPSA_TARIFF_BENCHMARKS = {
    'laparoscopic appendectomy': {'metro': 85000, 'nonMetro': 60000},
    'appendectomy': {'metro': 75000, 'nonMetro': 55000},
    'cataract surgery': {'metro': 35000, 'nonMetro': 25000},
    'hernia repair': {'metro': 55000, 'nonMetro': 40000},
    'caesarean delivery': {'metro': 65000, 'nonMetro': 45000},
    'angioplasty': {'metro': 180000, 'nonMetro': 140000},
}

def analyze_gipsa_tariff(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates billed hospital package tariffs against GIPSA PPN agreed rates.
    Only applies to Health policies.
    """
    if claim.get("policyType") != "Health":
        return {
            "tariffApplied": False,
            "tariffExcess": 0,
            "benchmarkTariff": None,
            "billedAmount": claim.get("claimAmount", 0),
            "reason": "Non-Health policy — GIPSA PPN package tariffs not applicable."
        }

    diagnosis = str(claim.get("diagnosisDescription") or "").lower()
    hospital = str(claim.get("hospitalName") or "").lower()
    billed = float(claim.get("claimAmount") or 0)

    is_metro = any(city in hospital for city in ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'])

    matched_procedure = None
    benchmark_tariff = None

    for proc, rates in GIPSA_TARIFF_BENCHMARKS.items():
        if proc in diagnosis or any(term in diagnosis for term in proc.split()):
            matched_procedure = proc
            benchmark_tariff = rates['metro'] if is_metro else rates['nonMetro']
            break

    if not benchmark_tariff:
        return {
            "tariffApplied": False,
            "tariffExcess": 0,
            "benchmarkTariff": None,
            "billedAmount": billed,
            "reason": "Procedure not under mandatory GIPSA PPN package tariff schedule."
        }

    excess = max(0, billed - benchmark_tariff)

    return {
        "tariffApplied": True,
        "procedureName": matched_procedure.title(),
        "isMetroZone": is_metro,
        "benchmarkTariff": benchmark_tariff,
        "billedAmount": billed,
        "tariffExcess": round(excess),
        "reason": f"GIPSA PPN Agreed Package Rate for {matched_procedure.title()} ({'Metro' if is_metro else 'Tier 2/3'}) is ₹{benchmark_tariff:,}. Billed ₹{int(billed):,}."
    }
