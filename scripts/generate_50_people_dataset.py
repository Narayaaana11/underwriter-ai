import os
import json
import random
import zipfile
from datetime import datetime, timedelta

DATASET_DIR = "underwriter_50_people_dataset"
ZIP_FILENAME = "underwriter_50_people_dataset.zip"

os.makedirs(os.path.join(DATASET_DIR, "policies"), exist_ok=True)
os.makedirs(os.path.join(DATASET_DIR, "claims"), exist_ok=True)
os.makedirs(os.path.join(DATASET_DIR, "ocr_extractions"), exist_ok=True)
os.makedirs(os.path.join(DATASET_DIR, "documents"), exist_ok=True)

FIRST_NAMES = ["Rajesh", "Priya", "Vikram", "Ananya", "Siddharth", "Sunita", "Arun", "Meera", "Rohan", "Kavita",
               "Amit", "Deepa", "Suresh", "Pooja", "Manish", "Neha", "Vijay", "Aarti", "Sanjay", "Swati",
               "Rahul", "Divya", "Alok", "Shweta", "Gaurav", "Nisha", "Karan", "Tanvi", "Vikas", "Ritu",
               "Nikhil", "Simran", "Tarun", "Bhavna", "Abhishek", "Jyoti", "Dinesh", "Kiran", "Varun", "Rekha",
               "Ashok", "Preeti", "Harish", "Seema", "Rakesh", "Anjali", "Manoj", "Sangeeta", "Pradeep", "Rashmi"]

LAST_NAMES = ["Kumar", "Sharma", "Mehta", "Malhotra", "Verma", "Agarwal", "Krishnamurthy", "Patil", "Deshmukh", "Nair",
              "Joshi", "Gupta", "Saxena", "Chawla", "Bhasin", "Reddy", "Rao", "Hegde", "Pillai", "Iyer"]

HOSPITALS = ["Apollo Multi-Specialty Hospital", "Fortis Healthcare Center", "Manipal Hospital", "Max Super Specialty Hospital", "Columbia Asia Hospital"]
MOTOR_MAKES = ["Honda City sedan", "Hyundai Creta SUV", "Maruti Suzuki Swift", "Tata Nexon EV", "Toyota Innova Crysta"]
PROPERTY_TYPES = ["Residential Villa", "Apartment Complex Unit", "Commercial Office Space", "Retail Shop Unit"]

POLICY_TYPES = ["Health", "Motor", "Property", "Life"]

policies = []
claims = []
sql_statements = ["USE [UnderwriterDB];\nGO\n"]

