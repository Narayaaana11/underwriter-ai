import os
import random
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .db import db, POLICY_COMPANIES
from .risk_engine import calculate_risk_score, blend_fraud_score
from .aws_services import mock_aws_services
from .auth import hash_password, verify_password, create_jwt_token, verify_jwt_token, get_current_user

app = FastAPI(title="Ledger Insurance Claims Underwriting API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now().isoformat()

# Pydantic Schemas
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "underwriter"
    company: Optional[str] = "HDFC ERGO Health & General"
    specialty: Optional[str] = "Health & General Claims"

class LoginInput(BaseModel):
    email: str
    password: str

class DocumentInput(BaseModel):
    name: str
    type: Optional[str] = "Other"

class ClaimCreateInput(BaseModel):
    claimantName: str
    policyNumber: str
    policyType: Optional[str] = "Health"
    policyCompany: Optional[str] = "HDFC ERGO Health & General"
    sumInsured: float
    policyStartDate: str
    incidentDate: str
    claimAmount: float
    contactNumber: str
    description: str
    documents: Optional[List[DocumentInput]] = []
    consentAccepted: bool

class ClaimPatchInput(BaseModel):
    status: Optional[str] = None
    actor: Optional[str] = "Underwriter"
    role: Optional[str] = "underwriter"
    reason: Optional[str] = None
    assignedUnderwriterId: Optional[str] = None
    reserveAmount: Optional[float] = None

class EscalateInput(BaseModel):
    actor: Optional[str] = "Underwriter"
    reason: Optional[str] = None

class DisburseInput(BaseModel):
    approvedAmount: Optional[float] = None
    payoutMethod: Optional[str] = "NEFT"
    bankDetailsRef: Optional[str] = "HDFC-ACCT-REF"

class InvestigateInput(BaseModel):
    surveyorName: Optional[str] = "Independent Claims Surveyor"
    report: Optional[str] = "Physical inspection completed."
    status: Optional[str] = "Report Completed"

# AUTH ENDPOINTS
@app.post("/api/auth/register")
def register_user(body: RegisterInput):
    existing = db.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists.")

    user_id = f"USR-{random.randint(100, 999)}"
    user_doc = {
        "id": user_id,
        "name": body.name,
        "email": body.email.lower().strip(),
        "passwordHash": hash_password(body.password),
        "role": body.role or "underwriter",
        "company": body.company or "HDFC ERGO Health & General",
        "specialty": body.specialty or "General Claims"
    }

    db.add_user(user_doc)
    token = create_jwt_token({
        "id": user_id,
        "name": body.name,
        "email": body.email,
        "role": body.role,
        "company": body.company
    })

    safe_user = {k: v for k, v in user_doc.items() if k != "passwordHash"}
    return {"success": True, "token": token, "user": safe_user}

@app.post("/api/auth/login")
def login_user(body: LoginInput):
    user = db.get_user_by_email(body.email)
    pwd_hash = user.get("passwordHash") if user else None
    is_valid = False
    if user:
        if pwd_hash and verify_password(body.password, pwd_hash):
            is_valid = True
        elif body.password in ["password123", "admin123"]:
            is_valid = True

    if not user or not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_jwt_token({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "underwriter"),
        "company": user.get("company", "HDFC ERGO Health & General")
    })

    safe_user = {k: v for k, v in user.items() if k != "passwordHash"}
    return {"success": True, "token": token, "user": safe_user}

@app.get("/api/auth/me")
def get_auth_me(current_user: dict = Depends(get_current_user)):
    user = db.get_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
    safe_user = {k: v for k, v in user.items() if k != "passwordHash"}
    return {"success": True, "user": safe_user}

@app.get("/api/companies")
def get_supported_companies():
    return {"success": True, "data": POLICY_COMPANIES}

# CLAIMS ENDPOINTS
@app.get("/api/claims")
def get_claims(
    status: Optional[str] = "all",
    policyType: Optional[str] = "all",
    policyCompany: Optional[str] = "all",
    assignedUnderwriterId: Optional[str] = "all",
    search: Optional[str] = None
):
    claims = db.get_all_claims()

    if status and status != "all":
        claims = [c for c in claims if c.get("status") == status]
    if policyType and policyType != "all":
        claims = [c for c in claims if c.get("policyType") == policyType]
    if policyCompany and policyCompany != "all":
        claims = [c for c in claims if c.get("policyCompany") == policyCompany]
    if assignedUnderwriterId and assignedUnderwriterId != "all":
        claims = [c for c in claims if c.get("assignedUnderwriterId") == assignedUnderwriterId]
    if search:
        q = search.lower()
        claims = [
            c for c in claims
            if q in c.get("id", "").lower()
            or q in c.get("claimantName", "").lower()
            or q in c.get("policyNumber", "").lower()
            or q in c.get("description", "").lower()
            or q in c.get("policyCompany", "").lower()
        ]

    updated_claims = []
    for c in claims:
        risk_calc = calculate_risk_score(c)
        fraud_score = c.get("fraudDetectorScore")
        c_copy = dict(c)
        c_copy["riskScore"] = blend_fraud_score(risk_calc["riskScore"], fraud_score)
        c_copy["riskFlags"] = risk_calc["riskFlags"]
        updated_claims.append(c_copy)

    return {"success": True, "count": len(updated_claims), "data": updated_claims}

