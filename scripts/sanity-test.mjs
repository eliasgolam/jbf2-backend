#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'https://api.myjbfinanz.ch';

console.log('🧪 Starting Sanity Tests for Advice API');
console.log('=' .repeat(60));

// Test 1: Health Check
console.log('\n📡 Testing GET /healthz...');
try {
  const response = await fetch(`${API_BASE}/healthz`);
  const body = await response.text();
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  console.log(`   Body: ${body}`);
  
  if (response.ok) {
    console.log('   ✅ GET /healthz - SUCCESS');
  } else {
    console.log('   ❌ GET /healthz - FAILED');
  }
} catch (error) {
  console.log(`   ❌ GET /healthz - ERROR: ${error.message}`);
}

// Test 2: PUT /api/advice/test-123
console.log('\n📡 Testing PUT /api/advice/test-123...');
try {
  const response = await fetch(`${API_BASE}/api/advice/test-123`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ "foo": "bar" })
  });
  
  const body = await response.text();
  console.log(`   Status: ${response.status} ${response.statusText}`);
  console.log(`   Body: ${body}`);
  
  if (response.status >= 200 && response.status < 300) {
    console.log('   ✅ PUT /api/advice/test-123 - SUCCESS');
  } else {
    console.log('   ❌ PUT /api/advice/test-123 - FAILED');
  }
} catch (error) {
  console.log(`   ❌ PUT /api/advice/test-123 - ERROR: ${error.message}`);
}

// Test 3: GET /api/advice/test-123
console.log('\n📡 Testing GET /api/advice/test-123...');
try {
  const response = await fetch(`${API_BASE}/api/advice/test-123`);
  const body = await response.text();
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  console.log(`   Body: ${body}`);
  
  if (response.ok) {
    console.log('   ✅ GET /api/advice/test-123 - SUCCESS');
  } else {
    console.log('   ❌ GET /api/advice/test-123 - FAILED');
  }
} catch (error) {
  console.log(`   ❌ GET /api/advice/test-123 - ERROR: ${error.message}`);
}

// Test 4: POST /api/advice/test-123/summary-pdf
console.log('\n📡 Testing POST /api/advice/test-123/summary-pdf...');
try {
  const response = await fetch(`${API_BASE}/api/advice/test-123/summary-pdf`, {
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
    console.log('   ✅ POST /api/advice/test-123/summary-pdf - SUCCESS (PDF generated)');
  } else if (response.status === 503) {
    console.log('   ⚠️  POST /api/advice/test-123/summary-pdf - PDF DISABLED (503)');
  } else {
    console.log('   ❌ POST /api/advice/test-123/summary-pdf - FAILED');
  }
} catch (error) {
  console.log(`   ❌ POST /api/advice/test-123/summary-pdf - ERROR: ${error.message}`);
}

console.log('\n' + '=' .repeat(60));
console.log('🏁 Sanity tests completed');
