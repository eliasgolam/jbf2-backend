#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'https://api.myjbfinanz.ch';

console.log('🚀 Starting smoke tests against', API_BASE);
console.log('=' .repeat(50));

// Test 1: GET /api/ping
console.log('\n📡 Testing GET /api/ping...');
try {
  const response = await fetch(`${API_BASE}/api/ping`);
  const body = await response.text();
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  console.log(`   Body: ${body}`);
  
  if (response.ok) {
    console.log('   ✅ GET /api/ping - SUCCESS');
  } else {
    console.log('   ❌ GET /api/ping - FAILED');
  }
} catch (error) {
  console.log(`   ❌ GET /api/ping - ERROR: ${error.message}`);
}

// Test 2: PUT /api/advice/current
console.log('\n📡 Testing PUT /api/advice/current...');
try {
  const response = await fetch(`${API_BASE}/api/advice/current`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  
  if (response.status === 204) {
    console.log('   ✅ PUT /api/advice/current - SUCCESS (204 No Content)');
  } else {
    console.log('   ❌ PUT /api/advice/current - FAILED');
  }
} catch (error) {
  console.log(`   ❌ PUT /api/advice/current - ERROR: ${error.message}`);
}

// Test 3: POST /api/advice/current/summary-pdf
console.log('\n📡 Testing POST /api/advice/current/summary-pdf...');
try {
  const response = await fetch(`${API_BASE}/api/advice/current/summary-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const body = await response.buffer();
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  console.log(`   Content-Type: ${contentType}`);
  console.log(`   Content-Length: ${contentLength}`);
  console.log(`   Body bytes: ${body.length}`);
  
  if (response.ok && contentType === 'application/pdf') {
    console.log('   ✅ POST /api/advice/current/summary-pdf - SUCCESS (PDF generated)');
  } else if (response.status === 503) {
    console.log('   ⚠️  POST /api/advice/current/summary-pdf - PDF DISABLED (503)');
  } else {
    console.log('   ❌ POST /api/advice/current/summary-pdf - FAILED');
  }
} catch (error) {
  console.log(`   ❌ POST /api/advice/current/summary-pdf - ERROR: ${error.message}`);
}

console.log('\n' + '=' .repeat(50));
console.log('🏁 Smoke tests completed');
