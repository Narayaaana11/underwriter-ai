import os
import random
import time
from datetime import datetime

class MockAWSServices:
    @staticmethod
    def upload_document_to_s3(claim_id: str, file_name: str, document_type: str) -> dict:
        clean_name = file_name.replace(" ", "_")
        s3_key = f"claims/{claim_id}/{int(time.time() * 1000)}_{clean_name}"
        kms_key_id = os.getenv("AWS_KMS_KEY_ID", "arn:aws:kms:us-east-1:123456789012:key/ledger-claims-kms-key")
        
        return {
            "s3Bucket": os.getenv("AWS_S3_BUCKET", "underwriter-ai"),
            "s3Key": s3_key,
            "kmsEncrypted": True,
            "kmsKeyId": kms_key_id,
            "etag": '"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"',
            "uploadedAt": datetime.now().isoformat()
        }

    @staticmethod
    def extract_document_fields(s3_key: str, document_type: str, file_name: str) -> dict:
        extracted = {}
        t_lower = (document_type or "").lower()
        f_lower = (file_name or "").lower()

        if "bill" in t_lower or "invoice" in t_lower or "bill" in f_lower:
            extracted = {
                "invoiceNumber": f"INV-{random.randint(10000, 99999)}",
                "issueDate": datetime.now().strftime("%Y-%m-%d"),
                "vendorName": "Verified Healthcare / Service Provider",
                "subtotal": "₹1,20,000",
                "taxAmount": "₹25,000",
                "totalAmount": "₹1,45,000",
                "paymentStatus": "Paid / Pending Reimbursement"
            }
        elif "medical" in t_lower or "prescription" in t_lower or "discharge" in f_lower:
            extracted = {
                "patientName": "Claimant",
                "facility": "Apollo Multi-Specialty Hospital",
                "attendingPhysician": "Dr. R. K. Saxena, MS",
                "primaryDiagnosis": "Acute Medical Condition (ICD-10 Code K35.8)",
                "treatmentProvided": "Inpatient Medical Care & Surgical Intervention",
                "admissionPeriod": "4 Days Inpatient Stay"
            }
        elif "police" in t_lower or "fir" in t_lower or "fire" in f_lower:
            extracted = {
                "policeStation": "Central District Station",
                "firNumber": f"FIR-{random.randint(1000, 9999)}/2026",
                "incidentType": "Accidental Property Loss / Incident",
                "officerInCharge": "Insp. S. Patil",
                "investigationStatus": "Preliminary FIR Recorded"
            }
        elif "photo" in t_lower or "photo" in f_lower or "jpg" in f_lower:
            extracted = {
                "imageAnalysis": "Visual Damage Inspection Validated",
                "confidenceScore": "96.4%",
                "detectedElements": ["Impact damage", "Structural deformation"],
                "timestampExtracted": datetime.now().isoformat()
            }
        else:
            extracted = {
                "documentName": file_name,
                "extractedTextSnippet": "Official documentation verified by AWS Textract OCR Engine.",
                "ocrConfidence": "98.2%"
            }

        return {
            "service": "AWS Textract & AWS Comprehend Medical",
            "status": "SUCCEEDED",
            "documentType": document_type,
            "extractedFields": extracted,
            "comprehendEntities": [
                { "category": "MEDICAL_CONDITION", "text": "Acute Appendicitis", "icd10": "K35.8", "score": 0.99 },
                { "category": "ANATOMY", "text": "Appendix / Abdomen", "score": 0.98 },
                { "category": "PROCEDURE", "text": "Laparoscopic Appendectomy", "score": 0.97 }
            ],
            "confidenceScore": 0.962
        }

    @staticmethod
    def generate_ai_case_summary(claim: dict, policy_history: list = None) -> dict:
        policy_history = policy_history or []
        sum_insured = claim.get("sumInsured") or 1
        claim_amount = claim.get("claimAmount") or 0
        ratio = (claim_amount / sum_insured) * 100
        policy_type = claim.get("policyType") or "General"
        risk_score = claim.get("riskScore") or 0

        recommendation = "Approve"
        summary_text = ""
        reasoning_text = ""

        if risk_score >= 50:
            recommendation = "Investigate Further"
            summary_text = f"High-risk {policy_type} claim filed for ₹{claim_amount:,.0f} ({ratio:.1f}% of sum insured ₹{sum_insured:,.0f}). Multiple risk flags detected including early-inception window and high claim proportion."
            reasoning_text = f"Under {policy_type} Policy Section 3.1 (Risk Audit Clause), claims exceeding 60% of sum insured filed within initial policy period require physical surveyor inspection and policy clause verification."
        elif len(claim.get("documents") or []) == 0:
            recommendation = "Reject"
            summary_text = f"Claim of ₹{claim_amount:,.0f} submitted without any supporting documentation or verification receipts."
            reasoning_text = f"Non-compliant with {policy_type} Policy Clause 12.A (Mandatory Documentation Requirement). Submission lacks verifiable proof of loss."
        else:
            recommendation = "Approve"
            summary_text = f"Claim of ₹{claim_amount:,.0f} filed under {policy_type} policy POL-{claim.get('policyNumber')}. Incident details align with verified Textract document extractions and policy terms."
            reasoning_text = f"Complies with {policy_type} Policy Coverage Schedule Clause 4.2. Low risk score ({risk_score}/100), clean policy history ({len(policy_history)} previous claim(s)), and valid document proof."

        return {
            "service": "AWS Bedrock (anthropic.claude-3-5-sonnet)",
            "aiSummary": summary_text,
            "aiRecommendation": recommendation,
            "aiReasoning": reasoning_text,
            "citedClause": f"{policy_type} Policy Terms & Conditions Section 4.2",
            "aiConfidenceScore": "96.4%",
            "aiLimitationsNotice": "Advisory Output Only: AI RAG evaluation is decision-support assistance. Final binding underwriter sign-off required per insurance regulatory guidelines.",
            "generatedAt": datetime.now().isoformat()
        }

    @staticmethod
    def evaluate_fraud_risk(claim: dict) -> dict:
        claim_amount = claim.get("claimAmount") or 0
        sum_insured = claim.get("sumInsured") or 1
        is_high_ratio = (claim_amount / sum_insured) > 0.7
        is_few_docs = len(claim.get("documents") or []) < 2
        base_score = 65 if is_high_ratio else (45 if is_few_docs else 12)

        return {
            "service": "AWS Fraud Detector",
            "modelName": "ledger_claims_fraud_v2",
            "fraudDetectorScore": base_score,
            "riskLevel": "HIGH" if base_score > 50 else ("MEDIUM" if base_score > 30 else "LOW"),
            "evaluatedAt": datetime.now().isoformat()
        }

    @staticmethod
    def trigger_processing_pipeline(claim_id: str) -> dict:
        return {
            "service": "AWS Step Functions",
            "executionArn": f"arn:aws:states:us-east-1:123456789012:execution:LedgerClaimProcessingPipeline:{claim_id}_{int(time.time()*1000)}",
            "status": "RUNNING",
            "steps": [
                { "name": "ReceiveSQSMessage", "status": "COMPLETED" },
                { "name": "RunTextractOCR", "status": "COMPLETED" },
                { "name": "RunMaciePIIScan", "status": "COMPLETED" },
                { "name": "EvaluateFraudDetector", "status": "COMPLETED" },
                { "name": "InvokeBedrockLLM", "status": "COMPLETED" },
                { "name": "UpdateClaimRecord", "status": "SUCCEEDED" }
            ],
            "startDate": datetime.now().isoformat()
        }

    @staticmethod
    def log_cloudtrail_event(action: str, actor: str, resource_id: str, details: str = None) -> dict:
        return {
            "eventId": f"EVT-{random.randint(100000, 999999)}",
            "action": action,
            "actor": actor,
            "resourceId": resource_id,
            "details": details or f"Executed {action} on resource {resource_id}",
            "timestamp": datetime.now().isoformat(),
            "userAgent": "Ledger-Underwriter-Dashboard/1.0",
            "awsRegion": os.getenv("AWS_REGION", "us-east-1")
        }

    @staticmethod
    def send_status_notification(recipient: str, claim_id: str, new_status: str, message: str = None) -> dict:
        return {
            "service": "Amazon SES / SNS",
            "messageId": f"MSG-{random.randint(100000, 999999)}",
            "recipient": recipient,
            "channel": "EMAIL_AND_SMS",
            "subject": f"Claim {claim_id} Status Update: {new_status.upper()}",
            "body": message or f"Your insurance claim {claim_id} has been updated to: {new_status.upper()}.",
            "sentAt": datetime.now().isoformat()
        }

    @staticmethod
    def get_quicksight_embed_url(user_id: str, role: str) -> dict:
        return {
            "service": "Amazon QuickSight",
            "dashboardId": "ledger-executive-underwriting-analytics-v1",
            "embedUrl": f"https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/ledger-executive-underwriting-analytics-v1?role={role}",
            "expirationInSeconds": 3600,
            "generatedAt": datetime.now().isoformat()
        }

mock_aws_services = MockAWSServices()
