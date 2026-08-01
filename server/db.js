import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function calculateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const SEED_CLAIMS = [
  {
    id: "CLM-88213-01",
    claimantName: "Ramesh Kumar",
    policyNumber: "POL-88213",
    policyType: "Health",
    sumInsured: 500000,
    policyStartDate: calculateDaysAgo(620),
    incidentDate: calculateDaysAgo(9),
    claimAmount: 145000,
    contactNumber: "+91 98765 43210",
    description: "Hospitalized for 4 days for acute appendicitis, underwent laparoscopic surgery at Apollo Hospital.",
    documents: [
      { id: "DOC-101", name: "Hospital Discharge Summary.pdf", type: "Medical Report", s3Key: "claims/CLM-88213-01/discharge.pdf", extractedFields: { hospitalName: "Apollo Hospital", diagnosis: "Acute Appendicitis (K35.8)", procedure: "Laparoscopic Appendectomy", admissionDate: calculateDaysAgo(13), dischargeDate: calculateDaysAgo(9), billedAmount: "₹1,45,000" } },
      { id: "DOC-102", name: "Final Itemized Bill.pdf", type: "Bill/Invoice", s3Key: "claims/CLM-88213-01/final_bill.pdf", extractedFields: { invoiceNo: "APH-2026-8841", roomCharges: "₹32,000", OTCharges: "₹45,000", surgeonFees: "₹40,000", pharmacy: "₹28,000", total: "₹1,45,000" } },
      { id: "DOC-103", name: "Aadhaar Card Copy.pdf", type: "ID Proof", s3Key: "claims/CLM-88213-01/aadhaar.pdf", extractedFields: { idType: "Aadhaar", idNumber: "XXXX-XXXX-4912", holderName: "Ramesh Kumar", dob: "1984-06-15" } }
    ],
    status: "submitted",
    riskScore: 15,
    riskFlags: [
      { flag: "within early-claim window", impact: 15, severity: "warning" }
    ],
    fraudDetectorScore: 8,
    aiSummary: "Claimant was admitted to Apollo Hospital for acute appendicitis and underwent standard laparoscopic appendectomy. Claim amount ₹1,45,000 is within 29% of policy sum insured (₹5,000,000). Documentation is complete with valid discharge summary, itemized bill, and identity verification.",
    aiRecommendation: "Approve",
    aiReasoning: "Procedure and billing match standard clinical guidelines for acute appendicitis under Health Policy Clause 4.2. Incident occurred within 9 days of filing, well beyond the initial 30-day waiting period (policy start 620 days ago).",
    assignedUnderwriterId: "UW-102",
    assignedUnderwriterName: "Ananya Sharma",
    submittedAt: calculateDaysAgo(8) + "T10:15:00Z",
    decidedAt: null,
    decidedBy: null,
    reserveAmount: 145000,
    investigatorFindings: null,
    disbursementDetails: null,
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Ramesh Kumar (Claimant)", timestamp: calculateDaysAgo(8) + "T10:15:00Z" },
      { action: "SQS_ENQUEUED", actor: "System (SQS)", timestamp: calculateDaysAgo(8) + "T10:15:05Z" },
      { action: "TEXTRACT_PROCESSED", actor: "System (Textract)", timestamp: calculateDaysAgo(8) + "T10:15:20Z" },
      { action: "AUTO_ASSIGNED", actor: "System (Workload Balancer)", timestamp: calculateDaysAgo(8) + "T10:15:25Z" }
    ]
  },
  {
    id: "CLM-91027-01",
    claimantName: "Priya Nair",
    policyNumber: "POL-91027",
    policyType: "Motor",
    sumInsured: 800000,
    policyStartDate: calculateDaysAgo(14),
    incidentDate: calculateDaysAgo(2),
    claimAmount: 610000,
    contactNumber: "+91 98123 45678",
    description: "Car collided with a divider on the highway, front end damaged.",
    documents: [
      { id: "DOC-201", name: "Damage Front View.jpg", type: "Photos", s3Key: "claims/CLM-91027-01/front_damage.jpg", extractedFields: { photoType: "Vehicle Visual Assessment", primaryImpact: "Front Bumper & Radiator Grille", estimatedSeverity: "Major Structural Damage" } }
    ],
    status: "review",
    riskScore: 85,
    riskFlags: [
      { flag: "possible waiting-period violation", impact: 40, severity: "alert" },
      { flag: "unusually high vs sum insured", impact: 30, severity: "alert" },
      { flag: "may be insufficient for verification", impact: 15, severity: "warning" }
    ],
    fraudDetectorScore: 78,
    aiSummary: "High-risk motor claim filed just 14 days after policy inception for ₹6,10,000 (76% of vehicle IDV ₹8,00,000). Only damage photographs attached without repair estimate or FIR/police entry. Early claim window and high claim percentage raise significant fraud risk indicators.",
    aiRecommendation: "Investigate Further",
    aiReasoning: "Triggered multiple risk flags under Motor Policy Rider 3.1 (Early Inception Loss). Requires physical surveyor inspection to verify impact patterns match reported highway divider incident and check for pre-existing damage.",
    assignedUnderwriterId: "UW-101",
    assignedUnderwriterName: "Vikram Malhotra",
    submittedAt: calculateDaysAgo(2) + "T14:30:00Z",
    decidedAt: null,
    decidedBy: null,
    reserveAmount: 610000,
    investigatorFindings: { surveyorName: "Rajesh Gupta (AutoInspect Ltd)", status: "Assigned", report: "Surveyor appointed to inspect vehicle at City Garage, Sector 18 on Monday." },
    disbursementDetails: null,
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Priya Nair (Claimant)", timestamp: calculateDaysAgo(2) + "T14:30:00Z" },
      { action: "TEXTRACT_PROCESSED", actor: "System (Textract)", timestamp: calculateDaysAgo(2) + "T14:30:15Z" },
      { action: "RISK_SCORE_EVALUATED", actor: "System (Risk Engine)", timestamp: calculateDaysAgo(2) + "T14:30:20Z" },
      { action: "STATUS_CHANGED", actor: "Vikram Malhotra (Underwriter)", timestamp: calculateDaysAgo(1) + "T09:00:00Z", details: "Moved to UNDER REVIEW - Assigned Surveyor" }
    ]
  },
  {
    id: "CLM-77410-01",
    claimantName: "Arjun Reddy",
    policyNumber: "POL-77410",
    policyType: "Health",
    sumInsured: 300000,
    policyStartDate: calculateDaysAgo(900),
    incidentDate: calculateDaysAgo(30),
    claimAmount: 42000,
    contactNumber: "+91 97654 32109",
    description: "Outpatient treatment for dengue fever, blood tests and medication over one week, fully recovered.",
    documents: [
      { id: "DOC-301", name: "Complete Blood Count Lab Reports.pdf", type: "Medical Report", s3Key: "claims/CLM-77410-01/lab_report.pdf", extractedFields: { testName: "CBC & Dengue NS1 Antigen", result: "Positive NS1, Platelet Count 85,000/uL", labName: "Metropolis Diagnostics" } },
      { id: "DOC-302", name: "Pharmacy Tax Bills.pdf", type: "Bill/Invoice", s3Key: "claims/CLM-77410-01/pharmacy_bill.pdf", extractedFields: { vendor: "Apollo Pharmacy", totalAmount: "₹14,200", items: "IV Fluids, Paracetamol, Antiemetics, Supplements" } },
      { id: "DOC-303", name: "Doctor Consultation Prescription.pdf", type: "Medical Report", s3Key: "claims/CLM-77410-01/prescription.pdf", extractedFields: { doctorName: "Dr. K. S. Rao, MD", diagnosis: "Dengue Fever with mild thrombocytopenia", advice: "OPD management, hydration, daily CBC" } }
    ],
    status: "approved",
    riskScore: 0,
    riskFlags: [],
    fraudDetectorScore: 3,
    aiSummary: "Claim for OPD Dengue treatment totaling ₹42,000 against sum insured ₹3,00,000. Policy active for 900 days. Full diagnostic lab proof, doctor prescription, and verified pharmacy invoices attached.",
    aiRecommendation: "Approve",
    aiReasoning: "Claim fully complies with Health Policy OPD OPD Cover Add-on Clause 7.1. Low risk score (0/100), verified lab diagnostics, zero waiting period concerns.",
    assignedUnderwriterId: "UW-103",
    assignedUnderwriterName: "Siddharth Verma",
    submittedAt: calculateDaysAgo(25) + "T11:00:00Z",
    decidedAt: calculateDaysAgo(24) + "T16:20:00Z",
    decidedBy: "Siddharth Verma (Underwriter)",
    reserveAmount: 42000,
    investigatorFindings: null,
    disbursementDetails: { approvedAmount: 42000, payoutMethod: "NEFT", bankDetailsRef: "HDFC-XXXX-8819", status: "Completed", disbursedAt: calculateDaysAgo(23) + "T10:00:00Z" },
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Arjun Reddy (Claimant)", timestamp: calculateDaysAgo(25) + "T11:00:00Z" },
      { action: "AI_RECOMMENDATION_GENERATED", actor: "AWS Bedrock (Claude 3.5)", timestamp: calculateDaysAgo(25) + "T11:00:15Z" },
      { action: "CLAIM_APPROVED", actor: "Siddharth Verma (Underwriter)", timestamp: calculateDaysAgo(24) + "T16:20:00Z" },
      { action: "PAYOUT_DISBURSED", actor: "System (Disbursement Ledger)", timestamp: calculateDaysAgo(23) + "T10:00:00Z" }
    ]
  },
  {
    id: "CLM-60312-01",
    claimantName: "Sunita Verma",
    policyNumber: "POL-60312",
    policyType: "Travel",
    sumInsured: 150000,
    policyStartDate: calculateDaysAgo(45),
    incidentDate: calculateDaysAgo(40),
    claimAmount: 138000,
    contactNumber: "+91 99112 23344",
    description: "Trip cancelled last minute.",
    documents: [],
    status: "rejected",
    riskScore: 70,
    riskFlags: [
      { flag: "unusually high vs sum insured", impact: 30, severity: "alert" },
      { flag: "may be insufficient for verification", impact: 15, severity: "warning" },
      { flag: "very brief, may need follow-up", impact: 10, severity: "warning" },
      { flag: "within early-claim window", impact: 15, severity: "warning" }
    ],
    fraudDetectorScore: 65,
    aiSummary: "Travel cancellation claim for ₹1,38,000 (92% of ₹1,50,000 sum insured). Zero supporting documentation (airline cancellation proof, hotel booking vouchers, medical emergency certificate) provided. Brief description (4 words).",
    aiRecommendation: "Reject",
    aiReasoning: "Non-compliance with Travel Policy Section 12 (Mandatory Proof of Trip Cancellation & Financial Loss). Claim filed without mandatory airline cancellation or non-refundable receipt evidence.",
    assignedUnderwriterId: "UW-102",
    assignedUnderwriterName: "Ananya Sharma",
    submittedAt: calculateDaysAgo(35) + "T09:10:00Z",
    decidedAt: calculateDaysAgo(34) + "T14:00:00Z",
    decidedBy: "Ananya Sharma (Underwriter)",
    reserveAmount: 0,
    investigatorFindings: null,
    disbursementDetails: null,
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Sunita Verma (Claimant)", timestamp: calculateDaysAgo(35) + "T09:10:00Z" },
      { action: "RISK_FLAGGED", actor: "System (Risk Engine)", timestamp: calculateDaysAgo(35) + "T09:10:05Z", details: "Zero documents attached" },
      { action: "CLAIM_REJECTED", actor: "Ananya Sharma (Underwriter)", timestamp: calculateDaysAgo(34) + "T14:00:00Z", details: "Rejected due to missing cancellation documents" }
    ]
  },
  {
    id: "CLM-53390-01",
    claimantName: "Mohammed Iqbal",
    policyNumber: "POL-53390",
    policyType: "Property",
    sumInsured: 2000000,
    policyStartDate: calculateDaysAgo(1200),
    incidentDate: calculateDaysAgo(5),
    claimAmount: 380000,
    contactNumber: "+91 98450 12345",
    description: "Kitchen fire caused by electrical short circuit damaged cabinetry, appliances, and part of the ceiling. Fire department report filed.",
    documents: [
      { id: "DOC-501", name: "Fire Department Incident Report.pdf", type: "Police Report (FIR)", s3Key: "claims/CLM-53390-01/fire_report.pdf", extractedFields: { department: "Mumbai Fire Brigade", incidentType: "Residential Fire (Electrical)", incidentTime: calculateDaysAgo(5) + " 18:45", casualty: "None", cause: "Short circuit in modular kitchen wiring" } },
      { id: "DOC-502", name: "Contractor Repair Estimate.pdf", type: "Bill/Invoice", s3Key: "claims/CLM-53390-01/repair_estimate.pdf", extractedFields: { contractor: "Urban Craft Interior Solutions", scope: "Ceiling replastering, cabinetry replacement, rewiring", estimatedTotal: "₹3,80,000" } },
      { id: "DOC-503", name: "Kitchen Fire Damage Photos.pdf", type: "Photos", s3Key: "claims/CLM-53390-01/kitchen_photos.pdf", extractedFields: { photoCount: 6, areaViewed: "Kitchen & Ceiling", damageVerified: "Soot marks, charred wooden cabinets, melted conduit" } },
      { id: "DOC-504", name: "Property Ownership Deed.pdf", type: "Other", s3Key: "claims/CLM-53390-01/property_deed.pdf", extractedFields: { owner: "Mohammed Iqbal", propertyAddress: "Flat 402, Sea Crest Apartments, Bandra West, Mumbai" } }
    ],
    status: "submitted",
    riskScore: 0,
    riskFlags: [],
    fraudDetectorScore: 4,
    aiSummary: "Property loss claim for ₹3,80,000 following an electrical kitchen fire. Policy active for 1,200 days with total sum insured ₹20,00,000 (claim is 19%). Full documentation attached including official Fire Brigade report, contractor repair estimate, photographs, and title deed.",
    aiRecommendation: "Approve",
    aiReasoning: "Property Fire Policy Clause 1A covers accidental electrical fire. Official municipal fire report confirms short-circuit cause without negligence. Contractor estimate is itemized and realistic.",
    assignedUnderwriterId: "UW-101",
    assignedUnderwriterName: "Vikram Malhotra",
    submittedAt: calculateDaysAgo(4) + "T16:45:00Z",
    decidedAt: null,
    decidedBy: null,
    reserveAmount: 380000,
    investigatorFindings: null,
    disbursementDetails: null,
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Mohammed Iqbal (Claimant)", timestamp: calculateDaysAgo(4) + "T16:45:00Z" },
      { action: "TEXTRACT_PROCESSED", actor: "System (Textract)", timestamp: calculateDaysAgo(4) + "T16:45:12Z" },
      { action: "MACIE_SCAN_PASSED", actor: "AWS Macie", timestamp: calculateDaysAgo(4) + "T16:45:18Z", details: "No unencrypted PII leaked" },
      { action: "AUTO_ASSIGNED", actor: "System (Workload Balancer)", timestamp: calculateDaysAgo(4) + "T16:45:22Z" }
    ]
  },
  {
    id: "CLM-88213-02",
    claimantName: "Ramesh Kumar",
    policyNumber: "POL-88213",
    policyType: "Health",
    sumInsured: 500000,
    policyStartDate: calculateDaysAgo(620),
    incidentDate: calculateDaysAgo(200),
    claimAmount: 60000,
    contactNumber: "+91 98765 43210",
    description: "Routine cataract surgery, single day procedure, no complications.",
    documents: [
      { id: "DOC-601", name: "Eye Hospital Bill.pdf", type: "Bill/Invoice", s3Key: "claims/CLM-88213-02/eye_bill.pdf", extractedFields: { hospital: "Sankar Nethralaya", procedure: "Phacoemulsification with Foldable IOL", total: "₹60,000" } },
      { id: "DOC-602", name: "Discharge Summary Cataract.pdf", type: "Medical Report", s3Key: "claims/CLM-88213-02/cataract_discharge.pdf", extractedFields: { surgeon: "Dr. S. Natarajan", eye: "Right Eye", outcome: "Uneventful surgery, visual recovery 6/6" } }
    ],
    status: "approved",
    riskScore: 0,
    riskFlags: [],
    fraudDetectorScore: 2,
    aiSummary: "Day-care cataract procedure for ₹60,000 on policy POL-88213 (same policy as Claim CLM-88213-01). Sum insured ₹5,00,000. All hospital discharge and lens billing records verified.",
    aiRecommendation: "Approve",
    aiReasoning: "Cataract surgery covered under Health Policy Specific Disease Sub-limit Clause 5.4 after 2-year waiting period (policy start 620 days ago). Billing is within sub-limit cap of ₹65,000.",
    assignedUnderwriterId: "UW-103",
    assignedUnderwriterName: "Siddharth Verma",
    submittedAt: calculateDaysAgo(190) + "T08:30:00Z",
    decidedAt: calculateDaysAgo(189) + "T11:15:00Z",
    decidedBy: "Siddharth Verma (Underwriter)",
    reserveAmount: 60000,
    investigatorFindings: null,
    disbursementDetails: { approvedAmount: 60000, payoutMethod: "NEFT", bankDetailsRef: "HDFC-XXXX-8819", status: "Completed", disbursedAt: calculateDaysAgo(188) + "T09:00:00Z" },
    auditTrail: [
      { action: "CLAIM_SUBMITTED", actor: "Ramesh Kumar (Claimant)", timestamp: calculateDaysAgo(190) + "T08:30:00Z" },
      { action: "CLAIM_APPROVED", actor: "Siddharth Verma (Underwriter)", timestamp: calculateDaysAgo(189) + "T11:15:00Z" },
      { action: "PAYOUT_DISBURSED", actor: "System (Disbursement Ledger)", timestamp: calculateDaysAgo(188) + "T09:00:00Z" }
    ]
  }
];

