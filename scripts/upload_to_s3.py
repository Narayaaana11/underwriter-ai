import os
import json
import subprocess

BUCKET = "underwriter-ai"
DATA_DIR = r"c:\Users\naray\OneDrive\Desktop\Underwriter agent\underwriter_50_people_dataset\2"

files_to_upload = [
    ("50_claims_master.json", "dataset/claims/50_claims_master.json"),
    ("50_ocr_extractions.json", "dataset/ocr/50_ocr_extractions.json"),
    ("50_policies_master.json", "dataset/policies/50_policies_master.json"),
    ("seed_50_people.sql", "dataset/sql/seed_50_people.sql")
]

print(f"Uploading 50-person dataset to S3 bucket: s3://{BUCKET}/...")

for local_filename, s3_key in files_to_upload:
    local_path = os.path.join(DATA_DIR, local_filename)
    if os.path.exists(local_path):
        cmd = f'aws s3 cp "{local_path}" "s3://{BUCKET}/{s3_key}"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"✅ Uploaded: {local_filename} -> s3://{BUCKET}/{s3_key}")
        else:
            print(f"❌ Error uploading {local_filename}: {res.stderr}")

# Also populate claim document mock entries in s3://underwriter-ai/raw-claims/
with open(os.path.join(DATA_DIR, "50_claims_master.json"), "r", encoding="utf-8") as f:
    claims = json.load(f)

for claim in claims:
    pol_id = claim.get("policy_number", "POL-00000")
    claim_id = claim.get("claim_id", "CLM-00000")
    s3_prefix = f"raw-claims/policy-{pol_id}/{claim_id}"
    
    # Save claim detail json to s3
    claim_json_str = json.dumps(claim, indent=2)
    cmd = f'aws s3 cp - "s3://{BUCKET}/{s3_prefix}/claim_details.json"'
    subprocess.run(cmd, input=claim_json_str, shell=True, capture_output=True, text=True)

print("🎉 Complete 50-person dataset successfully uploaded to Amazon S3!")
