// Nerion API Load Test
// Run with: k6 run tests/performance/api-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    http_req_failed: ['rate<0.05'],                   // Error rate < 5%
    http_reqs: ['rate>50'],                           // Min 50 req/s
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.cyberrx.com';

// Test scenarios
export default function () {
  // Health check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // Login request
  let loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'test@cyberrx.com',
    password: 'testpass123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  // Get organizations (protected route)
  let orgsRes = http.get(`${BASE_URL}/api/organizations`, {
    headers: { 
      'Authorization': `Bearer ${loginRes.json('token') || ''}`,
    },
  });

  check(orgsRes, {
    'orgs status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  // Simulate user think time
  sleep(1);
}

// Export metrics for DataDog
export function handleSummary(data) {
  return {
    stdout: JSON.stringify(data),
    'performance-results.json': JSON.stringify(data.metrics),
  };
}