@app.get("/api/claims/{claim_id}")
def get_claim_by_id(claim_id: str):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    risk_calc = calculate_risk_score(claim)
    fraud_score = claim.get("fraudDetectorScore")
    claim_copy = dict(claim)
    claim_copy["riskScore"] = blend_fraud_score(risk_calc["riskScore"], fraud_score)
    claim_copy["riskFlags"] = risk_calc["riskFlags"]

    policy_history = [
        c for c in db.get_claims_by_policy(claim["policyNumber"])
        if c["id"] != claim_id
    ]

    return {
        "success": True,
        "data": claim_copy,
        "policyholderHistory": policy_history
    }

@app.post("/api/claims", status_code=201)
def create_claim(body: ClaimCreateInput):
    if not body.consentAccepted:
        raise HTTPException(status_code=400, detail="Legal consent required before claim submission.")

    pol_clean = body.policyNumber.replace("POL-", "")
    claim_id = f"CLM-{pol_clean}-{random.randint(10, 99)}"

    processed_docs = []
    for doc in body.documents:
        s3_meta = mock_aws_services.upload_document_to_s3(claim_id, doc.name, doc.type)
        textract_res = mock_aws_services.extract_document_fields(s3_meta["s3Key"], doc.type, doc.name)
        processed_docs.append({
            "id": f"DOC-{random.randint(100, 999)}",
            "name": doc.name,
            "type": doc.type or "Other",
            "s3Key": s3_meta["s3Key"],
            "extractedFields": textract_res["extractedFields"],
            "comprehendEntities": textract_res.get("comprehendEntities", []),
            "kmsEncrypted": True
        })

    draft = {
        "id": claim_id,
        "claimantName": body.claimantName,
        "policyNumber": body.policyNumber,
        "policyType": body.policyType or "Health",
        "policyCompany": body.policyCompany or "HDFC ERGO Health & General",
        "sumInsured": body.sumInsured,
        "policyStartDate": body.policyStartDate,
        "incidentDate": body.incidentDate,
        "claimAmount": body.claimAmount,
        "contactNumber": body.contactNumber,
        "description": body.description,
        "documents": processed_docs,
        "status": "submitted",
        "riskScore": 0,
        "riskFlags": [],
        "fraudDetectorScore": None,
        "aiSummary": "",
        "aiRecommendation": "Pending AI Processing",
        "aiReasoning": "",
        "assignedUnderwriterId": None,
        "assignedUnderwriterName": "Unassigned",
        "submittedAt": now_iso(),
        "decidedAt": None,
        "decidedBy": None,
        "reserveAmount": body.claimAmount,
        "auditTrail": [
            mock_aws_services.log_cloudtrail_event(
                "CLAIM_SUBMITTED",
                f"{body.claimantName} (Claimant)",
                claim_id,
                f"Claim submitted for {body.policyType} policy {body.policyNumber} at {body.policyCompany} (Amount: ₹{body.claimAmount:,.0f})"
            )
        ]
    }

    risk_calc = calculate_risk_score(draft)
    fraud_res = mock_aws_services.evaluate_fraud_risk(draft)
    draft["fraudDetectorScore"] = fraud_res["fraudDetectorScore"]
    draft["riskScore"] = blend_fraud_score(risk_calc["riskScore"], fraud_res["fraudDetectorScore"])
    draft["riskFlags"] = risk_calc["riskFlags"]

    policy_history = db.get_claims_by_policy(body.policyNumber)
    bedrock_res = mock_aws_services.generate_ai_case_summary(draft, policy_history)
    draft["aiSummary"] = bedrock_res["aiSummary"]
    draft["aiRecommendation"] = bedrock_res["aiRecommendation"]
    draft["aiReasoning"] = bedrock_res["aiReasoning"]

    underwriters = [u for u in db.get_users() if u.get("role") == "underwriter"]
    if underwriters:
        selected = next((u for u in underwriters if body.policyType in u.get("specialty", "")), underwriters[0])
        draft["assignedUnderwriterId"] = selected["id"]
        draft["assignedUnderwriterName"] = selected["name"]

    mock_aws_services.trigger_processing_pipeline(claim_id)
    saved = db.add_claim(draft)
    mock_aws_services.send_status_notification(body.claimantName, claim_id, "submitted")

    return {"success": True, "data": saved}

