/**
 * k6 Load Testing Script
 *
 * Run with: k6 run performance/load-test.js
 *
 * Environment variables:
 *   - TEST_TOKEN: Authentication token for API requests
 *   - TEST_POOL_ID: Test pool ID for pool-specific endpoints
 *   - BASE_URL: Base URL of the application (default: http://localhost:3000)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const poolsListDuration = new Trend('pools_list_duration');
const poolDetailsDuration = new Trend('pool_details_duration');
const contributionDuration = new Trend('contribution_duration');
const authenticationDuration = new Trend('authentication_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Warm up to 10 users
    { duration: '2m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
    errors: ['rate<0.05'],            // Less than 5% error rate
    pools_list_duration: ['p(95)<200'],
    pool_details_duration: ['p(95)<100'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test-token';
const TEST_POOL_ID = __ENV.TEST_POOL_ID || 'test-pool-id';

// Common headers
const authHeaders = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json',
};

// Main test function
export default function () {
  group('API Health Check', () => {
    const healthResponse = http.get(`${BASE_URL}/api/auth/check-token`, {
      headers: authHeaders,
    });

    check(healthResponse, {
      'health check status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  group('Pool Operations', () => {
    // Test: Get pools list
    const poolsResponse = http.get(`${BASE_URL}/api/pools`, {
      headers: authHeaders,
    });

    poolsListDuration.add(poolsResponse.timings.duration);

    const poolsSuccess = check(poolsResponse, {
      'pools list status is 200': (r) => r.status === 200,
      'pools list response time < 200ms': (r) => r.timings.duration < 200,
      'pools list returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.pools);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!poolsSuccess);

    sleep(1);

    // Test: Get pool details
    if (TEST_POOL_ID) {
      const poolResponse = http.get(`${BASE_URL}/api/pools/${TEST_POOL_ID}`, {
        headers: authHeaders,
      });

      poolDetailsDuration.add(poolResponse.timings.duration);

      const poolSuccess = check(poolResponse, {
        'pool details status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'pool details response time < 100ms': (r) => r.timings.duration < 100,
      });

      errorRate.add(!poolSuccess && poolResponse.status !== 404);
    }

    sleep(1);
  });

  group('User Operations', () => {
    // Test: Get user profile
    const profileResponse = http.get(`${BASE_URL}/api/users/profile`, {
      headers: authHeaders,
    });

    check(profileResponse, {
      'profile status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'profile response time < 150ms': (r) => r.timings.duration < 150,
    });

    sleep(1);

    // Test: Get notifications
    const notificationsResponse = http.get(`${BASE_URL}/api/notifications`, {
      headers: authHeaders,
    });

    check(notificationsResponse, {
      'notifications status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'notifications response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(1);
  });

  group('Payment Operations', () => {
    // Test: Get payment methods
    const paymentMethodsResponse = http.get(`${BASE_URL}/api/payments/methods`, {
      headers: authHeaders,
    });

    check(paymentMethodsResponse, {
      'payment methods status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'payment methods response time < 150ms': (r) => r.timings.duration < 150,
    });

    sleep(1);

    // Test: Get payment history
    const paymentHistoryResponse = http.get(`${BASE_URL}/api/payments/history`, {
      headers: authHeaders,
    });

    check(paymentHistoryResponse, {
      'payment history status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'payment history response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(1);
  });

  // Random sleep to simulate user think time
  sleep(Math.random() * 3 + 1);
}

// Spike test scenario
export function spikeTest() {
  group('Spike Test', () => {
    const response = http.get(`${BASE_URL}/api/pools`, {
      headers: authHeaders,
    });

    check(response, {
      'spike test status is 200': (r) => r.status === 200,
    });
  });
}

// Stress test configuration
export const stressTestOptions = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

// Soak test configuration
export const soakTestOptions = {
  stages: [
    { duration: '5m', target: 50 },
    { duration: '3h', target: 50 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// Handle test lifecycle
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Pool ID: ${TEST_POOL_ID}`);

  // Verify connectivity
  const checkResponse = http.get(`${BASE_URL}/`);
  if (checkResponse.status !== 200 && checkResponse.status !== 302) {
    throw new Error(`Cannot connect to ${BASE_URL}`);
  }

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
