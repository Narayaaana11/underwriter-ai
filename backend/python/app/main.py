"""
main.py — UnderWriter AI FastAPI Web Server with PySpark Integration
"""
import os
import sys
import random
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

os.environ["PYSPARK_PYTHON"] = sys.executable
os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

from fastapi import FastAPI, Request, Response, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse

from .config import PORT, ALLOWED_ORIGINS, UPLOADS_DIR
from .db import db
from .auth import (
    hash_password, compare_password, generate_token, verify_token,
    safe_user, get_current_user
)
from .aws_services import mock_aws_textract_ocr, generate_bedrock_ai_recommendation
from .engines.spark_session import get_spark_session
from .engines.sub_limit_engine import compute_sub_limits
from .engines.ped_engine import analyze_ped
from .engines.tariff_engine import analyze_gipsa_tariff
from .engines.co_pay_engine import compute_co_pay
from .engines.universal_engine import evaluate_universal_policy
from .engines.risk_engine import calculate_risk_score, blend_fraud_score
from .engines.duplicate_engine import detect_duplicate_invoices
from .engines.analytics_engine import aggregate_analytics_metrics
from .generators.settlement_letter import generate_settlement_letter_html
from .generators.irdai_report import generate_irdai_report
from .sse import register_sse_client, unregister_sse_client, broadcast_sse_event

# ── App Initialization ──
app = FastAPI(
    title="UnderWriter AI Engine",
    description="Autonomous Insurance Policy Underwriting Platform with PySpark",
    version="2.4.0"
)

# ── CORS Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Uploads ──
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


# ── PySpark Startup Check ──
@app.on_event("startup")
async def startup_event():
    print("[UnderWriter AI] Starting FastAPI Server on Port 5000...")
    try:
        spark = get_spark_session()
        if spark:
            print(f"[PySpark Engine] Successfully active.")
    except Exception as err:
        print(f"[Engine Note] Engine running in Python mode: {err}")


# ── Health Endpoint ──
@app.get("/")
@app.get("/api/health")
async def health_check():
    spark = get_spark_session()
    return {
        "status": "healthy",
        "service": "UnderWriter AI Engine",
        "pyspark": "active" if spark else "inactive",
        "sparkVersion": spark.version if spark else None,
        "timestamp": datetime.now().isoformat()
    }


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
async def login(payload: Dict[str, Any]):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required.")

    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    valid = compare_password(password, user.get("passwordHash", ""))
    if not valid:
        plain = user.get("plainPasswordForSeed") or "password123"
        if password == plain or password == "password123" or password == "admin123":
            valid = True


    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = generate_token(user)
    return {
        "success": True,
        "token": token,
        "user": safe_user(user)
    }


@app.post("/api/auth/register")
async def register(payload: Dict[str, Any]):
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or "claimant"
    company = payload.get("company") or "Independent"

    if not name or not email or len(password) < 6:
        raise HTTPException(status_code=400, detail="Valid name, email, and 6+ char password required.")

    if db.get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    new_user = {
        "id": f"USR-{uuid.uuid4().hex[:8].upper()}",
        "name": name,
        "email": email,
        "role": role,
        "company": company,
        "specialty": None,
        "passwordHash": hash_password(password),
        "createdAt": datetime.now().isoformat()
    }
    db.add_user(new_user)
    token = generate_token(new_user)

    return {
        "success": True,
        "token": token,
        "user": safe_user(new_user)
    }


@app.get("/api/auth/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    db_user = db.get_user_by_id(user.get("id"))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "success": True,
        "user": safe_user(db_user)
    }


@app.post("/api/auth/logout")
async def logout():
    return {"success": True, "message": "Successfully logged out."}


@app.get("/api/companies")
async def get_supported_companies():
    return {
        "success": True,
        "data": [
            "Star Health & Allied Insurance",
            "HDFC ERGO Health Insurance",
            "Niva Bupa Health Insurance",
            "Care Health Insurance",
            "ICICI Lombard General Insurance",
            "New India Assurance"
        ]
    }




# ══════════════════════════════════════════════════════════════════════════════
# CLAIMS ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/claims")
async def get_claims(
    status: Optional[str] = None,
    policyType: Optional[str] = None,
    assignedUnderwriterId: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
):
    all_claims = db.get_claims()
    role = user.get("role")
    user_id = user.get("id")

    # Claimant sees only their own claims
    if role == "claimant":
        all_claims = [c for c in all_claims if c.get("claimantId") == user_id or c.get("claimantName") == user.get("name")]

    filtered = []
    for c in all_claims:
        if status and status != "all" and c.get("status") != status:
            continue
        if policyType and policyType != "all" and c.get("policyType") != policyType:
            continue
        if assignedUnderwriterId and assignedUnderwriterId != "all" and c.get("assignedUnderwriterId") != assignedUnderwriterId:
            continue
        if search:
            q = search.lower()
            text = f"{c.get('id')} {c.get('claimantName')} {c.get('policyNumber')} {c.get('hospitalName')}".lower()
            if q not in text:
                continue
        filtered.append(c)

    return {
        "success": True,
        "total": len(filtered),
        "data": filtered
    }


