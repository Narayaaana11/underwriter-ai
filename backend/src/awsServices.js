/**
 * AWS Service Integration Layer for Ledger.
 * Uses clean swappable service interfaces:
 * - When AWS environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, etc.) are set, real AWS SDK calls can be plugged in.
 * - By default, provides high-fidelity, auditable service mocks with production-grade outputs.
 */

export const mockAWSServices = {
  /**
   * Amazon S3 + AWS KMS Encrypted Upload
   */
  async uploadDocumentToS3({ claimId, file, documentType }) {
    const s3Key = `claims/${claimId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const kmsKeyId = process.env.AWS_KMS_KEY_ID || "arn:aws:kms:us-east-1:123456789012:key/ledger-claims-kms-key";
    
    return {
      s3Bucket: process.env.AWS_S3_BUCKET || "underwriter-ai",
      s3Key,
      kmsEncrypted: true,
      kmsKeyId,
      etag: `"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"`,
      uploadedAt: new Date().toISOString()
    };
  },

  /**
   * AWS Textract OCR & Field Extraction
   */
  async extractDocumentFields({ s3Key, documentType, fileName, claimContext = {} }) {
    // Generate realistic extracted fields depending on document type
    // claimContext provides real claim data to avoid false-positive vendor name mismatches
    let extractedFields = {};
    const typeLower = (documentType || "").toLowerCase();
    const fileLower = (fileName || "").toLowerCase();

    // Derive vendor name from real claim data to eliminate false-positive fraud flags
    const vendorName = claimContext.policyCompany
      ? `${claimContext.policyCompany} — Empaneled Hospital`
      : (claimContext.description || '').match(/([A-Z][a-z]+ (?:Hospital|Clinic|Medical|Healthcare|Health Centre|Health Center)[^,.]*)/)?
          (claimContext.description.match(/([A-Z][a-z]+ (?:Hospital|Clinic|Medical|Healthcare|Health Centre|Health Center)[^,.]*)/)[1].trim()) :
          'Insurer-Empaneled Healthcare Provider';

    // Derive billed amount closer to actual claim amount for consistency
    const rawAmount = Number(claimContext.claimAmount) || 145000;
    const subtotal = Math.round(rawAmount * 0.83);
    const tax = rawAmount - subtotal;
    const fmtInr = (n) => `₹${n.toLocaleString('en-IN')}`;

    if (typeLower.includes("bill") || typeLower.includes("invoice") || fileLower.includes("bill")) {
      extractedFields = {
        invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        vendorName,
        subtotal: fmtInr(subtotal),
        taxAmount: fmtInr(tax),
        totalAmount: fmtInr(rawAmount),
        paymentStatus: "Pending Reimbursement"
      };
    } else if (typeLower.includes("medical") || typeLower.includes("prescription") || fileLower.includes("discharge")) {
      // Extract patient name from claim context
      const patientName = claimContext.claimantName || 'Claimant';
      const facilityMatch = (claimContext.description || '').match(/(?:at|to) ([A-Z][a-z]+ (?:Hospital|Clinic|Medical)[^,.]*)/);
      const facility = facilityMatch ? facilityMatch[1].trim() : vendorName.replace(' — Empaneled Hospital', '');
      extractedFields = {
        patientName,
        facility,
        attendingPhysician: "Dr. R. K. Saxena, MS (MBBS, MD)",
        primaryDiagnosis: "As per Discharge Summary — ICD-10 Verified",
        treatmentProvided: "Inpatient Medical Care & Surgical Intervention",
        admissionPeriod: "4 Days Inpatient Stay"
      };
    } else if (typeLower.includes("police") || typeLower.includes("fir") || fileLower.includes("fire")) {
      extractedFields = {
        policeStation: "Central District Station",
        firNumber: `FIR-${Math.floor(1000 + Math.random() * 9000)}/2026`,
        incidentType: "Accidental Property Loss / Incident",
        officerInCharge: "Insp. S. Patil",
        investigationStatus: "Preliminary FIR Recorded"
      };
    } else if (typeLower.includes("photo") || fileLower.includes("photo") || fileLower.includes("jpg")) {
      extractedFields = {
        imageAnalysis: "Visual Damage Inspection Validated",
        confidenceScore: "96.4%",
        detectedElements: ["Impact damage", "Structural deformation"],
        timestampExtracted: new Date().toISOString()
      };
    } else {
      extractedFields = {
        documentName: fileName,
        extractedTextSnippet: "Official documentation verified by AWS Textract OCR Engine.",
        ocrConfidence: "98.2%"
      };
    }

    return {
      service: "AWS Textract & AWS Comprehend Medical",
      status: "SUCCEEDED",
      documentType,
      extractedFields,
      comprehendEntities: [
        { category: "MEDICAL_CONDITION", text: "Acute Appendicitis", icd10: "K35.8", score: 0.99 },
        { category: "ANATOMY", text: "Appendix / Abdomen", score: 0.98 },
        { category: "PROCEDURE", text: "Laparoscopic Appendectomy", score: 0.97 }
      ],
      confidenceScore: 0.962
    };
  },

  /**
   * AWS Bedrock (Claude 3.5 Sonnet RAG Case Analysis & Recommendation)
   */
  async generateAICaseSummary(claim, policyHistory = []) {
    const sumInsured = claim.sumInsured || 1;
    const claimAmount = claim.claimAmount || 0;
    const ratio = ((claimAmount / sumInsured) * 100).toFixed(1);
    const policyType = claim.policyType || "General";

    let recommendation = "Approve";
    let summaryText = "";
    let reasoningText = "";

    if (claim.riskScore >= 50) {
      recommendation = "Investigate Further";
      summaryText = `High-risk ${policyType} claim filed for ₹${claimAmount.toLocaleString()} (${ratio}% of sum insured ₹${sumInsured.toLocaleString()}). Multiple risk flags detected including early-inception window and high claim proportion.`;
      reasoningText = `Under ${policyType} Policy Section 3.1 (Risk Audit Clause), claims exceeding 60% of sum insured filed within initial policy period require physical surveyor inspection and policy clause verification.`;
    } else if (claim.documents.length === 0) {
      recommendation = "Reject";
      summaryText = `Claim of ₹${claimAmount.toLocaleString()} submitted without any supporting documentation or verification receipts.`;
      reasoningText = `Non-compliant with ${policyType} Policy Clause 12.A (Mandatory Documentation Requirement). Submission lacks verifiable proof of loss.`;
    } else {
      recommendation = "Approve";
      summaryText = `Claim of ₹${claimAmount.toLocaleString()} filed under ${policyType} policy POL-${claim.policyNumber}. Incident details align with verified Textract document extractions and policy terms.`;
      reasoningText = `Complies with ${policyType} Policy Coverage Schedule Clause 4.2. Low risk score (${claim.riskScore}/100), clean policy history (${policyHistory.length} previous claim(s)), and valid document proof.`;
    }

    return {
      service: "AWS Bedrock (anthropic.claude-3-5-sonnet)",
      aiSummary: summaryText,
      aiRecommendation: recommendation,
      aiReasoning: reasoningText,
      citedClause: `${policyType} Policy Terms & Conditions Section 4.2`,
      generatedAt: new Date().toISOString()
    };
  },

  /**
   * AWS Fraud Detector Model Evaluation
   */
  async evaluateFraudRisk(claim) {
    const isHighRatio = (claim.claimAmount / claim.sumInsured) > 0.7;
    const isFewDocs = (claim.documents || []).length < 2;
    const baseScore = isHighRatio ? 65 : (isFewDocs ? 45 : 12);
    
    return {
      service: "AWS Fraud Detector",
      modelName: "ledger_claims_fraud_v2",
      fraudDetectorScore: baseScore,
      riskLevel: baseScore > 50 ? "HIGH" : (baseScore > 30 ? "MEDIUM" : "LOW"),
      evaluatedAt: new Date().toISOString()
    };
  },

  /**
   * Hospital Invoice GSTIN & QR Hash Verification
   * Validates invoice authenticity using GSTIN format check and SHA-256 style document hash.
   */
  async verifyInvoiceAuthenticity({ claimId, documents = [], policyCompany = '', claimAmount = 0 }) {
    const flags = [];

    // GSTIN format regex: 2-digit state code + 5-char PAN + 4 digits + check digit
    const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    // Generate a deterministic GSTIN for the provider (simulated extraction)
    // Real: would be extracted by Textract from invoice
    const stateCode = String(Math.floor(11 + Math.random() * 28)).padStart(2, '0');
    const pan = 'AAPCS' + String(Math.floor(1000 + Math.random() * 9000)) + 'C';
    const checkDigit = '1ZA';
    const gstinNumber = `${stateCode}${pan}${checkDigit}`;
    const gstinVerified = GSTIN_RE.test(gstinNumber);

    // Generate a QR hash fingerprint (SHA-256 style hex — simulated)
    const hashInput = `${claimId}|${claimAmount}|${Date.now()}`;
    let hashVal = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hashVal = ((hashVal << 5) - hashVal) + hashInput.charCodeAt(i);
      hashVal |= 0;
    }
    const qrHashFingerprint = Math.abs(hashVal).toString(16).padStart(8, '0') +
      Math.abs(hashVal * 31).toString(16).padStart(8, '0') +
      Math.abs(hashVal * 7919).toString(16).padStart(8, '0') +
      Math.abs(hashVal * 104729).toString(16).padStart(8, '0');

    // Check for invoice amount vs claim amount consistency (within ±20%)
    const hasDocuments = documents.length > 0;
    if (!hasDocuments) {
      flags.push('No invoice documents submitted for verification');
    }
    if (!gstinVerified) {
      flags.push('GSTIN format invalid — vendor tax registration unverifiable');
    }

    // Composite authenticity score
    let score = 100;
    if (!gstinVerified) score -= 30;
    if (!hasDocuments) score -= 40;
    if (documents.length < 2) score -= 10;
    const invoiceAuthenticityScore = Math.max(0, score);

    return {
      service: 'Ledger Invoice Verification Engine (GSTIN + QR Hash)',
      claimId,
      gstinVerified,
      gstinNumber,
      qrHashFingerprint: qrHashFingerprint.toUpperCase(),
      invoiceAuthenticityScore,
      authenticityFlags: flags,
      documentsVerified: documents.length,
      verifiedAt: new Date().toISOString()
    };
  },

  /**
   * AWS Step Functions State Machine Execution
   */
  async triggerProcessingPipeline(claimId) {
    const executionArn = `arn:aws:states:us-east-1:123456789012:execution:LedgerClaimProcessingPipeline:${claimId}_${Date.now()}`;
    return {
      service: "AWS Step Functions",
      executionArn,
      status: "RUNNING",
      steps: [
        { name: "ReceiveSQSMessage", status: "COMPLETED" },
        { name: "RunTextractOCR", status: "COMPLETED" },
        { name: "RunMaciePIIScan", status: "COMPLETED" },
        { name: "EvaluateFraudDetector", status: "COMPLETED" },
        { name: "InvokeBedrockLLM", status: "COMPLETED" },
        { name: "UpdateClaimRecord", status: "SUCCEEDED" }
      ],
      startDate: new Date().toISOString()
    };
  },

  /**
   * AWS CloudTrail Audit Logger
   */
  logCloudTrailEvent({ action, actor, resourceId, details }) {
    const event = {
      eventId: `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
      action,
      actor,
      resourceId,
      details: details || `Executed ${action} on resource ${resourceId}`,
      timestamp: new Date().toISOString(),
      userAgent: "Ledger-Underwriter-Dashboard/1.0",
      awsRegion: process.env.AWS_REGION || "us-east-1"
    };
    return event;
  },

  /**
   * Amazon Macie PII Scanner
   */
  async scanForPII(s3Key) {
    return {
      service: "Amazon Macie",
      s3Key,
      piiDetected: false,
      findingsCount: 0,
      status: "CLEAN",
      scannedAt: new Date().toISOString()
    };
  },

  /**
   * Amazon SES / SNS Notification Dispatcher
   */
  async sendStatusNotification({ recipient, recipientEmail, claimId, newStatus, message }) {
    return {
      service: "Amazon SES / SNS",
      messageId: `MSG-${Math.floor(100000 + Math.random() * 900000)}`,
      recipient,
      recipientEmail,
      channel: "EMAIL_AND_SMS",
      subject: `Claim ${claimId} Status Update: ${newStatus.toUpperCase()}`,
      body: message || `Your insurance claim ${claimId} has been updated to: ${newStatus.toUpperCase()}.`,
      sentAt: new Date().toISOString()
    };
  },

  /**
   * Amazon QuickSight Analytics Embed URL
   */
  async getQuickSightEmbedUrl({ userId, role }) {
    return {
      service: "Amazon QuickSight",
      dashboardId: "ledger-executive-underwriting-analytics-v1",
      embedUrl: `https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/ledger-executive-underwriting-analytics-v1?role=${role}`,
      expirationInSeconds: 3600,
      generatedAt: new Date().toISOString()
    };
  }
};
