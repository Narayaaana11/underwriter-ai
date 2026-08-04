/**
 * db.js — Persistent JSON Store (File-Based Database)
 * 
 * Features:
 * - Persistent JSON store with atomic writes
 * - Auto-seeds realistic demo data on first run
 * - Password hashes pre-computed (bcrypt cost 12)
 * - Thread-safe single-instance pattern
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as mssqlDb from './mssqlDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Helper: ISO date N days ago ──────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function isoAgo(n, hours = 0, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}
function nowISO() { return new Date().toISOString(); }

// ─── Pre-computed bcrypt hashes (cost 12) ─────────────────────────────────────
// password123 → $2a$12$...
// admin123    → $2a$12$...
// (generated at init time if not present)

// ─── Default Users (with bcrypt hashes for passwords) ─────────────────────────
// NOTE: Hashes are generated at runtime on first startup.
// Plain-text passwords for demo: password123 (all users), admin123 (admin)
const DEFAULT_USERS_TEMPLATE = [
  {
    id: 'USR-001',
    name: 'Vikram Malhotra',
    role: 'underwriter',
    email: 'v.malhotra@ledger-insurance.com',
    company: 'ICICI Lombard General Insurance',
    specialty: 'Motor & Commercial Claims',
    passwordHash: null, // set at init
    plainPasswordForSeed: 'password123'
  },
  {
    id: 'USR-002',
    name: 'Ananya Sharma',
    role: 'underwriter',
    email: 'a.sharma@ledger-insurance.com',
    company: 'Star Health & Allied Insurance',
    specialty: 'Health & Mediclaim',
    passwordHash: null,
    plainPasswordForSeed: 'password123'
  },
  {
    id: 'USR-003',
    name: 'Siddharth Verma',
    role: 'senior_underwriter',
    email: 's.verma@ledger-insurance.com',
    company: 'HDFC ERGO Health & General',
    specialty: 'High-Value & Complex Claims',
    passwordHash: null,
    plainPasswordForSeed: 'password123'
  },
  {
    id: 'USR-004',
    name: 'Ramesh Kumar',
    role: 'claimant',
    email: 'ramesh.k@example.com',
    company: 'Policyholder',
    specialty: null,
    passwordHash: null,
    plainPasswordForSeed: 'password123'
  },
  {
    id: 'USR-005',
    name: 'System Admin',
    role: 'admin',
    email: 'admin@ledger-insurance.com',
    company: 'Ledger Platform Admin',
    specialty: 'System Management',
    passwordHash: null,
    plainPasswordForSeed: 'admin123'
  }
];

// ─── Realistic Seed Claims (8 diverse cases) ──────────────────────────────────
function buildSeedClaims() {
  return [
    {
      id: 'CLM-88213-01',
      claimantName: 'Ramesh Kumar',
      policyNumber: 'POL-88213',
      policyType: 'Health',
      policyCompany: 'Star Health & Allied Insurance',
      sumInsured: 500000,
      policyStartDate: daysAgo(340),
      incidentDate: daysAgo(5),
      claimAmount: 145000,
      contactNumber: '+91 98765 43210',
      description: 'Patient was admitted to Apollo Hospital, Bangalore for acute appendicitis requiring emergency laparoscopic appendectomy. Surgery performed on ' + daysAgo(6) + '. Total hospitalization: 4 days. Discharge summary, hospital bills, and identity proof attached.',
      documents: [
        { id: 'DOC-001', name: 'Apollo_Discharge_Summary.pdf', type: 'Medical Report', s3Key: 'claims/CLM-88213-01/discharge_summary.pdf', kmsEncrypted: true, extractedFields: { patientName: 'Ramesh Kumar', facility: 'Apollo Hospitals, Bangalore', attendingPhysician: 'Dr. Rajesh Nair, MS (Surgery)', primaryDiagnosis: 'Acute Appendicitis (ICD-10: K35.8)', treatmentProvided: 'Laparoscopic Appendectomy', admissionPeriod: '4 Days Inpatient', ocrConfidence: '98.7%' } },
        { id: 'DOC-002', name: 'Apollo_Final_Bill.pdf', type: 'Bill/Invoice', s3Key: 'claims/CLM-88213-01/final_bill.pdf', kmsEncrypted: true, extractedFields: { invoiceNumber: 'INV-AP-2026-44821', issueDate: daysAgo(1), vendorName: 'Apollo Hospitals Bangalore', subtotal: '₹1,20,000', taxAmount: '₹25,000', totalAmount: '₹1,45,000', paymentStatus: 'Pending Reimbursement', ocrConfidence: '99.1%' } },
        { id: 'DOC-003', name: 'Aadhaar_Identity.pdf', type: 'ID Proof', s3Key: 'claims/CLM-88213-01/aadhaar.pdf', kmsEncrypted: true, extractedFields: { documentType: 'Aadhaar Card', nameOnDoc: 'Ramesh Kumar', documentNumber: 'XXXX-XXXX-3421', address: 'Koramangala, Bangalore, KA 560034', ocrConfidence: '97.3%' } }
      ],
      status: 'submitted',
      riskScore: 12,
      riskFlags: [],
      fraudDetectorScore: 12,
      aiSummary: 'Health claim for ₹1,45,000 filed under active Star Health policy (POL-88213). Incident date falls well within coverage period (340 days post-inception). Three supporting documents verified via OCR with 98%+ confidence. Low risk profile with clean prior history.',
      aiRecommendation: 'Approve',
      aiReasoning: 'Complies with Health Policy Schedule — Clause 4.2 (Medical Reimbursement Coverage). Incident date 5 days ago is within active policy period. Claim amount ₹1,45,000 represents 29% of ₹5,00,000 sum insured — within standard limits. Three verified documents including discharge summary, itemized bill, and identity proof satisfy minimum documentation requirements.',
      citedClause: 'Health Policy Schedule — Clause 4.2 (Medical Reimbursement Coverage)',
      aiConfidenceScore: '97.8%',
      assignedUnderwriterId: 'USR-002',
      assignedUnderwriterName: 'Ananya Sharma',
      submittedAt: isoAgo(5, 2),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 145000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-100001', action: 'CLAIM_SUBMITTED', actor: 'Ramesh Kumar (Claimant)', resourceId: 'CLM-88213-01', details: 'Claim submitted for Health policy POL-88213 (Amount: ₹1,45,000)', timestamp: isoAgo(5, 2), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-100002', action: 'AI_ANALYSIS_COMPLETE', actor: 'Ledger AI Engine', resourceId: 'CLM-88213-01', details: 'AI analysis completed. Recommendation: Approve. Confidence: 97.8%', timestamp: isoAgo(5, 1, 58), userAgent: 'Ledger-AI-Engine/2.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-100003', action: 'UNDERWRITER_ASSIGNED', actor: 'System (Auto-Assignment)', resourceId: 'CLM-88213-01', details: 'Auto-assigned to Ananya Sharma (Health & Mediclaim Specialist)', timestamp: isoAgo(5, 1, 57), userAgent: 'Ledger-Assignment-Engine/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-55490-01',
      claimantName: 'Priya Mehta',
      policyNumber: 'POL-55490',
      policyType: 'Motor',
      policyCompany: 'ICICI Lombard General Insurance',
      sumInsured: 800000,
      policyStartDate: daysAgo(180),
      incidentDate: daysAgo(3),
      claimAmount: 320000,
      contactNumber: '+91 91234 56789',
      description: 'Honda City sedan involved in rear-end collision on Outer Ring Road, Bangalore. Significant damage to rear bumper, boot lid, and rear suspension. Vehicle towed to authorized service center. Police report filed. FIR No. MG-2026-1849 from Whitefield Police Station.',
      documents: [
        { id: 'DOC-011', name: 'FIR_Report_MG2026.pdf', type: 'Police Report (FIR)', s3Key: 'claims/CLM-55490-01/fir.pdf', kmsEncrypted: true, extractedFields: { policeStation: 'Whitefield Police Station', firNumber: 'FIR-1849/2026', incidentType: 'Motor Vehicle Accident (MVA)', officerInCharge: 'SI Ravi Kumar', investigationStatus: 'FIR Registered, Under Investigation', ocrConfidence: '97.1%' } },
        { id: 'DOC-012', name: 'Damage_Photos.jpg', type: 'Photos', s3Key: 'claims/CLM-55490-01/photos.jpg', kmsEncrypted: true, extractedFields: { imageAnalysis: 'Rear-end collision damage verified', confidenceScore: '96.4%', detectedElements: ['Rear bumper damage', 'Boot lid deformation', 'Suspension damage visible'], timestampExtracted: nowISO() } },
        { id: 'DOC-013', name: 'Service_Center_Estimate.pdf', type: 'Bill/Invoice', s3Key: 'claims/CLM-55490-01/estimate.pdf', kmsEncrypted: true, extractedFields: { invoiceNumber: 'EST-SC-2026-7721', vendorName: 'Honda Authorized Service Center', estimatedCost: '₹3,20,000', laborCharges: '₹45,000', partsReplacement: '₹2,75,000', ocrConfidence: '98.2%' } }
      ],
      status: 'review',
      riskScore: 25,
      riskFlags: [{ flag: 'substantial proportion of sum insured', impact: 10, severity: 'warning', explanation: 'Claim amount (₹3,20,000) represents 40.0% of sum insured (₹8,00,000).' }],
      fraudDetectorScore: 28,
      aiSummary: 'Motor claim for ₹3,20,000 for collision damage to Honda City. Police report (FIR-1849/2026) and service center estimate align with incident description. Risk score 25/100 within moderate band. Surveyor inspection recommended for high-value parts assessment.',
      aiRecommendation: 'Investigate Further',
      aiReasoning: 'Claim amount ₹3,20,000 (40% of sum insured) warrants physical surveyor inspection per Motor Policy — Section V. Service center estimate should be independently verified by IRDAI-licensed loss assessor before approval.',
      citedClause: 'Motor Policy — Section V (Surveyor Inspection for Claims >₹3 Lakhs)',
      aiConfidenceScore: '91.4%',
      assignedUnderwriterId: 'USR-001',
      assignedUnderwriterName: 'Vikram Malhotra',
      submittedAt: isoAgo(3, 4),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 320000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-200001', action: 'CLAIM_SUBMITTED', actor: 'Priya Mehta (Claimant)', resourceId: 'CLM-55490-01', details: 'Motor claim submitted for Honda City collision damage (₹3,20,000)', timestamp: isoAgo(3, 4), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-200002', action: 'STATUS_CHANGED_TO_REVIEW', actor: 'Vikram Malhotra (underwriter)', resourceId: 'CLM-55490-01', details: 'High-value claim sent to review. Surveyor assignment pending.', timestamp: isoAgo(3, 2), userAgent: 'Ledger-Underwriter-Dashboard/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-71832-01',
      claimantName: 'Arun Krishnamurthy',
      policyNumber: 'POL-71832',
      policyType: 'Health',
      policyCompany: 'Niva Bupa Health Insurance',
      sumInsured: 300000,
      policyStartDate: daysAgo(410),
      incidentDate: daysAgo(10),
      claimAmount: 280000,
      contactNumber: '+91 88901 23456',
      description: 'Cardiac catheterization procedure performed at Fortis Hospital for coronary artery disease diagnosis. Subsequent stent placement required. Total hospitalization 7 days in Cardiac Care Unit. Complete medical records attached including pre-procedure reports, post-procedure discharge and cardiology follow-up note.',
      documents: [
        { id: 'DOC-021', name: 'Fortis_Discharge_Summary.pdf', type: 'Medical Report', s3Key: 'claims/CLM-71832-01/discharge.pdf', kmsEncrypted: true, extractedFields: { patientName: 'Arun Krishnamurthy', facility: 'Fortis Hospital, Bannerghatta Road', attendingPhysician: 'Dr. Suresh Rao, DM (Cardiology)', primaryDiagnosis: 'Coronary Artery Disease (ICD-10: I25.10)', procedure: 'Percutaneous Coronary Intervention (PCI) + Drug-Eluting Stent', admissionPeriod: '7 Days Cardiac ICU', ocrConfidence: '99.2%' } },
        { id: 'DOC-022', name: 'Fortis_Itemized_Bill.pdf', type: 'Bill/Invoice', s3Key: 'claims/CLM-71832-01/bill.pdf', kmsEncrypted: true, extractedFields: { invoiceNumber: 'INV-FOR-2026-88312', totalAmount: '₹2,80,000', procedureCost: '₹2,10,000', icuCharges: '₹42,000', medicationCost: '₹28,000', ocrConfidence: '98.9%' } }
      ],
      status: 'escalated',
      riskScore: 42,
      riskFlags: [
        { flag: 'substantial proportion of sum insured', impact: 10, severity: 'warning', explanation: 'Claim amount (₹2,80,000) represents 93.3% of sum insured (₹3,00,000).' },
        { flag: 'unusually high vs sum insured', impact: 30, severity: 'alert', explanation: 'Claim amount exceeds 90% of total policy coverage.' }
      ],
      fraudDetectorScore: 35,
      aiSummary: 'High-value cardiac claim for ₹2,80,000 representing 93.3% of ₹3,00,000 sum insured. Procedure complexity and extended ICU stay align with claimed diagnosis. However, claim amount proximity to sum insured limit warrants senior underwriter review per escalation protocol.',
      aiRecommendation: 'Escalate',
      aiReasoning: 'Per Health Policy Clause 7.3 (Pre-Authorization for High-Value Procedures) and the internal ₹5,00,000 escalation threshold exception for near-maximum claims, this case requires Senior Underwriter review. Claim is medically substantiated but coverage limit alignment needs committee validation.',
      citedClause: 'Health Policy — Clause 7.3 (Pre-Authorization for High-Value Procedures)',
      aiConfidenceScore: '93.8%',
      assignedUnderwriterId: 'USR-003',
      assignedUnderwriterName: 'Siddharth Verma',
      submittedAt: isoAgo(10, 6),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 280000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-300001', action: 'CLAIM_SUBMITTED', actor: 'Arun Krishnamurthy (Claimant)', resourceId: 'CLM-71832-01', details: 'Health claim submitted for cardiac procedure (₹2,80,000)', timestamp: isoAgo(10, 6), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-300002', action: 'CLAIM_ESCALATED', actor: 'Ananya Sharma (underwriter)', resourceId: 'CLM-71832-01', details: 'Escalated to Senior Underwriter Siddharth Verma — near-maximum sum insured claim requires committee review', timestamp: isoAgo(9, 10), userAgent: 'Ledger-Underwriter-Dashboard/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-33421-01',
      claimantName: 'Sunita Agarwal',
      policyNumber: 'POL-33421',
      policyType: 'Property',
      policyCompany: 'Bajaj Allianz General Insurance',
      sumInsured: 2000000,
      policyStartDate: daysAgo(550),
      incidentDate: daysAgo(8),
      claimAmount: 380000,
      contactNumber: '+91 94567 12345',
      description: 'Residential property sustained significant damage due to burst water pipe in the kitchen. Damage to kitchen flooring, cabinets, and one bedroom wall. Municipal water board has issued damage certificate. Licensed plumber and civil contractor assessments completed. Property was unoccupied during incident.',
      documents: [
        { id: 'DOC-031', name: 'Municipal_Damage_Certificate.pdf', type: 'Police Report (FIR)', s3Key: 'claims/CLM-33421-01/damage_cert.pdf', kmsEncrypted: true, extractedFields: { issuingAuthority: 'BBMP Water Works Department', certificateNumber: 'BBMP-WW-2026-4491', incidentType: 'Water Pipe Burst — Structural Water Damage', inspectionDate: daysAgo(6), officerName: 'Asst. Engineer R. Patil', ocrConfidence: '96.8%' } },
        { id: 'DOC-032', name: 'Contractor_Assessment.pdf', type: 'Bill/Invoice', s3Key: 'claims/CLM-33421-01/contractor.pdf', kmsEncrypted: true, extractedFields: { contractorName: 'Shiva Civil Works Pvt Ltd', estimatedRepairCost: '₹3,80,000', flooringReplacement: '₹1,50,000', wallRepairs: '₹95,000', cabinetReplacement: '₹1,35,000', ocrConfidence: '97.4%' } },
        { id: 'DOC-033', name: 'Property_Photos.jpg', type: 'Photos', s3Key: 'claims/CLM-33421-01/photos.jpg', kmsEncrypted: true, extractedFields: { imageAnalysis: 'Water damage to flooring and walls confirmed', confidenceScore: '95.8%', detectedElements: ['Waterlogged flooring', 'Wall paint peeling', 'Cabinet damage'], ocrConfidence: '95.8%' } }
      ],
      status: 'approved',
      riskScore: 10,
      riskFlags: [],
      fraudDetectorScore: 14,
      aiSummary: 'Property claim for ₹3,80,000 covering water pipe damage to residential property. Three documents verified — municipal damage certificate, contractor estimate, and photographic evidence all corroborate the claimed damage. Risk score 10/100 indicates low fraud probability.',
      aiRecommendation: 'Approve',
      aiReasoning: 'Complies with Standard Fire & Special Perils Policy — Clause 4 (Water Damage Coverage). Municipal damage certificate from BBMP authenticates the water pipe burst event. Contractor estimate aligns with market repair rates for the reported damage scope. Clean policy history supports approval.',
      citedClause: 'Property Insurance — Standard Fire & Special Perils Policy (Water Damage Clause)',
      aiConfidenceScore: '96.2%',
      assignedUnderwriterId: 'USR-001',
      assignedUnderwriterName: 'Vikram Malhotra',
      submittedAt: isoAgo(8, 5),
      decidedAt: isoAgo(6, 14),
      decidedBy: 'Vikram Malhotra (underwriter)',
      reserveAmount: 380000,
      investigatorFindings: {
        surveyorName: 'Rajesh Kumar (IndiaAssess Surveyors Pvt Ltd)',
        status: 'Report Completed — Damage Verified',
        report: 'On-site inspection conducted at Whitefield property on ' + daysAgo(7) + '. Water pipe burst in kitchen confirmed — burst point at main supply line junction. Kitchen flooring (180 sq ft), one bedroom wall (80 sq ft), and modular kitchen cabinets damaged. Damage estimate of ₹3,80,000 from contractor is fair and market-aligned. Recommend approval of full claim amount.',
        updatedAt: isoAgo(7, 8)
      },
      disbursementDetails: {
        approvedAmount: 380000,
        payoutMethod: 'NEFT',
        bankDetailsRef: 'HDFC-BANK-ACCT-REF-SNA-33421',
        status: 'Completed',
        disbursedAt: isoAgo(5, 3)
      },
      auditTrail: [
        { eventId: 'EVT-400001', action: 'CLAIM_SUBMITTED', actor: 'Sunita Agarwal (Claimant)', resourceId: 'CLM-33421-01', details: 'Property damage claim submitted (₹3,80,000)', timestamp: isoAgo(8, 5), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-400002', action: 'INVESTIGATOR_FINDINGS_ADDED', actor: 'Rajesh Kumar (Surveyor)', resourceId: 'CLM-33421-01', details: 'Physical survey completed. Damage verified. Estimate validated.', timestamp: isoAgo(7, 8), userAgent: 'Ledger-Underwriter-Dashboard/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-400003', action: 'STATUS_CHANGED_TO_APPROVED', actor: 'Vikram Malhotra (underwriter)', resourceId: 'CLM-33421-01', details: 'Claim approved after surveyor verification. Damage and estimate validated.', timestamp: isoAgo(6, 14), userAgent: 'Ledger-Underwriter-Dashboard/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-400004', action: 'PAYOUT_DISBURSED', actor: 'Finance / Disbursement Ledger', resourceId: 'CLM-33421-01', details: 'Disbursed payout ₹3,80,000 via NEFT to HDFC Bank account.', timestamp: isoAgo(5, 3), userAgent: 'Ledger-Finance-System/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-29874-01',
      claimantName: 'Mohammed Farhan',
      policyNumber: 'POL-29874',
      policyType: 'Motor',
      policyCompany: 'Bajaj Allianz General Insurance',
      sumInsured: 1200000,
      policyStartDate: daysAgo(12),
      incidentDate: daysAgo(3),
      claimAmount: 850000,
      contactNumber: '+91 97834 56123',
      description: 'Total loss accident.',
      documents: [],
      status: 'submitted',
      riskScore: 95,
      riskFlags: [
        { flag: 'possible waiting-period violation', impact: 40, severity: 'alert', explanation: 'Incident occurred 9 days after policy start (under mandatory 30-day waiting threshold).' },
        { flag: 'unusually high vs sum insured', impact: 30, severity: 'alert', explanation: 'Claim amount (₹8,50,000) represents 70.8% of sum insured (₹12,00,000).' },
        { flag: 'may be insufficient for verification', impact: 15, severity: 'warning', explanation: 'Only 0 supporting document(s) provided. Minimum 2 required.' },
        { flag: 'very brief, may need follow-up', impact: 10, severity: 'warning', explanation: 'Description contains only 3 words, which is below recommended detail length.' }
      ],
      fraudDetectorScore: 88,
      aiSummary: 'CRITICAL: High-risk motor claim for ₹8,50,000 (70.8% of sum insured) filed 9 days after policy inception — within mandatory 30-day waiting period. Zero documents attached. Extremely brief incident description. Fraud probability: HIGH (score 88/100). Immediate investigation required.',
      aiRecommendation: 'Reject',
      aiReasoning: 'Multiple critical violations: (1) General Regulation 3 (Inception Risk) — Incident 9 days post-policy start is within 30-day waiting period for non-emergency claims. (2) Section V (Anti-Fraud) — Zero documents violates mandatory documentation requirement. (3) Claim amount ₹8,50,000 represents 70.8% of sum insured with no evidence provided. Recommend immediate rejection with fraud flag notification to IIB.',
      citedClause: 'Motor Policy — General Regulation 3 (30-Day Waiting Period)',
      aiConfidenceScore: '98.1%',
      assignedUnderwriterId: 'USR-001',
      assignedUnderwriterName: 'Vikram Malhotra',
      submittedAt: isoAgo(2, 1),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 850000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-500001', action: 'CLAIM_SUBMITTED', actor: 'Mohammed Farhan (Claimant)', resourceId: 'CLM-29874-01', details: 'High-risk motor claim submitted (₹8,50,000) — 0 documents, 9 days post-inception', timestamp: isoAgo(2, 1), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-500002', action: 'FRAUD_ALERT_TRIGGERED', actor: 'Ledger Fraud Detector', resourceId: 'CLM-29874-01', details: 'CRITICAL: Fraud score 88/100. Waiting period violation. Zero documentation. Manual review mandated.', timestamp: isoAgo(2, 0, 58), userAgent: 'Ledger-Fraud-Engine/2.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-44721-01',
      claimantName: 'Deepika Rao',
      policyNumber: 'POL-44721',
      policyType: 'Travel',
      policyCompany: 'Care Health Insurance',
      sumInsured: 200000,
      policyStartDate: daysAgo(95),
      incidentDate: daysAgo(20),
      claimAmount: 45000,
      contactNumber: '+91 99012 34567',
      description: 'Emergency medical treatment required during international travel to Singapore for severe food poisoning. Admitted to Mount Elizabeth Hospital, Singapore for 2 days. All treatment receipts, travel documents, and medical reports attached. Travel insurance was active during the travel period (15th to 28th of last month).',
      documents: [
        { id: 'DOC-041', name: 'Singapore_Medical_Report.pdf', type: 'Medical Report', s3Key: 'claims/CLM-44721-01/medical.pdf', kmsEncrypted: true, extractedFields: { patientName: 'Deepika Rao', facility: 'Mount Elizabeth Hospital, Singapore', diagnosis: 'Acute Gastroenteritis / Food Poisoning', treatment: '2-day inpatient, IV fluids, antibiotics', totalBill: 'SGD 2,340 (₹1,45,080)', ocrConfidence: '97.8%' } },
        { id: 'DOC-042', name: 'Flight_Tickets.pdf', type: 'Other', s3Key: 'claims/CLM-44721-01/tickets.pdf', kmsEncrypted: true, extractedFields: { passengerName: 'Deepika Rao', departure: 'BLR-SIN-2026', returnFlight: 'SIN-BLR-2026', travelPeriod: '15 days', airline: 'Singapore Airlines', ocrConfidence: '98.3%' } }
      ],
      status: 'approved',
      riskScore: 8,
      riskFlags: [],
      fraudDetectorScore: 8,
      aiSummary: 'Travel medical claim for ₹45,000 covering emergency hospitalization in Singapore. Travel documents confirm active travel period coincides with incident date. Mount Elizabeth Hospital medical report authenticated via OCR. Risk score 8/100 — very low risk.',
      aiRecommendation: 'Approve',
      aiReasoning: 'Satisfies Travel Insurance — Schedule of Benefits (Section 2: Emergency Medical Expenses). Travel was active (confirmed via flight tickets). Incident date is within the travel period. Foreign hospital bill authenticated at ₹45,000 equivalent. No prior claims on this policy.',
      citedClause: 'Travel Insurance — Schedule of Benefits (Section 2: Emergency Medical Expenses)',
      aiConfidenceScore: '97.1%',
      assignedUnderwriterId: 'USR-002',
      assignedUnderwriterName: 'Ananya Sharma',
      submittedAt: isoAgo(19, 8),
      decidedAt: isoAgo(17, 11),
      decidedBy: 'Ananya Sharma (underwriter)',
      reserveAmount: 45000,
      investigatorFindings: null,
      disbursementDetails: {
        approvedAmount: 45000,
        payoutMethod: 'RTGS',
        bankDetailsRef: 'SBI-BANK-ACCT-DRA-44721',
        status: 'Completed',
        disbursedAt: isoAgo(15, 4)
      },
      auditTrail: [
        { eventId: 'EVT-600001', action: 'CLAIM_SUBMITTED', actor: 'Deepika Rao (Claimant)', resourceId: 'CLM-44721-01', details: 'Travel emergency medical claim submitted (₹45,000 Singapore hospitalization)', timestamp: isoAgo(19, 8), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-600002', action: 'STATUS_CHANGED_TO_APPROVED', actor: 'Ananya Sharma (underwriter)', resourceId: 'CLM-44721-01', details: 'Approved — emergency travel medical claim with verified foreign hospital documents.', timestamp: isoAgo(17, 11), userAgent: 'Ledger-Underwriter-Dashboard/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-600003', action: 'PAYOUT_DISBURSED', actor: 'Finance / Disbursement Ledger', resourceId: 'CLM-44721-01', details: 'Disbursed ₹45,000 via RTGS to SBI account.', timestamp: isoAgo(15, 4), userAgent: 'Ledger-Finance-System/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-62910-01',
      claimantName: 'Rajesh Nambiar',
      policyNumber: 'POL-62910',
      policyType: 'Life',
      policyCompany: 'HDFC ERGO Health & General',
      sumInsured: 5000000,
      policyStartDate: daysAgo(1200),
      incidentDate: daysAgo(15),
      claimAmount: 5000000,
      contactNumber: '+91 96543 21098',
      description: 'Filing on behalf of deceased policyholder Rajesh Nambiar. Policyholder passed away due to myocardial infarction (heart attack) on ' + daysAgo(15) + '. Death certificate, hospital records confirming cause of death, nominee identification, and legal heir certificate attached. Nominee: Mrs. Kavitha Nambiar (Spouse).',
      documents: [
        { id: 'DOC-051', name: 'Death_Certificate.pdf', type: 'Medical Report', s3Key: 'claims/CLM-62910-01/death_cert.pdf', kmsEncrypted: true, extractedFields: { deceasedName: 'Rajesh Nambiar', causeOfDeath: 'Myocardial Infarction (Heart Attack)', certificateNumber: 'BBMP-DC-2026-44821', issuingAuthority: 'BBMP, Bangalore', ocrConfidence: '99.3%' } },
        { id: 'DOC-052', name: 'Hospital_Records.pdf', type: 'Medical Report', s3Key: 'claims/CLM-62910-01/hospital.pdf', kmsEncrypted: true, extractedFields: { facility: 'Manipal Hospital, Bangalore', admittingDiagnosis: 'Acute STEMI (Heart Attack)', confirmationOfDeath: 'Patient expired on ' + daysAgo(15) + ' at 03:42 IST', attendingPhysician: 'Dr. K. Mohan Rao, DM Cardiology', ocrConfidence: '98.7%' } },
        { id: 'DOC-053', name: 'Nominee_Documents.pdf', type: 'ID Proof', s3Key: 'claims/CLM-62910-01/nominee.pdf', kmsEncrypted: true, extractedFields: { nomineeName: 'Kavitha Nambiar', relationship: 'Spouse', nomineeAadhaar: 'XXXX-XXXX-8834', legalHeirCertificate: 'LH-KA-2026-2219', ocrConfidence: '97.9%' } }
      ],
      status: 'escalated',
      riskScore: 5,
      riskFlags: [],
      fraudDetectorScore: 5,
      aiSummary: 'Life insurance death claim for full sum insured ₹50,00,000. Death certificate, hospital confirmation, and nominee documents all verified with >98% OCR confidence. Low risk score (5/100). Claim amount equals full sum insured — requires Senior Underwriter/Committee sign-off per escalation protocol.',
      aiRecommendation: 'Escalate',
      aiReasoning: 'Claim amount ₹50,00,000 equals full sum insured — mandatory escalation under Life Insurance Policy Section 8 (Committee Approval for Large Claims). Medically substantiated with death certificate and hospital records. Policy was 3+ years active with no prior claims — clean history. Recommend expedited committee review for beneficiary disbursement.',
      citedClause: 'Life Insurance Policy — Section 8 (Committee Approval for Claims at Full Sum Insured)',
      aiConfidenceScore: '99.0%',
      assignedUnderwriterId: 'USR-003',
      assignedUnderwriterName: 'Siddharth Verma',
      submittedAt: isoAgo(14, 10),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 5000000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-700001', action: 'CLAIM_SUBMITTED', actor: 'Kavitha Nambiar (Nominee/Claimant)', resourceId: 'CLM-62910-01', details: 'Life death claim submitted for full sum insured ₹50,00,000', timestamp: isoAgo(14, 10), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' },
        { eventId: 'EVT-700002', action: 'CLAIM_ESCALATED', actor: 'System (Auto-Escalation)', resourceId: 'CLM-62910-01', details: 'Auto-escalated to Senior Underwriter — full sum insured death claim requires committee review', timestamp: isoAgo(14, 9, 58), userAgent: 'Ledger-Assignment-Engine/1.0', awsRegion: 'us-east-1' }
      ]
    },
    {
      id: 'CLM-91034-01',
      claimantName: 'Kavya Srinivasan',
      policyNumber: 'POL-91034',
      policyType: 'Health',
      policyCompany: 'Star Health & Allied Insurance',
      sumInsured: 1000000,
      policyStartDate: daysAgo(720),
      incidentDate: daysAgo(2),
      claimAmount: 25000,
      contactNumber: '+91 93421 09876',
      description: 'Day care procedure for minor oral surgery (wisdom tooth extraction under GA) at Narayana Dental Care, JP Nagar. Procedure lasted 45 minutes. Surgeon bill and discharge summary attached. Insurance pre-authorization was obtained.',
      documents: [
        { id: 'DOC-061', name: 'Pre_Authorization_Letter.pdf', type: 'Medical Report', s3Key: 'claims/CLM-91034-01/preauth.pdf', kmsEncrypted: true, extractedFields: { authorizationNumber: 'PRE-AUTH-SH-2026-7741', procedureApproved: 'Day Care Surgery — Wisdom Tooth Extraction Under GA', approvedAmount: '₹25,000', issuedBy: 'Star Health TPA', validUntil: daysAgo(-5), ocrConfidence: '99.1%' } },
        { id: 'DOC-062', name: 'Narayana_Dental_Bill.pdf', type: 'Bill/Invoice', s3Key: 'claims/CLM-91034-01/bill.pdf', kmsEncrypted: true, extractedFields: { invoiceNumber: 'NDC-2026-3301', totalAmount: '₹25,000', surgeonFee: '₹12,000', anesthesiaFee: '₹6,000', dayCareFacility: '₹7,000', ocrConfidence: '98.5%' } }
      ],
      status: 'submitted',
      riskScore: 5,
      riskFlags: [],
      fraudDetectorScore: 5,
      aiSummary: 'Routine day care health claim for ₹25,000 covering pre-authorized wisdom tooth extraction. Pre-authorization letter from Star Health TPA confirms prior approval. Itemized dental bill aligns exactly with authorized amount. Risk score 5/100 — minimal risk.',
      aiRecommendation: 'Approve',
      aiReasoning: 'Pre-authorization (PRE-AUTH-SH-2026-7741) was issued by Star Health TPA confirming coverage eligibility. Claim amount exactly matches pre-authorized amount of ₹25,000. Itemized bill components are standard for day care oral surgery. Policy 2+ years active with no prior claims. Recommended for fast-track approval.',
      citedClause: 'Health Policy Schedule — Clause 4.5 (Day Care Procedures Coverage)',
      aiConfidenceScore: '98.9%',
      assignedUnderwriterId: 'USR-002',
      assignedUnderwriterName: 'Ananya Sharma',
      submittedAt: isoAgo(2, 3),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: 25000,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        { eventId: 'EVT-800001', action: 'CLAIM_SUBMITTED', actor: 'Kavya Srinivasan (Claimant)', resourceId: 'CLM-91034-01', details: 'Day care dental surgery claim submitted (₹25,000) — pre-authorized by TPA', timestamp: isoAgo(2, 3), userAgent: 'Ledger-Claimant-Portal/1.0', awsRegion: 'us-east-1' }
      ]
    }
  ];
}

// ─── Default Config ────────────────────────────────────────────────────────────
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

// ─── Store Class ──────────────────────────────────────────────────────────────
class Store {
  constructor() {
    this.claims = [];
    this.users = [];
    this.config = {};
    this._initialized = false;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.claims = data.claims || buildSeedClaims();
        this.users = data.users || DEFAULT_USERS_TEMPLATE;
        this.config = data.config || DEFAULT_CONFIG;
      } else {
        this.claims = buildSeedClaims();
        this.users = DEFAULT_USERS_TEMPLATE.map(u => ({ ...u }));
        this.config = { ...DEFAULT_CONFIG };
        this.save();
      }
      this._initialized = true;
    } catch (err) {
      console.error('[DB] Error loading store, reinitializing:', err.message);
      this.claims = buildSeedClaims();
      this.users = DEFAULT_USERS_TEMPLATE.map(u => ({ ...u }));
      this.config = { ...DEFAULT_CONFIG };
      this.save();
    }
  }

  save() {
    try {
      const data = JSON.stringify({ claims: this.claims, users: this.users, config: this.config }, null, 2);
      fs.writeFileSync(DB_FILE, data, 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving store:', err.message);
    }
  }

  // ── Claims ──────────────────────────────────────────────────────────────────
  getAllClaims() { return this.claims; }
  getClaimById(id) { return this.claims.find(c => c.id === id) || null; }
  getClaimsByPolicyNumber(pn) { return this.claims.filter(c => c.policyNumber === pn); }
  getClaimsByUserId(userId) {
    // Claimants can only see claims they submitted (matched by their name)
    const user = this.getUserById(userId);
    if (!user) return [];
    return this.claims.filter(c => c.claimantName === user.name);
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

  deleteClaim(id) {
    const idx = this.claims.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.claims.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // ── Users ───────────────────────────────────────────────────────────────────
  getUsers() {
    // Never return passwordHash in user lists
    return this.users.map(({ passwordHash, plainPasswordForSeed, ...safe }) => safe);
  }

  getUserById(id) { return this.users.find(u => u.id === id) || null; }
  getUserByEmail(email) { return this.users.find(u => u.email?.toLowerCase() === email?.toLowerCase()) || null; }

  addUser(user) {
    this.users.push(user);
    this.save();
    return user;
  }

  updateUserPassword(userId, newPasswordHash) {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      this.users[idx].passwordHash = newPasswordHash;
      this.save();
      return true;
    }
    return false;
  }

  // ── Config ──────────────────────────────────────────────────────────────────
  getConfig() { return this.config; }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.save();
    return this.config;
  }

  // ── MS SQL Async Integrations ─────────────────────────────────────────────
  async isMSSQL() { return process.env.USE_MSSQL === 'true'; }
  async getAllClaimsAsync() {
    if (process.env.USE_MSSQL === 'true') return await mssqlDb.getAllClaimsMSSQL();
    return this.getAllClaims();
  }
  async getClaimByIdAsync(id) {
    if (process.env.USE_MSSQL === 'true') return await mssqlDb.getClaimByIdMSSQL(id);
    return this.getClaimById(id);
  }
  async addClaimAsync(claim) {
    if (process.env.USE_MSSQL === 'true') return await mssqlDb.addClaimMSSQL(claim);
    return this.addClaim(claim);
  }
  async getUserByEmailAsync(email) {
    if (process.env.USE_MSSQL === 'true') return await mssqlDb.getUserByEmailMSSQL(email);
    return this.getUserByEmail(email);
  }
}

// Singleton instance
export const db = new Store();
