/**
 * mssqlDb.js — Microsoft SQL Server Database Module
 * 
 * Production-ready MS SQL Server integration using the official `mssql` driver.
 * Connects to MS SQL Server / AWS RDS SQL Server to perform queries and transactions
 * for Users, Policies, Claims, ClaimDocuments, and AuditTrail.
 */

import sql from 'mssql';

const mssqlConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '',
  server: process.env.MSSQL_SERVER || 'localhost',
  database: process.env.MSSQL_DATABASE || 'UnderwriterDB',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true', // true for Azure / AWS RDS SSL
    trustServerCertificate: true, // true for local dev
    enableArithAbort: true
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise = null;

export async function getMSSQLPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(mssqlConfig)
      .then(pool => {
        console.log(`[MS SQL] Connected to MS SQL Server database: ${mssqlConfig.database} @ ${mssqlConfig.server}:${mssqlConfig.port}`);
        return pool;
      })
      .catch(err => {
        console.error('[MS SQL] Connection error:', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserByEmailMSSQL(email) {
  const pool = await getMSSQLPool();
  const res = await pool.request()
    .input('email', sql.NVarChar(150), email)
    .query('SELECT * FROM dbo.Users WHERE Email = @email');
  return res.recordset[0] || null;
}

export async function getUserByIdMSSQL(id) {
  const pool = await getMSSQLPool();
  const res = await pool.request()
    .input('id', sql.VarChar(50), id)
    .query('SELECT * FROM dbo.Users WHERE Id = @id');
  return res.recordset[0] || null;
}

export async function addUserMSSQL(user) {
  const pool = await getMSSQLPool();
  await pool.request()
    .input('Id', sql.VarChar(50), user.id)
    .input('Name', sql.NVarChar(100), user.name)
    .input('Email', sql.NVarChar(150), user.email)
    .input('Role', sql.VarChar(30), user.role)
    .input('Company', sql.NVarChar(100), user.company || '')
    .input('Specialty', sql.NVarChar(100), user.specialty || '')
    .input('PasswordHash', sql.NVarChar(255), user.passwordHash)
    .query(`
      INSERT INTO dbo.Users (Id, Name, Email, Role, Company, Specialty, PasswordHash)
      VALUES (@Id, @Name, @Email, @Role, @Company, @Specialty, @PasswordHash)
    `);
  return user;
}

// ─── Policies ────────────────────────────────────────────────────────────────

export async function getPolicyByNumberMSSQL(policyNumber) {
  const pool = await getMSSQLPool();
  const res = await pool.request()
    .input('policyNumber', sql.VarChar(50), policyNumber)
    .query('SELECT * FROM dbo.Policies WHERE PolicyNumber = @policyNumber');
  const policy = res.recordset[0];
  if (!policy) return null;
  if (policy.PreExistingConditions) {
    try { policy.preExistingConditions = JSON.parse(policy.PreExistingConditions); } catch {}
  }
  return policy;
}

export async function addPolicyMSSQL(policy) {
  const pool = await getMSSQLPool();
  await pool.request()
    .input('PolicyNumber', sql.VarChar(50), policy.policyNumber)
    .input('ClaimantName', sql.NVarChar(100), policy.claimantName)
    .input('ClaimantEmail', sql.NVarChar(150), policy.claimantEmail || '')
    .input('ContactNumber', sql.VarChar(30), policy.contactNumber || '')
    .input('PolicyType', sql.VarChar(30), policy.policyType)
    .input('PolicyCompany', sql.NVarChar(100), policy.policyCompany)
    .input('SumInsured', sql.Decimal(18, 2), policy.sumInsured)
    .input('PolicyStartDate', sql.Date, policy.policyStartDate)
    .input('PolicyEndDate', sql.Date, policy.policyEndDate)
    .input('PreExistingConditions', sql.NVarChar(sql.MAX), JSON.stringify(policy.preExistingConditions || []))
    .input('DeductibleAmount', sql.Decimal(18, 2), policy.deductibleAmount || 0)
    .input('CopayPercentage', sql.Decimal(5, 2), policy.copayPercentage || 0)
    .input('Status', sql.VarChar(20), policy.status || 'Active')
    .query(`
      INSERT INTO dbo.Policies (
        PolicyNumber, ClaimantName, ClaimantEmail, ContactNumber, PolicyType, PolicyCompany,
        SumInsured, PolicyStartDate, PolicyEndDate, PreExistingConditions, DeductibleAmount, CopayPercentage, Status
      ) VALUES (
        @PolicyNumber, @ClaimantName, @ClaimantEmail, @ContactNumber, @PolicyType, @PolicyCompany,
        @SumInsured, @PolicyStartDate, @PolicyEndDate, @PreExistingConditions, @DeductibleAmount, @CopayPercentage, @Status
      )
    `);
  return policy;
}

// ─── Claims ──────────────────────────────────────────────────────────────────

export async function getAllClaimsMSSQL() {
  const pool = await getMSSQLPool();
  const res = await pool.request().query('SELECT * FROM dbo.Claims ORDER BY SubmittedAt DESC');
  const claims = res.recordset;

  // Fetch documents and audit trails for each claim
  for (const claim of claims) {
    const docsRes = await pool.request()
      .input('claimId', sql.VarChar(50), claim.Id)
      .query('SELECT * FROM dbo.ClaimDocuments WHERE ClaimId = @claimId');
    claim.documents = docsRes.recordset.map(d => ({
      id: d.Id,
      name: d.Name,
      type: d.DocumentType,
      s3Bucket: d.S3Bucket,
      s3Key: d.S3Key,
      kmsEncrypted: d.KmsEncrypted === 1,
      extractedFields: d.ExtractedFieldsJson ? JSON.parse(d.ExtractedFieldsJson) : {}
    }));

    const auditRes = await pool.request()
      .input('claimId', sql.VarChar(50), claim.Id)
      .query('SELECT * FROM dbo.AuditTrail WHERE ClaimId = @claimId ORDER BY Timestamp ASC');
    claim.auditTrail = auditRes.recordset.map(a => ({
      eventId: a.EventId,
      action: a.Action,
      actor: a.Actor,
      details: a.Details,
      timestamp: a.Timestamp,
      awsRegion: a.AwsRegion
    }));
  }
  return claims;
}

export async function getClaimByIdMSSQL(id) {
  const pool = await getMSSQLPool();
  const res = await pool.request()
    .input('id', sql.VarChar(50), id)
    .query('SELECT * FROM dbo.Claims WHERE Id = @id');
  const claim = res.recordset[0];
  if (!claim) return null;

  const docsRes = await pool.request()
    .input('claimId', sql.VarChar(50), claim.Id)
    .query('SELECT * FROM dbo.ClaimDocuments WHERE ClaimId = @claimId');
  claim.documents = docsRes.recordset.map(d => ({
    id: d.Id,
    name: d.Name,
    type: d.DocumentType,
    s3Bucket: d.S3Bucket,
    s3Key: d.S3Key,
    kmsEncrypted: d.KmsEncrypted === 1,
    extractedFields: d.ExtractedFieldsJson ? JSON.parse(d.ExtractedFieldsJson) : {}
  }));

  const auditRes = await pool.request()
    .input('claimId', sql.VarChar(50), claim.Id)
    .query('SELECT * FROM dbo.AuditTrail WHERE ClaimId = @claimId ORDER BY Timestamp ASC');
  claim.auditTrail = auditRes.recordset.map(a => ({
    eventId: a.EventId,
    action: a.Action,
    actor: a.Actor,
    details: a.Details,
    timestamp: a.Timestamp,
    awsRegion: a.AwsRegion
  }));

  return claim;
}

export async function addClaimMSSQL(claim) {
  const pool = await getMSSQLPool();
  await pool.request()
    .input('Id', sql.VarChar(50), claim.id)
    .input('PolicyNumber', sql.VarChar(50), claim.policyNumber)
    .input('ClaimantName', sql.NVarChar(100), claim.claimantName)
    .input('PolicyType', sql.VarChar(30), claim.policyType)
    .input('PolicyCompany', sql.NVarChar(100), claim.policyCompany || '')
    .input('SumInsured', sql.Decimal(18, 2), claim.sumInsured)
    .input('PolicyStartDate', sql.Date, claim.policyStartDate)
    .input('IncidentDate', sql.Date, claim.incidentDate)
    .input('ClaimAmount', sql.Decimal(18, 2), claim.claimAmount)
    .input('ReserveAmount', sql.Decimal(18, 2), claim.reserveAmount || claim.claimAmount)
    .input('ContactNumber', sql.VarChar(30), claim.contactNumber || '')
    .input('Description', sql.NVarChar(sql.MAX), claim.description || '')
    .input('Status', sql.VarChar(30), claim.status || 'submitted')
    .input('RiskScore', sql.Int, claim.riskScore || 0)
    .input('FraudDetectorScore', sql.Int, claim.fraudDetectorScore || null)
    .input('AiSummary', sql.NVarChar(sql.MAX), claim.aiSummary || '')
    .input('AiRecommendation', sql.NVarChar(100), claim.aiRecommendation || '')
    .input('AiReasoning', sql.NVarChar(sql.MAX), claim.aiReasoning || '')
    .input('CitedClause', sql.NVarChar(255), claim.citedClause || '')
    .input('AiConfidenceScore', sql.VarChar(10), claim.aiConfidenceScore || '')
    .input('AssignedUnderwriterId', sql.VarChar(50), claim.assignedUnderwriterId || null)
    .input('AssignedUnderwriterName', sql.NVarChar(100), claim.assignedUnderwriterName || '')
    .query(`
      INSERT INTO dbo.Claims (
        Id, PolicyNumber, ClaimantName, PolicyType, PolicyCompany, SumInsured, PolicyStartDate,
        IncidentDate, ClaimAmount, ReserveAmount, ContactNumber, Description, Status, RiskScore,
        FraudDetectorScore, AiSummary, AiRecommendation, AiReasoning, CitedClause, AiConfidenceScore,
        AssignedUnderwriterId, AssignedUnderwriterName
      ) VALUES (
        @Id, @PolicyNumber, @ClaimantName, @PolicyType, @PolicyCompany, @SumInsured, @PolicyStartDate,
        @IncidentDate, @ClaimAmount, @ReserveAmount, @ContactNumber, @Description, @Status, @RiskScore,
        @FraudDetectorScore, @AiSummary, @AiRecommendation, @AiReasoning, @CitedClause, @AiConfidenceScore,
        @AssignedUnderwriterId, @AssignedUnderwriterName
      )
    `);

  // Insert documents
  if (claim.documents && claim.documents.length > 0) {
    for (const doc of claim.documents) {
      await pool.request()
        .input('Id', sql.VarChar(50), doc.id)
        .input('ClaimId', sql.VarChar(50), claim.id)
        .input('Name', sql.NVarChar(255), doc.name)
        .input('DocumentType', sql.NVarChar(50), doc.type || 'Other')
        .input('S3Bucket', sql.VarChar(100), doc.s3Bucket || 'underwriter-ai')
        .input('S3Key', sql.NVarChar(500), doc.s3Key || '')
        .input('KmsEncrypted', sql.Bit, doc.kmsEncrypted !== false ? 1 : 0)
        .input('ExtractedFieldsJson', sql.NVarChar(sql.MAX), JSON.stringify(doc.extractedFields || {}))
        .query(`
          INSERT INTO dbo.ClaimDocuments (Id, ClaimId, Name, DocumentType, S3Bucket, S3Key, KmsEncrypted, ExtractedFieldsJson)
          VALUES (@Id, @ClaimId, @Name, @DocumentType, @S3Bucket, @S3Key, @KmsEncrypted, @ExtractedFieldsJson)
        `);
    }
  }

  return claim;
}
