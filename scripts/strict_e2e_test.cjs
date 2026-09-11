const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('Starting Strict End-to-End API Audit...');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  await test('GET /api/health', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
    if (res.status !== 200 || res.body.status !== 'ok') throw new Error(`Status ${res.status}`);
  });

  await test('POST /api/auth/switch-role', async () => {
    const res = await request(
      { host: 'localhost', port: 3000, path: '/api/auth/switch-role', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { role: 'HR_DIRECTOR' }
    );
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  await test('GET /api/jobs', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/api/jobs', method: 'GET' });
    if (res.status !== 200 || !Array.isArray(res.body)) throw new Error(`Status ${res.status}`);
  });

  await test('POST /api/candidates/compare', async () => {
    const res = await request(
      { host: 'localhost', port: 3000, path: '/api/candidates/compare', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { candidateIds: ['cand-1', 'cand-2'] }
    );
    if (res.status !== 200 || !res.body.radarData) throw new Error(`Status ${res.status}`);
  });

  await test('POST /api/attendance/check-in-out', async () => {
    const res = await request(
      { host: 'localhost', port: 3000, path: '/api/attendance/check-in-out', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { employeeId: 'emp-1', type: 'CHECK_IN' }
    );
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('POST /api/payroll/generate', async () => {
    const res = await request(
      { host: 'localhost', port: 3000, path: '/api/payroll/generate', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { monthJalali: 8, yearJalali: 1404, force: true }
    );
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  await test('POST /api/automation/run', async () => {
    const res = await request(
      { host: 'localhost', port: 3000, path: '/api/automation/run', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { taskId: 'auto-payroll', confirm: true }
    );
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  console.log(`\nAudit finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
