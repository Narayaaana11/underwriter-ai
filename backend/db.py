import os
import json
from datetime import datetime, timedelta
from .auth import hash_password

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
DB_FILE = os.path.join(DATA_DIR, "store.json")

POLICY_COMPANIES = [
    "HDFC ERGO Health & General",
    "Star Health & Allied Insurance",
    "ICICI Lombard General Insurance",
    "Bajaj Allianz General",
    "Care Health Insurance",
    "Niva Bupa Health Insurance"
]

def calculate_days_ago(days: int) -> str:
    d = datetime.now() - timedelta(days=days)
    return d.strftime("%Y-%m-%d")

SEED_USERS = [
    {
        "id": "USR-001",
        "name": "Ramesh Kumar",
        "email": "ramesh.k@example.com",
        "passwordHash": hash_password("password123"),
        "role": "claimant",
        "company": "HDFC ERGO Health & General",
        "policyNumbers": ["POL-88213"]
    },
    {
        "id": "USR-002",
        "name": "Vikram Malhotra",
        "email": "v.malhotra@ledger-insurance.com",
        "passwordHash": hash_password("password123"),
        "role": "underwriter",
        "company": "ICICI Lombard General Insurance",
        "specialty": "Motor & Property"
    },
    {
        "id": "USR-003",
        "name": "Ananya Sharma",
        "email": "a.sharma@ledger-insurance.com",
        "passwordHash": hash_password("password123"),
        "role": "underwriter",
        "company": "Star Health & Allied Insurance",
        "specialty": "Health & Travel"
    },
    {
        "id": "USR-004",
        "name": "Siddharth Verma",
        "email": "s.verma@ledger-insurance.com",
        "passwordHash": hash_password("password123"),
        "role": "senior_underwriter",
        "company": "HDFC ERGO Health & General",
        "specialty": "High-Value Claims & Escalations"
    },
    {
        "id": "USR-005",
        "name": "System Admin",
        "email": "admin@ledger-insurance.com",
        "passwordHash": hash_password("admin123"),
        "role": "admin",
        "company": "Enterprise Governance",
        "specialty": "System Management"
    }
]

SEED_CLAIMS = [
  {
    "id": "CLM-88213-01",
    "claimantName": "Ramesh Kumar",
    "policyNumber": "POL-88213",
    "policyType": "Health",
    "policyCompany": "HDFC ERGO Health & General",
    "sumInsured": 500000,
    "policyStartDate": calculate_days_ago(620),
    "incidentDate": calculate_days_ago(9),
    "claimAmount": 145000,
    "contactNumber": "+91 98765 43210",
    "description": "Hospitalized for 4 days for acute appendicitis, underwent laparoscopic surgery at Apollo Hospital.",
    "documents": [
      { "id": "DOC-101", "name": "Hospital Discharge Summary.pdf", "type": "Medical Report", "s3Key": "claims/CLM-88213-01/discharge.pdf", "extractedFields": { "hospitalName": "Apollo Hospital", "diagnosis": "Acute Appendicitis (K35.8)", "procedure": "Laparoscopic Appendectomy", "admissionDate": calculate_days_ago(13), "dischargeDate": calculate_days_ago(9), "billedAmount": "₹1,45,000" } },
      { "id": "DOC-102", "name": "Final Itemized Bill.pdf", "type": "Bill/Invoice", "s3Key": "claims/CLM-88213-01/final_bill.pdf", "extractedFields": { "invoiceNo": "APH-2026-8841", "roomCharges": "₹32,000", "OTCharges": "₹45,000", "surgeonFees": "₹40,000", "pharmacy": "₹28,000", "total": "₹1,45,000" } }
    ],
    "status": "submitted",
    "riskScore": 15,
    "riskFlags": [
      { "flag": "within early-claim window", "impact": 15, "severity": "warning" }
    ],
    "fraudDetectorScore": 8,
    "aiSummary": "Claimant was admitted to Apollo Hospital for acute appendicitis and underwent standard laparoscopic appendectomy. Claim amount ₹1,45,000 is within 29% of policy sum insured. Documentation is complete with valid discharge summary and itemized bill.",
    "aiRecommendation": "Approve",
    "aiReasoning": "Procedure and billing match standard clinical guidelines for acute appendicitis under Health Policy Clause 4.2.",
    "assignedUnderwriterId": "USR-003",
    "assignedUnderwriterName": "Ananya Sharma",
    "submittedAt": calculate_days_ago(8) + "T10:15:00Z",
    "decidedAt": None,
    "decidedBy": None,
    "reserveAmount": 145000,
    "auditTrail": [
      { "action": "CLAIM_SUBMITTED", "actor": "Ramesh Kumar (Claimant)", "timestamp": calculate_days_ago(8) + "T10:15:00Z" }
    ]
  },
  {
    "id": "CLM-91027-01",
    "claimantName": "Priya Nair",
    "policyNumber": "POL-91027",
    "policyType": "Motor",
    "policyCompany": "ICICI Lombard General Insurance",
    "sumInsured": 800000,
    "policyStartDate": calculate_days_ago(14),
    "incidentDate": calculate_days_ago(2),
    "claimAmount": 610000,
    "contactNumber": "+91 98123 45678",
    "description": "Car collided with a divider on the highway, front end damaged.",
    "documents": [
      { "id": "DOC-201", "name": "Damage Front View.jpg", "type": "Photos", "s3Key": "claims/CLM-91027-01/front_damage.jpg", "extractedFields": { "photoType": "Vehicle Visual Assessment", "primaryImpact": "Front Bumper & Radiator Grille", "estimatedSeverity": "Major Structural Damage" } }
    ],
    "status": "review",
    "riskScore": 85,
    "riskFlags": [
      { "flag": "possible waiting-period violation", "impact": 40, "severity": "alert" },
      { "flag": "unusually high vs sum insured", "impact": 30, "severity": "alert" }
    ],
    "fraudDetectorScore": 78,
    "aiSummary": "High-risk motor claim filed just 14 days after policy inception for ₹6,10,000. Early claim window and high claim percentage raise significant fraud risk indicators.",
    "aiRecommendation": "Investigate Further",
    "aiReasoning": "Triggered multiple risk flags under Motor Policy Rider 3.1. Requires physical surveyor inspection.",
    "assignedUnderwriterId": "USR-002",
    "assignedUnderwriterName": "Vikram Malhotra",
    "submittedAt": calculate_days_ago(2) + "T14:30:00Z",
    "decidedAt": None,
    "decidedBy": None,
    "reserveAmount": 610000,
    "auditTrail": [
      { "action": "CLAIM_SUBMITTED", "actor": "Priya Nair (Claimant)", "timestamp": calculate_days_ago(2) + "T14:30:00Z" }
    ]
  }
]

