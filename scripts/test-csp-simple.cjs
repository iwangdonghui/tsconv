#!/usr/bin/env node

/**
 * Simple CSP Test Script
 * 
 * This script tests if our CSP middleware is working by importing and testing it directly.
 */

// Test the CSP middleware directly
async function testCSPMiddleware() {
  console.log('🔒 Testing CSP Middleware...\n');
  
  try {
    // Mock request and response objects
    const mockReq = {
      headers: {
        'user-agent': 'test-agent',
        'origin': 'http://localhost:3000'
      },
      method: 'GET'
    };
    
    const mockRes = {
      headers: {},
      setHeader: function(name, value) {
        this.headers[name] = value;
        console.log(`✅ Header set: ${name} = ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      },
      getHeader: function(name) {
        return this.headers[name];
      }
    };
    
    // Import and test the CSP middleware
    const { defaultSecurityHeadersMiddleware } = require('../api/middleware/security-headers');
    
    console.log('📋 Applying security headers middleware...');
    defaultSecurityHeadersMiddleware(mockReq, mockRes);
    
    console.log('\n📊 Applied Headers:');
    Object.entries(mockRes.headers).forEach(([name, value]) => {
      console.log(`  ${name}: ${value}`);
    });
    
    // Check for CSP header
    const cspHeader = mockRes.headers['Content-Security-Policy'];
    if (cspHeader) {
      console.log('\n✅ CSP header found!');
      console.log(`📋 CSP Policy: ${cspHeader}`);
    } else {
      console.log('\n❌ CSP header not found');
    }
    
    // Check for nonce
    const nonceHeader = mockRes.headers['X-CSP-Nonce'];
    if (nonceHeader) {
      console.log(`🔑 CSP Nonce: ${nonceHeader}`);
    } else {
      console.log('⚠️ No CSP nonce found');
    }
    
    console.log('\n🎉 CSP middleware test completed!');
    
  } catch (error) {
    console.error('❌ CSP middleware test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testCSPMiddleware();
}