for i in range(1, 51):
    pol_id = f"POL-{77000 + i}"
    clm_id = f"CLM-{77000 + i}-01"
    name = f"{FIRST_NAMES[(i-1) % len(FIRST_NAMES)]} {LAST_NAMES[(i-1) % len(LAST_NAMES)]}"
    email = f"{name.lower().replace(' ', '.')}@example.com"
    pol_type = POLICY_TYPES[i % len(POLICY_TYPES)]
    company = "Star Health & Allied Insurance" if pol_type == "Health" else ("ICICI Lombard" if pol_type == "Motor" else "HDFC ERGO General Insurance")
    
    sum_insured = random.choice([300000, 500000, 800000, 1000000, 2000000])
    claim_amount = int(sum_insured * random.uniform(0.15, 0.85))
    
    ped_options = [
        [], ["Hypertension (Declared 2022)"], ["Type-2 Diabetes (Declared 2021)"],
        ["Asthma (Declared 2020)"], ["Thyroid Disorder (Declared 2023)"]
    ]
    peds = ped_options[i % len(ped_options)]
    
    start_days_ago = random.randint(100, 600)
    incident_days_ago = random.randint(5, 30)
    start_date = (datetime.now() - timedelta(days=start_days_ago)).strftime("%Y-%m-%d")
    end_date = (datetime.now() + timedelta(days=365 - start_days_ago)).strftime("%Y-%m-%d")
    incident_date = (datetime.now() - timedelta(days=incident_days_ago)).strftime("%Y-%m-%d")

    policy_record = {
        "policyNumber": pol_id,
        "claimantName": name,
        "claimantEmail": email,
        "policyType": pol_type,
        "policyCompany": company,
        "sumInsured": sum_insured,
        "policyStartDate": start_date,
        "policyEndDate": end_date,
        "preExistingConditions": peds,
        "deductibleAmount": 5000 if pol_type == "Health" else 2000,
        "copayPercentage": 10.0 if len(peds) > 0 else 0.0,
        "status": "Active"
    }
    policies.append(policy_record)

    risk_score = random.randint(10, 45)
    rec = "Approve" if risk_score < 25 else ("Investigate" if risk_score < 38 else "Escalate")
    
    claim_record = {
        "id": clm_id,
        "policyNumber": pol_id,
        "claimantName": name,
        "policyType": pol_type,
        "policyCompany": company,
        "sumInsured": sum_insured,
        "policyStartDate": start_date,
        "incidentDate": incident_date,
        "claimAmount": claim_amount,
        "reserveAmount": claim_amount,
        "description": f"Claim filed for {pol_type} policy {pol_id}. Incident date: {incident_date}. Total requested reimbursement: ₹{claim_amount:,}.",
        "status": "submitted" if rec == "Approve" else ("review" if rec == "Investigate" else "escalated"),
        "riskScore": risk_score,
        "fraudDetectorScore": risk_score - random.randint(0, 5),
        "aiSummary": f"{pol_type} claim for ₹{claim_amount:,} under policy {pol_id}. All submitted proof documents OCR verified with high confidence.",
        "aiRecommendation": rec,
        "citedClause": f"{pol_type} Policy Schedule — Clause 4.2 Coverage Terms",
        "aiConfidenceScore": f"{random.uniform(93.0, 98.9):.1f}%",
        "submittedAt": datetime.now().isoformat()
    }
    claims.append(claim_record)

    # SQL Insert
    peds_json = json.dumps(peds).replace("'", "''")
    sql_statements.append(
        f"INSERT INTO dbo.Policies (PolicyNumber, ClaimantName, ClaimantEmail, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, PolicyEndDate, PreExistingConditions, DeductibleAmount, CopayPercentage, Status) "
        f"VALUES ('{pol_id}', '{name}', '{email}', '{pol_type}', '{company}', {sum_insured:.2f}, '{start_date}', '{end_date}', '{peds_json}', 5000.00, 10.00, 'Active');\n"
    )
    sql_statements.append(
        f"INSERT INTO dbo.Claims (Id, PolicyNumber, ClaimantName, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, IncidentDate, ClaimAmount, ReserveAmount, Status, RiskScore, FraudDetectorScore, AiSummary, AiRecommendation, CitedClause, AiConfidenceScore) "
        f"VALUES ('{clm_id}', '{pol_id}', '{name}', '{pol_type}', '{company}', {sum_insured:.2f}, '{start_date}', '{incident_date}', {claim_amount:.2f}, {claim_amount:.2f}, '{claim_record['status']}', {risk_score}, {claim_record['fraudDetectorScore']}, '{claim_record['aiSummary']}', '{rec}', '{claim_record['citedClause']}', '{claim_record['aiConfidenceScore']}');\n"
    )

with open(os.path.join(DATASET_DIR, "policies", "50_policies_master.json"), "w", encoding="utf-8") as f:
    json.dump(policies, f, indent=2)

with open(os.path.join(DATASET_DIR, "claims", "50_claims_master.json"), "w", encoding="utf-8") as f:
    json.dump(claims, f, indent=2)

with open(os.path.join(DATASET_DIR, "seed_50_people.sql"), "w", encoding="utf-8") as f:
    f.writelines(sql_statements)

with zipfile.ZipFile(ZIP_FILENAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(DATASET_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, DATASET_DIR)
            zipf.write(full_path, rel_path)

print(f"50-person dataset created and zipped successfully: {ZIP_FILENAME}")
