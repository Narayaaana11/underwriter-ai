import os
import json
import zipfile
from datetime import datetime, timedelta

DATASET_DIR = "dataset_temp"
ZIP_FILENAME = "underwriter_dataset.zip"

os.makedirs(os.path.join(DATASET_DIR, "policies"), exist_ok=True)
os.makedirs(os.path.join(DATASET_DIR, "claims"), exist_ok=True)
os.makedirs(os.path.join(DATASET_DIR, "s3_structure", "raw-claims"), exist_ok=True)

policies = [
    {
        "policyNumber": "POL-77788",
        "claimantName": "Rajesh Kumar",
        "claimantEmail": "rajesh.kumar@example.com",
        "policyType": "Health",
        "policyCompany": "Star Health & Allied Insurance",
        "sumInsured": 500000,
        "policyStartDate": "2024-01-15",
        "policyEndDate": "2026-01-14",
        "preExistingConditions": ["Hypertension (Declared 2022)"],
        "deductibleAmount": 5000,
        "copayPercentage": 10.0,
        "status": "Active"
    },
    {
        "policyNumber": "POL-88213",
        "claimantName": "Ananya Sharma",
        "claimantEmail": "ananya.s@example.com",
        "policyType": "Motor",
        "policyCompany": "ICICI Lombard General Insurance",
        "sumInsured": 800000,
        "policyStartDate": "2024-06-01",
        "policyEndDate": "2025-05-31",
        "preExistingConditions": [],
        "deductibleAmount": 2000,
        "copayPercentage": 0.0,
        "status": "Active"
    }
]

claims = [
    {
        "id": "CLM-77788-01",
        "policyNumber": "POL-77788",
        "claimantName": "Rajesh Kumar",
        "policyType": "Health",
        "policyCompany": "Star Health & Allied Insurance",
        "sumInsured": 500000,
        "policyStartDate": "2024-01-15",
        "incidentDate": "2026-01-20",
        "claimAmount": 125000,
        "reserveAmount": 125000,
        "description": "Emergency hospitalization for acute appendicitis at Apollo Hospital. Laparoscopic appendectomy performed.",
        "status": "submitted",
        "riskScore": 15,
        "fraudDetectorScore": 12,
        "aiSummary": "Health claim for ₹1,25,000 under active policy POL-77788. Discharge summary, itemized invoice, and lab reports verified.",
        "aiRecommendation": "Approve",
        "citedClause": "Health Policy Schedule — Clause 4.2 (Surgical Reimbursement)",
        "aiConfidenceScore": "97.5%",
        "submittedAt": datetime.now().isoformat()
    }
]

with open(os.path.join(DATASET_DIR, "policies", "policies_master.json"), "w", encoding="utf-8") as f:
    json.dump(policies, f, indent=2)

with open(os.path.join(DATASET_DIR, "claims", "claims_master.json"), "w", encoding="utf-8") as f:
    json.dump(claims, f, indent=2)

sql_content = """-- Underwriter AI Seed SQL Script for MS SQL Server
USE [UnderwriterDB];
GO

INSERT INTO dbo.Policies (PolicyNumber, ClaimantName, ClaimantEmail, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, PolicyEndDate, PreExistingConditions, DeductibleAmount, CopayPercentage, Status)
VALUES 
('POL-77788', 'Rajesh Kumar', 'rajesh.kumar@example.com', 'Health', 'Star Health & Allied Insurance', 500000.00, '2024-01-15', '2026-01-14', '["Hypertension (Declared 2022)"]', 5000.00, 10.00, 'Active'),
('POL-88213', 'Ananya Sharma', 'ananya.s@example.com', 'Motor', 'ICICI Lombard General Insurance', 800000.00, '2024-06-01', '2025-05-31', '[]', 2000.00, 0.00, 'Active');
GO

INSERT INTO dbo.Claims (Id, PolicyNumber, ClaimantName, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, IncidentDate, ClaimAmount, ReserveAmount, Status, RiskScore, FraudDetectorScore, AiSummary, AiRecommendation, CitedClause, AiConfidenceScore)
VALUES
('CLM-77788-01', 'POL-77788', 'Rajesh Kumar', 'Health', 'Star Health & Allied Insurance', 500000.00, '2024-01-15', '2026-01-20', 125000.00, 125000.00, 'submitted', 15, 12, 'Health claim for ₹1,25,000 under active policy POL-77788.', 'Approve', 'Health Policy Schedule — Clause 4.2', '97.5%');
GO
"""

with open(os.path.join(DATASET_DIR, "seed_data.sql"), "w", encoding="utf-8") as f:
    f.write(sql_content)

# Zip dataset
with zipfile.ZipFile(ZIP_FILENAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(DATASET_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, DATASET_DIR)
            zipf.write(full_path, rel_path)

print(f"Dataset successfully created and compressed into {ZIP_FILENAME}")
