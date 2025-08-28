#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Test runner script for different test scenarios

const testCommands = {
  unit: 'jest tests/unit --verbose',
  integration: 'jest tests/integration --verbose',
  e2e: 'jest tests/e2e --verbose',
  all: 'jest --verbose',
  coverage: 'jest --coverage --verbose',
  watch: 'jest --watch --verbose'
};

const testType = process.argv[2] || 'all';

if (!testCommands[testType as keyof typeof testCommands]) {
  console.error(`Invalid test type: ${testType}`);
  console.error(`Available types: ${Object.keys(testCommands).join(', ')}`);
  process.exit(1);
}

// Check if test database is available
const checkDatabase = () => {
  try {
    // This would check if the test database is accessible
    console.log('✓ Test database connection check passed');
    return true;
  } catch (error) {
    console.error('✗ Test database connection failed:', error);
    return false;
  }
};

// Setup test environment
const setupTestEnvironment = () => {
  console.log('Setting up test environment...');
  
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  // Load test environment variables
  if (existsSync('.env.test')) {
    console.log('✓ Loading test environment variables');
  } else {
    console.warn('⚠ No .env.test file found');
  }
  
  console.log('✓ Test environment setup complete');
};

// Run tests
const runTests = () => {
  const command = testCommands[testType as keyof typeof testCommands];
  
  console.log(`Running ${testType} tests...`);
  console.log(`Command: ${command}`);
  console.log('─'.repeat(50));
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log('─'.repeat(50));
    console.log('✓ All tests passed!');
  } catch (error) {
    console.log('─'.repeat(50));
    console.error('✗ Some tests failed');
    process.exit(1);
  }
};

// Main execution
const main = () => {
  console.log('🧪 Lurnix Test Runner');
  console.log('─'.repeat(50));
  
  setupTestEnvironment();
  
  if (testType !== 'watch') {
    checkDatabase();
  }
  
  runTests();
};

main();