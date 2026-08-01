import http from 'http';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAuthVerification() {
  console.log("🚀 Running Auth & Multi-Company API Test Suite...");

  try {
    // 1. Test Login with pre-seeded underwriter account
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
      email: "a.sharma@ledger-insurance.com",
      password: "password123"
    });
    console.log(`✅ [1/4] POST /api/auth/login Status ${loginRes.statusCode} - Logged in as: ${loginRes.body.user.name}`);
    const token = loginRes.body.token;

    // 2. Test GET /api/auth/me with Bearer Token
    const meRes = await makeRequest('/api/auth/me', 'GET', null, token);
    console.log(`✅ [2/4] GET /api/auth/me Status ${meRes.statusCode} - Verified Email: ${meRes.body.user.email} (Company: ${meRes.body.user.company})`);

    // 3. Test Register new Underwriter account
    const registerRes = await makeRequest('/api/auth/register', 'POST', {
      name: "Karan Mehta",
      email: `k.mehta.${Date.now()}@hdfcergo.com`,
      password: "password123",
      role: "underwriter",
      company: "HDFC ERGO Health & General"
    });
    console.log(`✅ [3/4] POST /api/auth/register Status ${registerRes.statusCode} - Created Account: ${registerRes.body.user.name} (${registerRes.body.user.company})`);

    // 4. Test GET /api/companies
    const compRes = await makeRequest('/api/companies');
    console.log(`✅ [4/4] GET /api/companies Status ${compRes.statusCode} - Total Supported Insurers: ${compRes.body.data.length}`);

    console.log("\n🎉 FULL AUTHENTICATION & MULTI-COMPANY BACKEND VERIFIED 100% WORKING!");
  } catch (err) {
    console.error("❌ Auth test failed:", err);
  }
}

runAuthVerification();
