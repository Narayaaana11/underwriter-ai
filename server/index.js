import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { calculateRiskScore, blendFraudScore } from './riskEngine.js';
import { mockAWSServices } from './awsServices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to format ISO dates
const nowISO = () => new Date().toISOString();

/**
 * GET /api/claims
 * List claims with filter support
 */
app.get('/api/claims', (req, res) => {
  try {
    let claims = db.getAllClaims();
    const { status, policyType, assignedUnderwriterId, search, claimantName } = req.query;

    if (status && status !== 'all') {
      claims = claims.filter(c => c.status === status);
    }
    if (policyType && policyType !== 'all') {
      claims = claims.filter(c => c.policyType === policyType);
    }
    if (assignedUnderwriterId && assignedUnderwriterId !== 'all') {
      claims = claims.filter(c => c.assignedUnderwriterId === assignedUnderwriterId);
    }
    if (claimantName) {
      claims = claims.filter(c => c.claimantName.toLowerCase().includes(claimantName.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      claims = claims.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.claimantName.toLowerCase().includes(q) ||
        c.policyNumber.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }

    // Always ensure risk score is up-to-date
    claims = claims.map(c => {
      const riskCalc = calculateRiskScore(c);
      return {
        ...c,
        riskScore: blendFraudScore(riskCalc.riskScore, c.fraudDetectorScore),
        riskFlags: riskCalc.riskFlags
      };
    });

    return res.json({ success: true, count: claims.length, data: claims });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/claims/:id
 * Full claim detail + policyholder history
 */
app.get('/api/claims/:id', (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    // Re-evaluate risk score
    const riskCalc = calculateRiskScore(claim);
    const finalRiskScore = blendFraudScore(riskCalc.riskScore, claim.fraudDetectorScore);
    const updatedClaim = {
      ...claim,
      riskScore: finalRiskScore,
      riskFlags: riskCalc.riskFlags
    };

    // Get policyholder history (all other claims sharing same policyNumber)
    const policyHistory = db.getClaimsByPolicyNumber(claim.policyNumber)
      .filter(c => c.id !== claim.id);

    return res.json({
      success: true,
      data: updatedClaim,
      policyholderHistory: policyHistory
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/claims
 * Create new claim + upload documents + enqueue processing
 */
app.post('/api/claims', async (req, res) => {
  try {
    const {
      claimantName,
      policyNumber,
      policyType,
      sumInsured,
      policyStartDate,
      incidentDate,
      claimAmount,
      contactNumber,
      description,
      documents = [],
      consentAccepted
    } = req.body;

    if (!consentAccepted) {
      return res.status(400).json({ success: false, error: "Legal consent and privacy agreement required before submission." });
    }

    const claimId = `CLM-${policyNumber.replace('POL-', '')}-${Math.floor(10 + Math.random() * 90)}`;
    
    // Process document uploads via S3 mock and Textract
    const processedDocuments = [];
    for (const doc of documents) {
      const s3Meta = await mockAWSServices.uploadDocumentToS3({
        claimId,
        file: { name: doc.name },
        documentType: doc.type
      });
      const textractResult = await mockAWSServices.extractDocumentFields({
        s3Key: s3Meta.s3Key,
        documentType: doc.type,
        fileName: doc.name
      });
      
      processedDocuments.push({
        id: `DOC-${Math.floor(100 + Math.random() * 900)}`,
        name: doc.name,
        type: doc.type || "Other",
        s3Key: s3Meta.s3Key,
        extractedFields: textractResult.extractedFields,
        kmsEncrypted: true
      });
    }

    // Initial claim record
    const draftClaim = {
      id: claimId,
      claimantName,
      policyNumber,
      policyType: policyType || "Health",
      sumInsured: Number(sumInsured) || 500000,
      policyStartDate,
      incidentDate,
      claimAmount: Number(claimAmount) || 0,
      contactNumber,
      description,
      documents: processedDocuments,
      status: "submitted",
      riskScore: 0,
      riskFlags: [],
      fraudDetectorScore: null,
      aiSummary: "",
      aiRecommendation: "Pending AI Processing",
      aiReasoning: "",
      assignedUnderwriterId: null,
      assignedUnderwriterName: "Unassigned",
      submittedAt: nowISO(),
      decidedAt: null,
      decidedBy: null,
      reserveAmount: Number(claimAmount) || 0,
      investigatorFindings: null,
      disbursementDetails: null,
      auditTrail: [
        mockAWSServices.logCloudTrailEvent({
          action: "CLAIM_SUBMITTED",
          actor: `${claimantName} (Claimant)`,
          resourceId: claimId,
          details: `Claim submitted for ${policyType} policy ${policyNumber} (Amount: ₹${Number(claimAmount).toLocaleString()})`
        })
      ]
    };

    // Calculate Risk Score
    const riskCalc = calculateRiskScore(draftClaim);
    draftClaim.riskScore = riskCalc.riskScore;
    draftClaim.riskFlags = riskCalc.riskFlags;

    // Fraud detector score simulation
    const fraudRes = await mockAWSServices.evaluateFraudRisk(draftClaim);
    draftClaim.fraudDetectorScore = fraudRes.fraudDetectorScore;
    draftClaim.riskScore = blendFraudScore(riskCalc.riskScore, fraudRes.fraudDetectorScore);

    // Bedrock AI Summary Generation
    const policyHistory = db.getClaimsByPolicyNumber(policyNumber);
    const bedrockRes = await mockAWSServices.generateAICaseSummary(draftClaim, policyHistory);
    draftClaim.aiSummary = bedrockRes.aiSummary;
    draftClaim.aiRecommendation = bedrockRes.aiRecommendation;
    draftClaim.aiReasoning = bedrockRes.aiReasoning;

    // Underwriter Auto-Workload Balancing Assignment
    const users = db.getUsers().filter(u => u.role === 'underwriter');
    if (users.length > 0) {
      let selected = users.find(u => (u.specialty || "").includes(policyType)) || users[0];
      draftClaim.assignedUnderwriterId = selected.id;
      draftClaim.assignedUnderwriterName = selected.name;
    }

    // Step Functions Pipeline Trigger
    await mockAWSServices.triggerProcessingPipeline(claimId);

    // Save claim
    const saved = db.addClaim(draftClaim);

    // Notification simulation
    await mockAWSServices.sendStatusNotification({
      recipient: claimantName,
      claimId,
      newStatus: "submitted"
    });

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/claims/:id
 * Update status/decision & write CloudTrail audit entry
 */
app.patch('/api/claims/:id', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const { status, actor, reason, assignedUnderwriterId, reserveAmount } = req.body;
    const updates = {};
    const auditEntries = [...(claim.auditTrail || [])];

    if (status && status !== claim.status) {
      const config = db.getConfig();
      const threshold = config.seniorApprovalThreshold || 500000;
      if (status === 'approved' && claim.claimAmount > threshold && req.body.role !== 'senior_underwriter' && req.body.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: `Claims above ₹${threshold.toLocaleString()} require Senior Underwriter or Committee approval. Please escalate this claim.`
        });
      }

      updates.status = status;
      if (status === 'approved' || status === 'rejected') {
        updates.decidedAt = nowISO();
        updates.decidedBy = actor || "Underwriter";
      }

      auditEntries.push(
        mockAWSServices.logCloudTrailEvent({
          action: `STATUS_CHANGED_TO_${status.toUpperCase()}`,
          actor: actor || "Underwriter",
          resourceId: claim.id,
          details: reason || `Updated claim status from ${claim.status.toUpperCase()} to ${status.toUpperCase()}`
        })
      );

      await mockAWSServices.sendStatusNotification({
        recipient: claim.claimantName,
        claimId: claim.id,
        newStatus: status
      });
    }

    if (assignedUnderwriterId) {
      const users = db.getUsers();
      const u = users.find(usr => usr.id === assignedUnderwriterId);
      if (u) {
        updates.assignedUnderwriterId = u.id;
        updates.assignedUnderwriterName = u.name;
        auditEntries.push(
          mockAWSServices.logCloudTrailEvent({
            action: "UNDERWRITER_REASSIGNED",
            actor: actor || "System",
            resourceId: claim.id,
            details: `Reassigned case to ${u.name}`
          })
        );
      }
    }

    if (reserveAmount !== undefined) {
      updates.reserveAmount = Number(reserveAmount);
    }

    updates.auditTrail = auditEntries;
    const updated = db.updateClaim(claim.id, updates);

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/claims/:id/escalate
 */
app.post('/api/claims/:id/escalate', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const { actor, reason } = req.body;
    const seniorUsers = db.getUsers().filter(u => u.role === 'senior_underwriter');
    const senior = seniorUsers[0] || { id: "USR-004", name: "Siddharth Verma" };

    const auditEntries = [...(claim.auditTrail || [])];
    auditEntries.push(
      mockAWSServices.logCloudTrailEvent({
        action: "CLAIM_ESCALATED",
        actor: actor || "Underwriter",
        resourceId: claim.id,
        details: reason || `Escalated claim to Senior Underwriter ${senior.name} (Amount ₹${claim.claimAmount.toLocaleString()})`
      })
    );

    const updated = db.updateClaim(claim.id, {
      status: "escalated",
      assignedUnderwriterId: senior.id,
      assignedUnderwriterName: senior.name,
      auditTrail: auditEntries
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/claims/:id/disburse
 */
app.post('/api/claims/:id/disburse', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }
    if (claim.status !== 'approved') {
      return res.status(400).json({ success: false, error: "Only approved claims can receive payout disbursement." });
    }

    const { approvedAmount, payoutMethod, bankDetailsRef } = req.body;
    const disbursementDetails = {
      approvedAmount: Number(approvedAmount) || claim.claimAmount,
      payoutMethod: payoutMethod || "NEFT",
      bankDetailsRef: bankDetailsRef || "HDFC-BANK-ACCT-REF",
      status: "Completed",
      disbursedAt: nowISO()
    };

    const auditEntries = [...(claim.auditTrail || [])];
    auditEntries.push(
      mockAWSServices.logCloudTrailEvent({
        action: "PAYOUT_DISBURSED",
        actor: "Finance / Disbursement Ledger",
        resourceId: claim.id,
        details: `Disbursed payout ₹${disbursementDetails.approvedAmount.toLocaleString()} via ${disbursementDetails.payoutMethod}`
      })
    );

    const updated = db.updateClaim(claim.id, {
      disbursementDetails,
      auditTrail: auditEntries
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/claims/:id/investigate
 */
app.post('/api/claims/:id/investigate', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const { surveyorName, report, status: invStatus } = req.body;
    const investigatorFindings = {
      surveyorName: surveyorName || "Independent Claims Surveyor",
      status: invStatus || "Report Completed",
      report: report || "On-site inspection completed. Physical loss verified.",
      updatedAt: nowISO()
    };

    const auditEntries = [...(claim.auditTrail || [])];
    auditEntries.push(
      mockAWSServices.logCloudTrailEvent({
        action: "INVESTIGATOR_FINDINGS_ADDED",
        actor: surveyorName || "Surveyor",
        resourceId: claim.id,
        details: `Surveyor findings updated: ${investigatorFindings.status}`
      })
    );

    const updated = db.updateClaim(claim.id, {
      status: "review",
      investigatorFindings,
      auditTrail: auditEntries
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/metrics
 */
app.get('/api/analytics/metrics', (req, res) => {
  try {
    const claims = db.getAllClaims();
    const statusCounts = { submitted: 0, review: 0, approved: 0, rejected: 0, escalated: 0 };
    claims.forEach(c => {
      if (statusCounts[c.status] !== undefined) statusCounts[c.status]++;
    });

    const policyTypeCounts = {};
    claims.forEach(c => {
      policyTypeCounts[c.policyType] = (policyTypeCounts[c.policyType] || 0) + 1;
    });

    const totalClaimed = claims.reduce((acc, c) => acc + (c.claimAmount || 0), 0);
    const totalApproved = claims.filter(c => c.status === 'approved').reduce((acc, c) => acc + (c.claimAmount || 0), 0);
    const totalReserved = claims.reduce((acc, c) => acc + (c.reserveAmount || 0), 0);

    const riskDistribution = { low: 0, medium: 0, high: 0 };
    claims.forEach(c => {
      const score = calculateRiskScore(c).riskScore;
      if (score >= 50) riskDistribution.high++;
      else if (score >= 20) riskDistribution.medium++;
      else riskDistribution.low++;
    });

    return res.json({
      success: true,
      data: {
        totalClaims: claims.length,
        statusCounts,
        policyTypeCounts,
        totalClaimed,
        totalApproved,
        totalReserved,
        riskDistribution,
        turnaroundStats: {
          traditionalAverageDays: 35,
          ledgerAverageMinutes: 1.5,
          timeSavedPercent: "99.9%",
          totalProcessed: claims.length
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/embed-url
 */
app.get('/api/analytics/embed-url', async (req, res) => {
  try {
    const embedRes = await mockAWSServices.getQuickSightEmbedUrl({
      userId: req.query.userId || "USR-002",
      role: req.query.role || "underwriter"
    });
    return res.json({ success: true, data: embedRes });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/audit-logs
 */
app.get('/api/audit-logs', (req, res) => {
  try {
    const claims = db.getAllClaims();
    let logs = [];
    claims.forEach(c => {
      if (Array.isArray(c.auditTrail)) {
        c.auditTrail.forEach(evt => {
          logs.push({
            ...evt,
            claimId: c.id,
            claimantName: c.claimantName,
            policyNumber: c.policyNumber
          });
        });
      }
    });
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/users & Admin config
 */
app.get('/api/users', (req, res) => res.json({ success: true, data: db.getUsers() }));
app.get('/api/admin/config', (req, res) => res.json({ success: true, data: db.getConfig() }));
app.patch('/api/admin/config', (req, res) => res.json({ success: true, data: db.updateConfig(req.body) }));

// Serve built frontend assets if dist exists
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`⚡ Ledger Full-Stack Server running at http://localhost:${PORT}`);
});