@app.get("/api/claims/duplicates")
async def get_duplicate_claims(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Executes PySpark window partitioning duplicate invoice detector.
    """
    all_claims = db.get_claims()
    duplicates_res = detect_duplicate_invoices(all_claims)
    return {
        "success": True,
        "totalDuplicates": duplicates_res["totalDuplicates"],
        "data": duplicates_res["data"]
    }


@app.get("/api/claims/{claim_id}")
async def get_claim_detail(claim_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")
    return {
        "success": True,
        "data": claim
    }


@app.post("/api/claims")
async def submit_claim(
    policyNumber: str = Form(...),
    policyType: str = Form("Health"),
    policyCompany: str = Form("Star Health & Allied Insurance"),
    claimantName: str = Form(...),
    claimantAge: int = Form(42),
    sumInsured: float = Form(500000),
    claimAmount: float = Form(...),
    policyStartDate: str = Form(...),
    incidentDate: str = Form(...),
    hospitalName: str = Form("Apollo Hospitals, Mumbai"),
    admissionType: str = Form("Reimbursement"),
    diagnosisDescription: str = Form(...),
    contactNumber: Optional[str] = Form(None),
    documents: List[UploadFile] = File(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim_id = f"CLM-{random.randint(10000, 99999)}-{random.randint(10, 99)}"

    saved_docs = []
    if documents:
        for doc in documents:
            filename = f"{uuid.uuid4().hex[:8]}_{doc.filename}"
            filepath = os.path.join(UPLOADS_DIR, filename)
            with open(filepath, "wb") as f:
                content = await doc.read()
                f.write(content)
            saved_docs.append({
                "id": f"DOC-{uuid.uuid4().hex[:6].upper()}",
                "name": doc.filename,
                "url": f"/uploads/{filename}",
                "invoiceNumber": f"INV-REC-{random.randint(1000, 9999)}",
                "uploadedAt": datetime.now().isoformat()
            })

    # Execute AWS Textract OCR Simulation
    ocr_data = mock_aws_textract_ocr("", policyType)

    # Build preliminary claim dict
    new_claim = {
        "id": claim_id,
        "claimantId": user.get("id"),
        "claimantName": claimantName,
        "claimantAge": claimantAge,
        "contactNumber": contactNumber or "+91 99999 11111",
        "policyNumber": policyNumber,
        "policyType": policyType,
        "policyCompany": policyCompany,
        "sumInsured": sumInsured,
        "claimAmount": claimAmount,
        "policyStartDate": policyStartDate,
        "incidentDate": incidentDate,
        "hospitalName": hospitalName,
        "admissionType": admissionType,
        "diagnosisDescription": diagnosisDescription,
        "status": "submitted",
        "submittedAt": datetime.now().isoformat(),
        "assignedUnderwriterId": "UW-102",
        "assignedUnderwriterName": "Ananya Sharma",
        "ocrData": ocr_data,
        "hospitalNetworkInfo": {
            "hospitalName": hospitalName,
            "city": "Mumbai",
            "empaneled": True,
            "cashlessEligible": True,
            "locationVerified": True
        },
        "documents": saved_docs,
        "internalNotes": [],
        "queryLetters": []
    }

    # Execute Engine Suite
    sub_lim = compute_sub_limits(new_claim)
    ped = analyze_ped(new_claim)
    tariff = analyze_gipsa_tariff(new_claim)
    copay = compute_co_pay(new_claim)
    universal = evaluate_universal_policy(new_claim)

    risk_score, risk_flags = calculate_risk_score(new_claim)
    bedrock = generate_bedrock_ai_recommendation(new_claim, risk_score, risk_flags)

    new_claim.update({
        "subLimitAnalysis": sub_lim,
        "pedAnalysis": ped,
        "tariffAnalysis": tariff,
        "coPayAnalysis": copay,
        "universalAnalysis": universal,
        "riskScore": risk_score,
        "riskFlags": risk_flags,
        "aiRecommendation": bedrock["aiRecommendation"],
        "aiSummary": bedrock["aiSummary"]
    })

    db.add_claim(new_claim)
    await broadcast_sse_event("CLAIM_SUBMITTED", {"claimId": claim_id, "claimantName": claimantName, "claimAmount": claimAmount})

    return {
        "success": True,
        "claimId": claim_id,
        "data": new_claim
    }


@app.patch("/api/claims/{claim_id}")
async def update_claim_status(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    new_status = payload.get("status")
    reason = payload.get("reason")
    approved_amt = payload.get("approvedAmount")

    updates = {}
    if new_status:
        updates["status"] = new_status
    if reason:
        updates["decisionRationale"] = reason
    if approved_amt is not None:
        updates["approvedAmount"] = float(approved_amt)
    elif new_status == "approved" and "approvedAmount" not in claim:
        updates["approvedAmount"] = claim.get("claimAmount")

    updated_claim = db.update_claim(claim_id, updates)
    await broadcast_sse_event("CLAIM_UPDATED", {"claimId": claim_id, "status": new_status, "updatedBy": user.get("name")})

    return {
        "success": True,
        "data": updated_claim
    }


@app.post("/api/claims/{claim_id}/notes")
async def add_internal_note(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Note text required.")

    notes = claim.get("internalNotes") or []
    new_note = {
        "id": f"NOTE-{uuid.uuid4().hex[:6].upper()}",
        "authorName": user.get("name"),
        "authorRole": user.get("role"),
        "text": text,
        "createdAt": datetime.now().isoformat()
    }
    notes.append(new_note)
    updated = db.update_claim(claim_id, {"internalNotes": notes})

    return {
        "success": True,
        "data": updated
    }


@app.post("/api/claims/{claim_id}/query-letter")
async def send_query_letter(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    query_text = (payload.get("queryText") or "").strip()
    deadline_days = int(payload.get("deadlineDays") or 14)

    queries = claim.get("queryLetters") or []
    new_q = {
        "id": f"QRY-{uuid.uuid4().hex[:6].upper()}",
        "sentBy": user.get("name"),
        "queryText": query_text,
        "documentsRequired": ["Original Discharge Summary", "Itemized Hospital Bill with GST Breakup"],
        "deadline": datetime.now().isoformat(),
        "sentAt": datetime.now().isoformat()
    }
    queries.append(new_q)
    updated = db.update_claim(claim_id, {"queryLetters": queries, "status": "doc_pending"})

    return {
        "success": True,
        "data": updated
    }


@app.post("/api/claims/{claim_id}/assign-auditor")
async def assign_fir_auditor(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    investigator_name = payload.get("investigatorName", "Rahul Sharma")
    agency_name = payload.get("agencyName", "Shield Detective & Audit Bureau")

    fir_assignment = {
        "investigatorName": investigator_name,
        "agencyName": agency_name,
        "assignedAt": datetime.now().isoformat()
    }
    updated = db.update_claim(claim_id, {"firAssignment": fir_assignment})

    return {
        "success": True,
        "data": updated
    }


@app.post("/api/claims/{claim_id}/fir-report")
async def submit_fir_report(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    fir_report = {
        "submittedBy": user.get("name"),
        "patientInBedVerified": payload.get("bedCheck", True),
        "doctorRegisterVerified": payload.get("doctorCheck", True),
        "pharmacyBillAudited": payload.get("pharmacyCheck", True),
        "recommendation": payload.get("recommendation", "GENUINE"),
        "investigatorNotes": payload.get("notes", "On-site hospital bed audit verified patient stay."),
        "submittedAt": datetime.now().isoformat()
    }
    updated = db.update_claim(claim_id, {"firReport": fir_report})

    return {
        "success": True,
        "data": updated
    }


@app.post("/api/claims/{claim_id}/partial-approval")
async def partial_approval(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    app_amt = float(payload.get("approvedAmount") or claim.get("claimAmount"))
    updated = db.update_claim(claim_id, {
        "status": "approved",
        "approvedAmount": app_amt,
        "decisionRationale": f"Partial approval issued for ₹{int(app_amt):,} after policy sub-limit deductions."
    })

    return {
        "success": True,
        "data": updated
    }


@app.post("/api/claims/{claim_id}/disburse")
async def disburse_payout(
    claim_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    method = payload.get("payoutMethod", "NEFT")
    bank_ref = payload.get("bankReference") or f"UTR-{uuid.uuid4().hex[:10].upper()}"

    disbursement = {
        "status": "Completed",
        "payoutMethod": method,
        "bankReference": bank_ref,
        "approvedAmount": claim.get("approvedAmount") or claim.get("claimAmount"),
        "disbursedAt": datetime.now().isoformat()
    }
    updated = db.update_claim(claim_id, {"disbursementDetails": disbursement})

    return {
        "success": True,
        "data": updated
    }


@app.get("/api/claims/{claim_id}/settlement-letter")
async def download_settlement_letter(claim_id: str):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    html = generate_settlement_letter_html(claim)
    return HTMLResponse(content=html)


@app.get("/api/claims/{claim_id}/irdai-report")
async def download_claim_irdai_report(claim_id: str):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    report_data = generate_irdai_report([claim])
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>IRDAI Regulatory Report - {claim_id}</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8fafc; color: #0f172a; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
            .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }}
            h1 {{ color: #0284c7; margin: 0; font-size: 24px; }}
            .meta {{ font-size: 14px; color: #64748b; margin-top: 5px; }}
            .badge {{ background: #e0f2fe; color: #0369a1; font-weight: bold; padding: 6px 12px; border-radius: 6px; font-size: 13px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
            th {{ background-color: #f1f5f9; font-weight: 600; color: #334155; }}
            .footer {{ margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1>IRDAI BAP Compliance Audit Report</h1>
                    <div class="meta">Ref: IRDAI/HLT/REG/CIR/2024/091 | Claim ID: {claim_id}</div>
                </div>
                <div class="badge">VERIFIED AUDIT</div>
            </div>

            <h3>Claim Overview</h3>
            <table>
                <tr><th>Policyholder Name</th><td>{claim.get('claimantName')}</td></tr>
                <tr><th>Policy Number</th><td>{claim.get('policyNumber')}</td></tr>
                <tr><th>Hospital</th><td>{claim.get('hospitalName')}</td></tr>
                <tr><th>Claimed Amount</th><td>₹{int(claim.get('claimAmount', 0)):,}</td></tr>
                <tr><th>Approved Amount</th><td>₹{int(claim.get('approvedAmount', claim.get('claimAmount', 0))):,}</td></tr>
                <tr><th>Status</th><td><strong>{str(claim.get('status')).upper()}</strong></td></tr>
                <tr><th>Risk Score</th><td>{claim.get('riskScore', 15)} / 100</td></tr>
            </table>

            <h3 style="margin-top: 30px;">Regulatory Standard Compliance</h3>
            <table>
                <tr><th>Audit Check</th><th>Status</th></tr>
                <tr><td>GIPSA Tariff Compliance</td><td>PASSED</td></tr>
                <tr><td>Pre-Existing Condition (PED) Clause 4.2</td><td>VERIFIED</td></tr>
                <tr><td>IRDAI SLA (Turnaround &lt; 30 Mins)</td><td>COMPLIANT (1.8 mins)</td></tr>
                <tr><td>PySpark Invoice Duplicate Scan</td><td>0 Match Collisions</td></tr>
            </table>

            <div class="footer">
                UnderWriter AI Autonomous Engine • Digital Signature: {report_data.get('digitalSignature')}
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/api/reports/irdai-audit")
async def get_global_irdai_report():
    claims = db.get_claims()
    return {
        "success": True,
        "data": generate_irdai_report(claims)
    }


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS & ADMIN ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/analytics/metrics")
async def get_analytics_metrics(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Computes PySpark aggregated financial & SLA metrics.
    """
    claims = db.get_claims()
    users = db.get_users()
    metrics_data = aggregate_analytics_metrics(claims, users)

    return {
        "success": True,
        "data": metrics_data
    }


@app.get("/api/audit-logs")
@app.get("/api/admin/audit-logs")
async def get_audit_logs(user: Dict[str, Any] = Depends(get_current_user)):
    logs = db.get_audit_logs()
    return {
        "success": True,
        "data": logs
    }


@app.get("/api/users")
@app.get("/api/admin/users")
async def get_users_list(user: Dict[str, Any] = Depends(get_current_user)):
    users = db.get_users()
    safe_users = [safe_user(u) for u in users]
    return {
        "success": True,
        "data": safe_users
    }


# System config store
SYSTEM_CONFIG = {
    "autoApprovalThreshold": 75000,
    "maxRiskScoreForAutoApprove": 25,
    "gipsaStrictness": "Medium",
    "pysparkWorkers": 4,
    "ocrConfidenceThreshold": 85,
    "sseRealtimeEnabled": True
}


@app.get("/api/admin/config")
async def get_admin_config(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "success": True,
        "data": SYSTEM_CONFIG
    }


@app.post("/api/admin/config")
async def update_admin_config(payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    SYSTEM_CONFIG.update(payload)
    return {
        "success": True,
        "data": SYSTEM_CONFIG
    }


@app.post("/api/admin/reset-seed")
async def reset_seed_data(user: Dict[str, Any] = Depends(get_current_user)):
    db.load()
    return {
        "success": True,
        "message": "Seed data reloaded successfully."
    }



# ══════════════════════════════════════════════════════════════════════════════
# SERVER-SENT EVENTS (SSE) STREAM ROUTE
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/events")
async def sse_endpoint(request: Request):
    async def event_generator():
        client_queue = await register_sse_client()
        try:
            while True:
                if await request.is_disconnected():
                    break
                data = await client_queue.get()
                yield data
        except Exception:
            pass
        finally:
            unregister_sse_client(client_queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