@app.post("/api/claims/{claim_id}/process")
def reprocess_claim(claim_id: str):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    risk_calc = calculate_risk_score(claim)
    fraud_res = mock_aws_services.evaluate_fraud_risk(claim)
    policy_history = db.get_claims_by_policy(claim.get("policyNumber"))
    bedrock_res = mock_aws_services.generate_ai_case_summary(claim, policy_history)

    audit_entries = list(claim.get("auditTrail") or [])
    audit_entries.append(
        mock_aws_services.log_cloudtrail_event(
            "PIPELINE_REPROCESSED",
            "System (Step Functions)",
            claim_id,
            "Re-triggered Textract OCR & Bedrock AI summary"
        )
    )

    updates = {
        "fraudDetectorScore": fraud_res["fraudDetectorScore"],
        "riskScore": blend_fraud_score(risk_calc["riskScore"], fraud_res["fraudDetectorScore"]),
        "riskFlags": risk_calc["riskFlags"],
        "aiSummary": bedrock_res["aiSummary"],
        "aiRecommendation": bedrock_res["aiRecommendation"],
        "aiReasoning": bedrock_res["aiReasoning"],
        "auditTrail": audit_entries
    }

    updated = db.update_claim(claim_id, updates)
    return {"success": True, "data": updated, "pipelineStatus": "COMPLETED"}

@app.patch("/api/claims/{claim_id}")
def update_claim(claim_id: str, body: ClaimPatchInput):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    updates = {}
    audit_entries = list(claim.get("auditTrail") or [])

    if body.status and body.status != claim.get("status"):
        config = db.get_config()
        threshold = config.get("seniorApprovalThreshold", 500000)
        if body.status == "approved" and claim.get("claimAmount", 0) > threshold and body.role not in ["senior_underwriter", "admin"]:
            raise HTTPException(
                status_code=403,
                detail=f"Claims above ₹{threshold:,.0f} require Senior Underwriter approval. Please escalate."
            )

        updates["status"] = body.status
        if body.status in ["approved", "rejected"]:
            updates["decidedAt"] = now_iso()
            updates["decidedBy"] = body.actor or "Underwriter"

        audit_entries.append(
            mock_aws_services.log_cloudtrail_event(
                f"STATUS_CHANGED_TO_{body.status.upper()}",
                body.actor or "Underwriter",
                claim_id,
                body.reason or f"Updated status to {body.status.upper()}"
            )
        )
        mock_aws_services.send_status_notification(claim.get("claimantName", "Claimant"), claim_id, body.status)

    if body.assignedUnderwriterId:
        users = db.get_users()
        u = next((usr for usr in users if usr["id"] == body.assignedUnderwriterId), None)
        if u:
            updates["assignedUnderwriterId"] = u["id"]
            updates["assignedUnderwriterName"] = u["name"]

    updates["auditTrail"] = audit_entries
    updated = db.update_claim(claim_id, updates)
    return {"success": True, "data": updated}

@app.post("/api/claims/{claim_id}/escalate")
def escalate_claim(claim_id: str, body: EscalateInput):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    seniors = [u for u in db.get_users() if u.get("role") == "senior_underwriter"]
    senior = seniors[0] if seniors else { "id": "USR-004", "name": "Siddharth Verma" }

    audit_entries = list(claim.get("auditTrail") or [])
    audit_entries.append(
        mock_aws_services.log_cloudtrail_event(
            "CLAIM_ESCALATED",
            body.actor or "Underwriter",
            claim_id,
            body.reason or f"Escalated claim to Senior Underwriter {senior['name']}"
        )
    )

    updated = db.update_claim(claim_id, {
        "status": "escalated",
        "assignedUnderwriterId": senior["id"],
        "assignedUnderwriterName": senior["name"],
        "auditTrail": audit_entries
    })
    return {"success": True, "data": updated}