const DEFAULT_USERS = [
  { id: "USR-001", name: "Ramesh Kumar", role: "claimant", email: "ramesh.k@example.com", policyNumbers: ["POL-88213"] },
  { id: "USR-002", name: "Vikram Malhotra", role: "underwriter", email: "v.malhotra@ledger-insurance.com", specialty: "Motor & Property" },
  { id: "USR-003", name: "Ananya Sharma", role: "underwriter", email: "a.sharma@ledger-insurance.com", specialty: "Health & Travel" },
  { id: "USR-004", name: "Siddharth Verma", role: "senior_underwriter", email: "s.verma@ledger-insurance.com", specialty: "High-Value Claims & Escalations" },
  { id: "USR-005", name: "System Admin", role: "admin", email: "admin@ledger-insurance.com", specialty: "System Management" }
];

const DEFAULT_CONFIG = {
  autoApprovalThresholds: {
    Health: 100000,
    Motor: 150000,
    Life: 500000,
    Travel: 50000,
    Property: 250000
  },
  seniorApprovalThreshold: 500000
};

class Store {
  constructor() {
    this.claims = [];
    this.users = [];
    this.config = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.claims = data.claims || SEED_CLAIMS;
        this.users = data.users || DEFAULT_USERS;
        this.config = data.config || DEFAULT_CONFIG;
      } else {
        this.claims = [...SEED_CLAIMS];
        this.users = [...DEFAULT_USERS];
        this.config = { ...DEFAULT_CONFIG };
        this.save();
      }
    } catch (err) {
      console.error("Error reading db store file, reinitializing defaults:", err);
      this.claims = [...SEED_CLAIMS];
      this.users = [...DEFAULT_USERS];
      this.config = { ...DEFAULT_CONFIG };
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        claims: this.claims,
        users: this.users,
        config: this.config
      }, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error saving db store file:", err);
    }
  }

  getAllClaims() {
    return this.claims;
  }

  getClaimById(id) {
    return this.claims.find(c => c.id === id);
  }

  getClaimsByPolicyNumber(policyNumber) {
    return this.claims.filter(c => c.policyNumber === policyNumber);
  }

  addClaim(claim) {
    this.claims.unshift(claim);
    this.save();
    return claim;
  }

  updateClaim(id, updates) {
    const idx = this.claims.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.claims[idx] = { ...this.claims[idx], ...updates };
      this.save();
      return this.claims[idx];
    }
    return null;
  }

  getUsers() {
    return this.users;
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.save();
    return this.config;
  }
}

export const db = new Store();