DEFAULT_CONFIG = {
  "autoApprovalThresholds": {
    "Health": 100000,
    "Motor": 150000,
    "Life": 500000,
    "Travel": 50000,
    "Property": 250000
  },
  "seniorApprovalThreshold": 500000,
  "supportedCompanies": POLICY_COMPANIES
}

class Store:
    def __init__(self):
        self.claims = []
        self.users = []
        self.config = {}
        os.makedirs(DATA_DIR, exist_ok=True)
        self.load()

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.claims = data.get("claims", SEED_CLAIMS)
                    self.users = data.get("users", SEED_USERS)
                    self.config = data.get("config", DEFAULT_CONFIG)
            except Exception as e:
                print("Error loading store:", e)
                self.reinit()
        else:
            self.reinit()

    def reinit(self, clean: bool = False):
        self.claims = [] if clean else list(SEED_CLAIMS)
        self.users = list(SEED_USERS)
        self.config = dict(DEFAULT_CONFIG)
        self.save()

    def save(self):
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "claims": self.claims,
                    "users": self.users,
                    "config": self.config
                }, f, indent=2)
        except Exception as e:
            print("Error saving store:", e)

    def get_all_claims(self):
        return self.claims

    def get_claim_by_id(self, claim_id: str):
        for c in self.claims:
            if c["id"] == claim_id:
                return c
        return None

    def get_claims_by_policy(self, policy_number: str):
        return [c for c in self.claims if c["policyNumber"] == policy_number]

    def add_claim(self, claim: dict):
        self.claims.insert(0, claim)
        self.save()
        return claim

    def update_claim(self, claim_id: str, updates: dict):
        for i, c in enumerate(self.claims):
            if c["id"] == claim_id:
                self.claims[i].update(updates)
                self.save()
                return self.claims[i]
        return None

    def get_users(self):
        return self.users

    def get_user_by_email(self, email: str):
        for u in self.users:
            if u.get("email", "").lower() == email.lower():
                return u
        return None

    def add_user(self, user: dict):
        self.users.append(user)
        self.save()
        return user

    def get_config(self):
        return self.config

    def update_config(self, new_config: dict):
        self.config.update(new_config)
        self.save()
        return self.config

db = Store()