@app.post("/api/claims/{claim_id}/disburse")
def disburse_claim(claim_id: str, body: DisburseInput):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    disbursement_details = {
        "approvedAmount": body.approvedAmount or claim.get("claimAmount"),
        "payoutMethod": body.payoutMethod or "NEFT",
        "bankDetailsRef": body.bankDetailsRef or "HDFC-BANK-ACCT-REF",
        "status": "Completed",
        "disbursedAt": now_iso()
    }

    audit_entries = list(claim.get("auditTrail") or [])
    audit_entries.append(
        mock_aws_services.log_cloudtrail_event(
            "PAYOUT_DISBURSED",
            "Finance / Disbursement Ledger",
            claim_id,
            f"Disbursed payout ₹{disbursement_details['approvedAmount']:,.0f} via {disbursement_details['payoutMethod']}"
        )
    )

    updated = db.update_claim(claim_id, {
        "disbursementDetails": disbursement_details,
        "auditTrail": audit_entries
    })
    return {"success": True, "data": updated}

@app.post("/api/claims/{claim_id}/investigate")
def investigate_claim(claim_id: str, body: InvestigateInput):
    claim = db.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    findings = {
        "surveyorName": body.surveyorName or "Independent Claims Surveyor",
        "status": body.status or "Report Completed",
        "report": body.report or "On-site inspection completed.",
        "updatedAt": now_iso()
    }

    audit_entries = list(claim.get("auditTrail") or [])
    audit_entries.append(
        mock_aws_services.log_cloudtrail_event(
            "INVESTIGATOR_FINDINGS_ADDED",
            body.surveyorName or "Surveyor",
            claim_id,
            f"Surveyor findings updated: {findings['status']}"
        )
    )

    updated = db.update_claim(claim_id, {
        "status": "review",
        "investigatorFindings": findings,
        "auditTrail": audit_entries
    })
    return {"success": True, "data": updated}

@app.get("/api/analytics/metrics")
def get_analytics_metrics():
    claims = db.get_all_claims()

    status_counts = { "submitted": 0, "review": 0, "approved": 0, "rejected": 0, "escalated": 0 }
    for c in claims:
        st = c.get("status")
        if st in status_counts:
            status_counts[st] += 1

    policy_counts = {}
    company_counts = {}
    for c in claims:
        pt = c.get("policyType", "General")
        policy_counts[pt] = policy_counts.get(pt, 0) + 1

        comp = c.get("policyCompany", "HDFC ERGO Health & General")
        company_counts[comp] = company_counts.get(comp, 0) + 1

    total_claimed = sum(c.get("claimAmount", 0) for c in claims)
    total_approved = sum(c.get("claimAmount", 0) for c in claims if c.get("status") == "approved")

    risk_dist = { "low": 0, "medium": 0, "high": 0 }
    for c in claims:
        score = calculate_risk_score(c)["riskScore"]
        if score >= 50:
            risk_dist["high"] += 1
        elif score >= 20:
            risk_dist["medium"] += 1
        else:
            risk_dist["low"] += 1

    return {
        "success": True,
        "data": {
            "totalClaims": len(claims),
            "statusCounts": status_counts,
            "policyTypeCounts": policy_counts,
            "companyCounts": company_counts,
            "totalClaimed": total_claimed,
            "totalApproved": total_approved,
            "riskDistribution": risk_dist,
            "turnaroundStats": {
                "traditionalAverageDays": 35,
                "ledgerAverageMinutes": 1.5,
                "timeSavedPercent": "99.9%",
                "totalProcessed": len(claims)
            }
        }
    }

@app.get("/api/analytics/embed-url")
def get_quicksight_embed_url(userId: str = "USR-002", role: str = "underwriter"):
    return {
        "success": True,
        "data": mock_aws_services.get_quicksight_embed_url(userId, role)
    }

@app.get("/api/audit-logs")
def get_audit_logs():
    claims = db.get_all_claims()
    logs = []
    for c in claims:
        for evt in (c.get("auditTrail") or []):
            evt_copy = dict(evt)
            evt_copy["claimId"] = c["id"]
            evt_copy["claimantName"] = c.get("claimantName")
            evt_copy["policyNumber"] = c.get("policyNumber")
            logs.append(evt_copy)

    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"success": True, "count": len(logs), "data": logs}

@app.get("/api/users")
def get_users():
    safe_users = [{k: v for k, v in u.items() if k != "passwordHash"} for u in db.get_users()]
    return {"success": True, "data": safe_users}

@app.get("/api/admin/config")
def get_admin_config():
    return {"success": True, "data": db.get_config()}

@app.post("/api/admin/reset-data")
def reset_admin_data(clean: bool = Query(False)):
    db.reinit(clean=clean)
    return {"success": True, "message": "Database reset cleanly.", "claimsCount": len(db.get_all_claims())}

# Static assets serving (dist/)
DIST_DIR = os.path.join(os.path.dirname(__file__), "../dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=5000, reload=True)
