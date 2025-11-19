const http = require('http');
const querystring = require('querystring');

// Mock environment variables if not present
process.env.MY_REAL_PHONE_NUMBER = '+15550000000';

// We need to run the next.js server first, or we can just import the handler if we mock req/res
// But importing next.js API routes is tricky without the server context.
// So let's assume the user is running the server or we can start it.
// Actually, for this test, let's just mock the handler invocation directly if possible, 
// but the handler uses `res.status().json()` which is Next.js specific.

// Let's try to start the server in the background and run tests against it.
// OR, simpler: create a mock request/response object and call the handler function directly.
// This avoids starting the full Next.js server.

const handler = require('./pages/api/voice/webhook').default;

// Mock Request and Response
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.body = JSON.stringify(data);
    return this;
  }

  send(data) {
    this.body = data;
    return this;
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }
}

async function runTest(scenario, speechResult) {
  console.log(`\n--- Testing Scenario: ${scenario} ---`);
  const req = {
    method: 'POST',
    body: {
      SpeechResult: speechResult,
      CallSid: 'test_sid',
      From: '+15551112222'
    },
    query: {
      step: 'analyze'
    }
  };
  
  const res = new MockResponse();
  
  try {
    await handler(req, res);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${res.body}`);
    
    if (res.body.includes('Dial') && scenario === 'Urgent') {
      console.log('✅ PASS: Correctly dialed for urgent call');
    } else if (res.body.includes('Hangup') && scenario === 'Spam') {
      console.log('✅ PASS: Correctly hung up for spam');
    } else if (res.body.includes('Record') && scenario === 'Normal') {
      console.log('✅ PASS: Correctly asked to record for normal call');
    } else {
      console.log('⚠️ CHECK: Verify TwiML content manually above');
    }
    
  } catch (e) {
    console.error('Error running test:', e);
  }
}

async function main() {
  // We need to mock OpenAI if we don't want to spend credits or if key is missing
  // But the goal is to verify OpenAI integration.
  // If OPENAI_API_KEY is missing, it will hit the catch block in the handler.
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY is not set. Tests will likely fall back to local logic.");
  }

  await runTest('Urgent', 'This is an emergency, I need to speak to Remy immediately.');
  await runTest('Spam', 'We have been trying to reach you about your car extended warranty.');
  await runTest('Normal', 'Hi Remy, just calling to catch up. Call me back when you can.');
}

main();
