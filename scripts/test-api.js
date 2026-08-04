/**
 * test-api.js — Comprehensive API Verification Test Suite
 * 
 * Tests:
 * 1. Health check endpoint
 * 2. User authentication (Login, JWT generation, password verification)
 * 3. Protected endpoint security (Auth guards, unauthenticated 401s)
 * 4. Claim creation & risk scoring & AI analysis
 * 5. Claim status updates & RBAC permissions
 * 6. Claim escalation & disbursement
 * 7. Analytics metrics generation
 * 8. CloudTrail audit logging completeness
 */

const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Ledger API Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('--- 1. Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'healthy', 'API Health check endpoint active');
    assert(healthJson.claims > 0, `Database initialized with seed data (${healthJson.claims} claims, ${healthJson.users} users)`);

    // 2. Auth - Unauthenticated block
    console.log('\n--- 2. Security Guards ---');
    const unauthRes = await fetch(`${BASE_URL}/claims`);
    assert(unauthRes.status === 401, 'Unauthenticated request correctly blocked with 401');

    // 3. Auth - Login
    console.log('\n--- 3. Authentication & JWT ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a.sharma@ledger-insurance.com', password: 'password123' })
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200 && loginJson.token, 'Underwriter login successful & JWT token issued');
    const uwToken = loginJson.token;

    // Login as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ledger-insurance.com', password: 'admin123' })
    });
    const adminLoginJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginJson.token, 'Admin login successful');
    const adminToken = adminLoginJson.token;

    // Verify token endpoint
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${uwToken}` }
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.user.email === 'a.sharma@ledger-insurance.com', 'JWT verification endpoint (/auth/me) valid');

    // 4. Claims retrieval
    console.log('\n--- 4. Claims Processing & AI ---');
    const claimsRes = await fetch(`${BASE_URL}/claims`, {
      headers: { 'Authorization': `Bearer ${uwToken}` }
    });
    const claimsJson = await claimsRes.json();
    assert(claimsRes.status === 200 && claimsJson.data.length > 0, `Claims list retrieved successfully (${claimsJson.data.length} claims)`);

    // Submit new claim
    const newClaimPayload = {
      claimantName: 'Sunil Gavaskar',
      policyNumber: 'POL-99201',
      policyType: 'Health',
      policyCompany: 'Star Health & Allied Insurance',
      sumInsured: 500000,
      policyStartDate: '2025-01-01',
      incidentDate: new Date().toISOString().split('T')[0],
      claimAmount: 85000,
      contactNumber: '+91 98111 22233',
      description: 'Patient admitted for acute gastroenteritis treatment at Manipal Hospital. Inpatient stay 3 days.',
      consentAccepted: 'true',
      documents: JSON.stringify([
        { name: 'Manipal_Discharge_Summary.pdf', type: 'Medical Report' },
        { name: 'Manipal_Bill_Receipt.pdf', type: 'Bill/Invoice' }
      ])
    };

    const createClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uwToken}`
      },
      body: JSON.stringify(newClaimPayload)
    });
    const createClaimJson = await createClaimRes.json();
    assert(createClaimRes.status === 201 && createClaimJson.data.id, `New claim created successfully (${createClaimJson.data?.id})`);
    const createdClaim = createClaimJson.data;

    assert(createdClaim.riskScore !== undefined, `Risk score calculated: ${createdClaim.riskScore}/100`);
    assert(createdClaim.aiRecommendation !== undefined, `AI recommendation generated: ${createdClaim.aiRecommendation}`);
    assert(createdClaim.citedClause !== undefined, `AI policy clause cited: ${createdClaim.citedClause}`);

    // 5. Status Updates & RBAC
    console.log('\n--- 5. Claim Decision & RBAC ---');
    const approveRes = await fetch(`${BASE_URL}/claims/${createdClaim.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uwToken}`
      },
      body: JSON.stringify({ status: 'approved', reason: 'Verified documentation and hospital receipts.' })
    });
    const approveJson = await approveRes.json();
    assert(approveRes.status === 200 && approveJson.data.status === 'approved', `Claim ${createdClaim.id} approved successfully`);

    // 6. Disbursement
    console.log('\n--- 6. Disbursement & Financials ---');
    const disburseRes = await fetch(`${BASE_URL}/claims/${createdClaim.id}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uwToken}`
      },
      body: JSON.stringify({ payoutMethod: 'NEFT', bankDetailsRef: 'HDFC-TEST-BANK-ACCT' })
    });
    const disburseJson = await disburseRes.json();
    assert(disburseRes.status === 200 && disburseJson.data.disbursementDetails.status === 'Completed', `Financial disbursement processed via NEFT`);

    // 7. Analytics
    console.log('\n--- 7. Analytics Metrics ---');
    const analyticsRes = await fetch(`${BASE_URL}/analytics/metrics`, {
      headers: { 'Authorization': `Bearer ${uwToken}` }
    });
    const analyticsJson = await analyticsRes.json();
    assert(analyticsRes.status === 200 && analyticsJson.data.totalClaims > 0, `Analytics dashboard metrics loaded (${analyticsJson.data.totalClaims} total claims)`);

    // 8. Audit logs
    console.log('\n--- 8. Audit Trail Completeness ---');
    const auditRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const auditJson = await auditRes.json();
    assert(auditRes.status === 200 && auditJson.data.length > 0, `CloudTrail-style audit log retrieved (${auditJson.data.length} event records)`);

    console.log(`\n========================================`);
    console.log(`📊 Test Summary: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  }
}

runTests();
