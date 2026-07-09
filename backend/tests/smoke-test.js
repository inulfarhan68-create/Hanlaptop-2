/**
 * Smoke Tests - Quick validation that critical paths work
 *
 * Run: node tests/smoke-test.js
 *
 * Usage:
 *   node tests/smoke-test.js
 *   node tests/smoke-test.js --verbose
 *   node tests/smoke-test.js --skip=e2e   # Skip E2E tests
 *   node tests/smoke-test.js --port=3001  # Custom port
 *   node tests/smoke-test.js --prefix=/_/backend  # API prefix
 */

// Parse command line args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const skipE2E = args.includes('--skip=e2e');

const portArg = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3000';
const prefixArg = args.find(a => a.startsWith('--prefix='))?.split('=')[1] || '/api';
const baseUrlArg = args.find(a => a.startsWith('--base='))?.split('=')[1];

// Determine API URL - use base URL if provided, otherwise construct from parts
const BASE_URL = baseUrlArg || `http://localhost:${portArg}`;
const API_URL = baseUrlArg
  ? `${baseUrlArg}/api`
  : `${BASE_URL}${prefixArg}`;

const results = [];
let passed = 0;
let failed = 0;

function log(message, type = 'info') {
  if (verbose || type === 'error' || type === 'pass' || type === 'fail') {
    const prefix = {
      info: '  ℹ',
      pass: '  ✅',
      fail: '  ❌',
      error: '  ❌',
      warn: '  ⚠️',
    }[type] || '  •';
    console.log(`${prefix} ${message}`);
  }
}

async function fetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SmokeTest/1.0',
        ...options.headers,
      },
    });
    return response;
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function test(name, fn, expectAuthReject = false) {
  process.stdout.write(`\r${name.padEnd(60)}`);
  try {
    const result = await fn();
    // For auth rejection tests: 401/403 = success (correct behavior)
    if (expectAuthReject) {
      if (result.status === 401 || result.status === 403) {
        log(`${name} - PASS (correctly rejected)`, 'pass');
        results.push({ name, status: 'PASS' });
        passed++;
        return true;
      } else {
        log(`${name} - FAIL (expected 401/403, got ${result.status})`, 'fail');
        results.push({ name, status: 'FAIL', error: `expected 401/403, got ${result.status}` });
        failed++;
        return false;
      }
    }
    // For regular tests: status < 400 = success
    if (result === true || (result?.ok && result.status < 400)) {
      log(`${name} - PASS`, 'pass');
      results.push({ name, status: 'PASS' });
      passed++;
      return true;
    } else {
      log(`${name} - FAIL (${result?.status || result?.error})`, 'fail');
      results.push({ name, status: 'FAIL', error: result?.error || result?.status });
      failed++;
      return false;
    }
  } catch (error) {
    log(`${name} - ERROR: ${error.message}`, 'error');
    results.push({ name, status: 'ERROR', error: error.message });
    failed++;
    return false;
  }
}

// Use native fetch
const http = require('http');
const https = require('https');

async function httpGet(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode < 500, status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ ok: res.statusCode < 500, status: res.statusCode, data });
        }
      });
    }).on('error', (err) => {
      resolve({ ok: false, status: 0, error: err.message });
    });
  });
}

async function main() {
  console.log('\n🚀 Starting Smoke Tests\n');
  console.log(`   API: ${API_URL}\n`);

  // Health checks
  console.log('\n📊 Health Checks:');

  await test('GET /api/health - Basic liveness', async () => {
    const res = await httpGet(`${API_URL}/health`);
    return res;
  });

  await test('GET /api/health/ready - Readiness check', async () => {
    const res = await httpGet(`${API_URL}/health/ready`);
    return res;
  });

  await test('GET /api/health/live - Liveness probe', async () => {
    const res = await httpGet(`${API_URL}/health/live`);
    return res;
  });

  // Auth checks - 401/403 means unauthenticated REJECTED (correct behavior)
  console.log('\n🔐 Authentication:');

  await test('GET /api/transactions - Rejects unauthenticated', async () => {
    const res = await httpGet(`${API_URL}/transactions`);
    return res;
  }, true); // expectAuthReject = true

  await test('GET /api/inventory - Rejects unauthenticated', async () => {
    const res = await httpGet(`${API_URL}/inventory`);
    return res;
  }, true);

  await test('GET /api/customers - Rejects unauthenticated', async () => {
    const res = await httpGet(`${API_URL}/customers`);
    return res;
  }, true);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`📈 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    console.log('❌ Failed tests:');
    results.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`   - ${r.name}: ${r.error || r.status}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests passed!\n');
    process.exit(0);
  }
}

main().catch(console.error);
