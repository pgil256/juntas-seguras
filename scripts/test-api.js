/**
 * API Testing Script
 *
 * This script tests the main API endpoints for the Juntas Seguras application.
 * Run with: node scripts/test-api.js
 *
 * Prerequisites:
 * - Dev server running on localhost:3000 or 3001
 * - Demo data seeded (run seed-demo-data.js first)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\nTesting: ${name}`);
    console.log(`  URL: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    console.log(`  Status: ${status}`);
    console.log(`  Response: ${JSON.stringify(data, null, 2).substring(0, 500)}`);

    return { success: response.ok, status, data };
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('API Endpoint Testing');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================');

  const results = [];

  // Test 1: Auth session (should return empty when not logged in)
  results.push(await testEndpoint(
    'Auth Session (unauthenticated)',
    `${BASE_URL}/api/auth/session`
  ));

  // Test 2: Get pools (should require auth)
  results.push(await testEndpoint(
    'Get Pools (unauthenticated)',
    `${BASE_URL}/api/pools`
  ));

  // Test 3: Auth providers
  results.push(await testEndpoint(
    'Auth Providers',
    `${BASE_URL}/api/auth/providers`
  ));

  // Test 4: CSRF token
  results.push(await testEndpoint(
    'CSRF Token',
    `${BASE_URL}/api/auth/csrf`
  ));

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');

  const passed = results.filter(r => r.success || r.status === 401).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);
  console.log('\nNote: 401 responses are expected for unauthenticated requests.');
  console.log('\nTo test authenticated endpoints:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Login with demo@example.com / Demo123!');
  console.log('3. Navigate to /my-pool to see the demo pool');
  console.log('4. Test pool operations from the UI');
}

runTests().catch(console.error);
